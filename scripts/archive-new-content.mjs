/**
 * 신규 콘텐츠 아카이빙 스크립트
 * 1) lguplusenterprise.com 크롤 → 신규 아티클 탐지
 * 2) Gemini API로 각 아티클 메타데이터 생성
 * 3) contentData.js 에 엔트리 추가
 * 4) contentOrder.js 에 ID 추가
 *
 * 실행: node scripts/archive-new-content.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { contentData } from '../src/data/contentData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── .env에서 GEMINI_API_KEY 읽기 ─────────────────────────────────────
function readApiKey() {
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    const match = env.match(/VITE_GEMINI_API_KEY=(.+)/);
    return match ? match[1].trim() : null;
  } catch { return null; }
}

const GEMINI_API_KEY = readApiKey();
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ── 크롤 설정 ─────────────────────────────────────────────────────────
const BASE = 'https://lguplusenterprise.com';

const CATEGORIES = [
  { key: 'INSIGHT',   path: '/category/insight/',                      type: 'INSIGHT',   reverseP1: false },
  { key: 'SOLUTION',  path: '/category/solution/enterprise-solution/', type: 'SOLUTION',  reverseP1: false },
  { key: 'CHECKLIST', path: '/category/checklist/',                    type: 'CHECKLIST', reverseP1: false },
  { key: 'CASE',      path: '/category/case-study/',                   type: 'CASE',      reverseP1: false },
  { key: 'AX_TREND',  path: '/category/ax-trend/',                     type: 'AX_TREND',  reverseP1: true  },
];

// ── 기존 슬러그 셋 구축 ───────────────────────────────────────────────
function buildExistingSlugSet() {
  const set = new Set();
  for (const item of contentData) {
    try {
      const decoded = decodeURIComponent(item.url.replace(BASE + '/', '').replace(/\/$/, ''));
      set.add(decoded.toLowerCase());
      const seg = decoded.split('/').filter(Boolean).pop();
      if (seg) set.add(seg.toLowerCase());
    } catch {}
  }
  return set;
}

// ── HTTP 헬퍼 ─────────────────────────────────────────────────────────
async function fetchHTML(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; crawler)' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

// ── 카테고리 페이지에서 아티클 href 목록 추출 ─────────────────────────
function extractArticles(html) {
  const chunks = html.split('<article');
  const articles = [];
  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i].split('</article>')[0];
    const hrefMatch = block.match(/href="(https:\/\/lguplusenterprise\.com\/[^"]+?)"/);
    const titleMatch = block.match(/<h[123][^>]*>\s*(?:<a[^>]*>)?\s*([^<]+)/);
    if (hrefMatch) {
      articles.push({
        url: hrefMatch[1].replace(/\/$/, '') + '/',
        title: titleMatch ? titleMatch[1].trim() : '',
      });
    }
  }
  return articles;
}

// ── 아티클 페이지에서 본문 추출 ──────────────────────────────────────
function extractArticleContent(html) {
  const titleMatch =
    html.match(/<h1[^>]*class="[^"]*(?:entry-title|post-title)[^"]*"[^>]*>\s*([^<]+)/i) ||
    html.match(/<title>\s*([^<|]+)/);
  const title = titleMatch
    ? titleMatch[1].trim().replace(/ - LG Uplus Enterprise$/i, '').trim()
    : '';

  let bodyText = '';
  const contentMatch = html.match(
    /<div[^>]*class="[^"]*(?:entry-content|post-content)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<section|<aside|<footer)/i
  );
  if (contentMatch) {
    bodyText = contentMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2500);
  }

  const dateMatch = html.match(/(?:datetime|published)[="]([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const pubDate = dateMatch ? dateMatch[1] : '';

  return { title, bodyText, pubDate };
}

// ── 카테고리 전체 슬러그 수집 ─────────────────────────────────────────
async function fetchAllArticlesForCategory(cat) {
  const results = [];
  for (let page = 1; page <= 50; page++) {
    const url = page === 1
      ? `${BASE}${cat.path}`
      : `${BASE}${cat.path}page/${page}/`;
    const html = await fetchHTML(url);
    if (!html || !html.includes('<article')) break;
    const articles = extractArticles(html);
    if (articles.length === 0) break;
    if (page === 1 && cat.reverseP1) articles.reverse();
    results.push(...articles);
    console.error(`  [${cat.key}] p${page}: ${articles.length}개`);
  }
  return results;
}

// ── Gemini 분류 ─────────────────────────────────────────────────────
const KNOWN_PRODUCTS = [
  'AI CCTV','AICC','AI비즈콜','AlphaKey','DTG','IDC','IoT',
  'U+AI전화','U+PASS','U+메시지허브','U+모바일인터넷','U+비즈마켓',
  'U+사장님광장','U+슈퍼스쿨','U+스마트안전장구','U+오더','U+오피스넷',
  'U+와이파이','U+웍스','U+초정밀측위','U+커넥트','U+키오스크','U+포스',
  'U+프리미엄와이파이','비즈온','센트릭스','안심보상인터넷','우리매장TV광고',
  '웹팩스','웹하드','유버스','전국대표번호','전용회선',
];
const KNOWN_INDUSTRIES = [
  'IT/테크','건설','공공기관','금융','무인매장','물류','병원','부동산',
  '서비스업','소매','소상공인','스마트팜/농업','스타트업','영업/B2B',
  '운수/버스','유통','제조','중소기업','콜센터','통신','팝업스토어/행사',
  '프랜차이즈','학교/교육','헬스케어/바이오',
];
const STAGES = ['초기관심', '검토', '제안', '내부설득'];

function buildClassifyPrompt(entry) {
  return `당신은 LG유플러스 기업용 B2B 콘텐츠 분류 전문가입니다.
아래 블로그 글의 정보를 바탕으로 영업 담당자가 고객에게 콘텐츠를 추천할 때 필요한 메타데이터를 생성해 주세요.

## 입력 정보
- 콘텐츠 유형: ${entry.type}
- 제목: ${entry.title}
- 본문 발췌: ${entry.bodyText.slice(0, 1200)}

## 출력 규칙
반드시 아래 JSON 형식만 반환하세요. 마크다운, 코드블록, 설명 텍스트 없이 순수 JSON만 출력합니다.

{
  "summary": "2-3문장 요약. 독자(기업 담당자)가 이 글에서 얻을 인사이트를 명확히 서술. 합쇼체 사용.",
  "products": ["제품명1", "제품명2"],
  "industries": ["업종1", "업종2"],
  "stage": "영업 단계",
  "concerns": ["관심사1", "관심사2"],
  "recommendReason": "영업담당자가 이 콘텐츠를 언제, 어떤 상황의 고객에게 활용하면 좋은지 1-2문장으로 설명. 합쇼체."
}

## 필드별 규칙
- summary: 한국어 합쇼체. 2~3문장. 콘텐츠가 다루는 핵심 가치와 업무 적용 맥락 포함.
- products: 아래 목록에서만 선택. 글과 관련없으면 빈 배열 []. 최대 3개.
  가능한 제품명: ${KNOWN_PRODUCTS.join(', ')}
- industries: 아래 목록에서만 선택. 최대 3개.
  가능한 업종: ${KNOWN_INDUSTRIES.join(', ')}
- stage: 반드시 아래 4개 중 하나만.
  - 초기관심: 문제 인식 단계, 트렌드/인사이트 콘텐츠
  - 검토: 솔루션 비교·체크리스트, 자가진단
  - 제안: 구체적 솔루션 제안, 도입 사례
  - 내부설득: ROI·비용절감 사례, 경영진 설득 자료
- concerns: 핵심 페인포인트 키워드. 예: 보안, 비용절감, 운영효율, 고객경험, DX, 인력관리 등. 최대 4개.
- recommendReason: 영업 상황별 활용 팁. "~할 때 활용하세요" 형식.`;
}

function parseGeminiJSON(raw) {
  let s = raw.replace(/\`\`\`(?:json)?\n?/g, '').trim();
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  try { return JSON.parse(s); } catch { return null; }
}

async function classifyWithGemini(entry) {
  if (!GEMINI_API_KEY) {
    console.error('  [경고] GEMINI_API_KEY 없음 — 기본값 사용');
    return null;
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildClassifyPrompt(entry) }] }],
        generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 600 },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message ?? `HTTP ${res.status}`);
    }

    const data = await res.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseGeminiJSON(raw);
  } catch (e) {
    console.error(`  [Gemini 오류] ${e.message}`);
    return null;
  }
}

// ── contentData.js에 엔트리 추가 ─────────────────────────────────────
function formatEntry(entry, geminiMeta, priority = 1) {
  const meta = geminiMeta ?? {
    summary: `${entry.title}에 대한 내용입니다.`,
    products: [],
    industries: [],
    stage: '초기관심',
    concerns: [],
    recommendReason: '관련 고객 미팅 시 참고 자료로 활용하세요.',
  };

  const safeArr = (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.length > 0) : [];

  const stage = STAGES.includes(meta.stage) ? meta.stage : '초기관심';

  return `  {
    id: '${entry.id}',
    title: '${entry.title.replace(/'/g, "\\'")}',
    summary: '${(meta.summary || '').replace(/'/g, "\\'")}',
    url: '${entry.url}',
    type: '${entry.type}',
    products: [${safeArr(meta.products).map((p) => `'${p}'`).join(', ')}],
    industries: [${safeArr(meta.industries).map((i) => `'${i}'`).join(', ')}],
    concerns: [${safeArr(meta.concerns).map((c) => `'${c}'`).join(', ')}],
    stage: '${stage}',
    priority: ${priority},
    recommendReason: '${(meta.recommendReason || '').replace(/'/g, "\\'")}',
  },`;
}

// ── contentData.js 파일에 엔트리 추가 ────────────────────────────────
function appendToContentData(entries) {
  const filePath = path.join(ROOT, 'src', 'data', 'contentData.js');
  let src = fs.readFileSync(filePath, 'utf8');

  // 마지막 ]; 바로 앞에 삽입
  const insertPos = src.lastIndexOf('];');
  if (insertPos === -1) throw new Error('contentData.js 형식 오류: ]; 없음');

  const prefix = src.slice(0, insertPos).trimEnd();
  const suffix = src.slice(insertPos);

  const typeGroups = {};
  for (const e of entries) {
    if (!typeGroups[e.type]) typeGroups[e.type] = [];
    typeGroups[e.type].push(e);
  }

  const sectionLines = [];
  for (const [type, list] of Object.entries(typeGroups)) {
    sectionLines.push(`\n  // ── NEW ${type} (${new Date().toISOString().slice(0, 10)}) ──`);
    for (const e of list) {
      sectionLines.push(e.formatted);
    }
  }

  const newSrc = prefix + '\n' + sectionLines.join('\n') + '\n' + suffix;
  fs.writeFileSync(filePath, newSrc, 'utf8');
  console.error(`  contentData.js 업데이트 완료 (${entries.length}개 추가)`);
}

// ── contentOrder.js 에 새 ID 추가 ────────────────────────────────────
function updateContentOrder(newEntries) {
  const filePath = path.join(ROOT, 'src', 'data', 'contentOrder.js');
  let src = fs.readFileSync(filePath, 'utf8');

  const ORDER_EXPORT_MAP = {
    INSIGHT:   'INSIGHT_ORDER',
    SOLUTION:  'SOLUTION_ORDER',
    CHECKLIST: 'CHECKLIST_ORDER',
    CASE:      'CASE_ORDER',
    AX_TREND:  'AX_TREND_ORDER',
  };

  for (const entry of newEntries) {
    const exportName = ORDER_EXPORT_MAP[entry.type];
    if (!exportName) continue;

    // 배열 선언 찾기: export const INSIGHT_ORDER = [
    const arrayStart = src.indexOf(`export const ${exportName} = [`);
    if (arrayStart === -1) continue;

    // 배열 첫 번째 항목 앞에 삽입 (최신순이므로 배열 맨 앞)
    const openBracket = src.indexOf('[', arrayStart);
    if (openBracket === -1) continue;

    const newId = `  '${entry.id}',\n`;
    src = src.slice(0, openBracket + 1) + '\n' + newId + src.slice(openBracket + 1);

    console.error(`  ${exportName} 맨 앞에 '${entry.id}' 추가`);
  }

  fs.writeFileSync(filePath, src, 'utf8');
  console.error('  contentOrder.js 업데이트 완료');
}

// ── 메인 ─────────────────────────────────────────────────────────────
async function main() {
  if (!GEMINI_API_KEY) {
    console.error('[오류] .env 파일에서 VITE_GEMINI_API_KEY를 읽을 수 없습니다.');
    process.exit(1);
  }
  console.error(`Gemini API 키 확인: ${GEMINI_API_KEY.slice(0, 8)}...`);

  // 1. 기존 슬러그 셋 구축
  const existingSlugs = buildExistingSlugSet();
  console.error(`기존 콘텐츠 수: ${contentData.length}개 (슬러그 ${existingSlugs.size}개)`);

  // 2. 신규 아티클 크롤링
  const newArticles = [];
  for (const cat of CATEGORIES) {
    console.error(`\n▶ ${cat.key} 크롤링 중...`);
    const articles = await fetchAllArticlesForCategory(cat);
    for (const art of articles) {
      try {
        const decoded = decodeURIComponent(art.url.replace(BASE + '/', '').replace(/\/$/, ''));
        const slug = decoded.toLowerCase();
        const seg  = slug.split('/').filter(Boolean).pop() ?? '';
        if (!existingSlugs.has(slug) && !existingSlugs.has(seg)) {
          newArticles.push({ ...art, type: cat.type, slug: seg });
          console.error(`  [신규] ${art.url}`);
        }
      } catch {}
    }
  }

  console.error(`\n신규 아티클 ${newArticles.length}개 발견`);

  if (newArticles.length === 0) {
    console.log('신규 콘텐츠 없음 — 이미 최신 상태입니다.');
    return;
  }

  // 3. 각 아티클 본문 fetch
  const maxId = Math.max(...contentData.map((c) => parseInt(c.id.replace('c', ''), 10)));
  let nextId = maxId + 1;

  const enriched = [];
  for (const art of newArticles) {
    console.error(`  fetch: ${art.url}`);
    const html = await fetchHTML(art.url);
    let title = art.title;
    let bodyText = '';
    let pubDate = '';

    if (html) {
      const ex = extractArticleContent(html);
      if (ex.title) title = ex.title;
      bodyText = ex.bodyText;
      pubDate  = ex.pubDate;
    }

    enriched.push({
      id:       `c${String(nextId).padStart(3, '0')}`,
      type:     art.type,
      url:      art.url,
      title:    title || art.title,
      slug:     art.slug,
      pubDate,
      bodyText,
    });
    nextId++;
  }

  // 4. Gemini로 메타데이터 생성
  console.error('\nGemini 분류 시작...');
  const finalEntries = [];

  for (const entry of enriched) {
    console.error(`  분류 중: [${entry.type}] ${entry.title.slice(0, 50)}`);
    const meta = await classifyWithGemini(entry);
    if (meta) {
      console.error(`    → stage: ${meta.stage}, products: ${meta.products?.join(', ') || '없음'}`);
    } else {
      console.error(`    → Gemini 실패, 기본값 사용`);
    }
    finalEntries.push({ ...entry, formatted: formatEntry(entry, meta) });
    // API 레이트리밋 방지
    await new Promise((r) => setTimeout(r, 800));
  }

  // 5. contentData.js 에 추가
  console.error('\ncontentData.js 업데이트 중...');
  appendToContentData(finalEntries);

  // 6. contentOrder.js 에 새 ID 추가 (각 카테고리 배열 맨 앞)
  console.error('contentOrder.js 업데이트 중...');
  updateContentOrder(finalEntries);

  // 7. 결과 요약
  console.log('\n=== 아카이빙 완료 ===');
  for (const e of finalEntries) {
    console.log(`  [${e.type}] ${e.id}: ${e.title.slice(0, 60)}`);
  }
  console.log(`\n총 ${finalEntries.length}개 콘텐츠 추가됨`);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
