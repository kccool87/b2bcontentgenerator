#!/usr/bin/env node
/**
 * lguplusenterprise.com 자동 크롤러 — WordPress REST API 기반
 *
 * - 콘텐츠 타입은 WP 카테고리로 결정 (Gemini 아님)
 * - 기존 항목의 타입도 WP 카테고리 기준으로 일괄 보정
 * - 신규 항목 추가 (Gemini로 추가 메타 생성, 할당량 초과 시 기본값 사용)
 *
 * 실행: GEMINI_API_KEY=<키> node scripts/crawl.js
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── 설정 ────────────────────────────────────────────────────────────────
const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const GEMINI_URL   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const DATA_FILE    = path.resolve(__dirname, '../src/data/contentData.js');
const WP_API       = 'https://lguplusenterprise.com/wp-json/wp/v2';
const GEMINI_DELAY = 5000; // 5초 간격 — 무료 티어 12 RPM 기준
const RETRY_WAIT   = 35000;
const MAX_RETRIES  = 2;

// ── WP 카테고리 ID → 앱 타입 매핑 ─────────────────────────────────────
// (wp-json/wp/v2/categories 에서 확인한 ID)
const CAT_TYPE_MAP = {
  6:    'INSIGHT',    // INSIGHT
  10:   'SOLUTION',   // SOLUTION (부모)
  12:   'SOLUTION',   // 기업 솔루션 (enterprise-solution)
  7:    'SOLUTION',   // 소상공인 솔루션 (customer-solution)
  2391: 'CHECKLIST',  // CHECKLIST
  892:  'CASE',       // CASE STUDY (부모)
  13:   'CASE',       // 기업 고객 사례 (enterprise-story)
  8:    'CASE',       // 소상공인 고객 사례 (customer-story)
  14:   'AX_TREND',   // AX TREND (부모)
  1940: 'AX_TREND',   // TIPS
  15:   'AX_TREND',   // 뉴스레터 (news-letter)
  16:   'AX_TREND',   // 이벤트 (event)
  891:  'AX_TREND',   // 트렌드 (trend)
};

// 복수 카테고리 시 우선 순위 (사용자가 지정한 분류 우선)
const TYPE_PRIORITY = ['CASE', 'CHECKLIST', 'SOLUTION', 'INSIGHT', 'AX_TREND'];

function typeFromCategories(categoryIds) {
  const types = [...new Set(categoryIds.map(id => CAT_TYPE_MAP[id]).filter(Boolean))];
  for (const t of TYPE_PRIORITY) {
    if (types.includes(t)) return t;
  }
  return null; // 분류 불가
}

// URL 정규화 (비교용)
function normalizeUrl(url) {
  try {
    return decodeURIComponent(url).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
  }
}

const KNOWN_PRODUCTS = [
  'AI CCTV', 'AICC', '센트릭스', 'U+웍스', 'U+모바일인터넷', '안심보상인터넷',
  'AI비즈콜', 'U+커넥트', '전국대표번호', 'AlphaKey', '웹팩스', '전용회선', 'IDC',
  'U+슈퍼스쿨', 'U+AI전화', 'U+키오스크', 'U+오더', 'U+포스', 'U+메시지허브',
  'U+초정밀측위', '비즈온', 'U+프리미엄와이파이',
];
const KNOWN_INDUSTRIES = [
  '콜센터', '금융', '중소기업', '제조', '물류', '건설',
  '소상공인', '소매', '무인매장', '프랜차이즈', '병원',
  '학교/교육', '헬스케어/바이오', '운수/버스', '팝업스토어/행사',
  '스마트팜/농업', '공공기관', 'IT/테크', '서비스업', '유통',
  '스타트업', '통신', '영업/B2B',
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#8217;/g, "'").replace(/&#8211;/g, '–')
    .replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '')
    .replace(/\s+/g, ' ').trim();
}

// ── WP REST API ───────────────────────────────────────────────────────
async function fetchAllPosts() {
  console.log('🌐 WordPress REST API로 전체 게시글 수집 중...');
  const fields = '_fields=id,link,title,excerpt,content,categories';
  const firstRes = await fetch(`${WP_API}/posts?per_page=100&page=1&${fields}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!firstRes.ok) throw new Error(`WP API: HTTP ${firstRes.status}`);

  const total      = parseInt(firstRes.headers.get('X-WP-Total')      || '0');
  const totalPages = parseInt(firstRes.headers.get('X-WP-TotalPages') || '1');
  console.log(`   총 게시글: ${total}개, ${totalPages}페이지\n`);

  const posts = await firstRes.json();
  for (let page = 2; page <= totalPages; page++) {
    const res = await fetch(`${WP_API}/posts?per_page=100&page=${page}&${fields}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) { console.warn(`  p${page} 오류 — 건너뜀`); continue; }
    posts.push(...(await res.json()));
    process.stdout.write(`  p${page}: 누적 ${posts.length}개\n`);
  }
  return posts;
}

// ── 기존 데이터 로드 ─────────────────────────────────────────────────
function loadExisting() {
  const src = fs.readFileSync(DATA_FILE, 'utf-8');
  const existingUrls = new Set(
    [...src.matchAll(/url:\s*['"`]([^'"`]+)['"`]/g)]
      .map(m => normalizeUrl(m[1]))
  );
  const ids   = [...src.matchAll(/id:\s*['"`]c(\d+)['"`]/g)].map(m => parseInt(m[1]));
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return { src, existingUrls, maxId };
}

// ── Gemini 분류 (타입 제외 — 제품·업종·요약 등만) ────────────────────
async function enrichWithGemini(title, url, excerpt, contentSnippet, retries = MAX_RETRIES) {
  if (!GEMINI_KEY) return null;

  const prompt = `다음 B2B 엔터프라이즈 콘텐츠를 분석해 JSON 메타데이터를 생성하세요.
(콘텐츠 타입 분류는 하지 않아도 됩니다)

제목: ${title}
URL: ${url}
요약: ${excerpt.slice(0, 300)}
본문: ${contentSnippet.slice(0, 400)}

반드시 아래 JSON만 반환하세요 (코드블록 없이):
{
  "summary": "핵심 내용 요약 2문장 (60자 이내)",
  "recommendReason": "추천 이유 (30자 이내, 고객 관점)",
  "products": ["상품명 배열. 해당 없으면 []"],
  "industries": ["업종 배열. 해당 없으면 []"],
  "concerns": ["고객 고민 키워드. 해당 없으면 []"],
  "stage": "초기관심|검토|제안|내부설득 중 하나",
  "priority": 1~3
}

선택 가능한 상품: ${KNOWN_PRODUCTS.join(', ')}
선택 가능한 업종: ${KNOWN_INDUSTRIES.join(', ')}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents:         [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (res.status === 429) {
      if (retries > 0) {
        console.warn(`  ⏳ 할당량 초과 — ${RETRY_WAIT / 1000}초 대기 (${retries}회 남음)`);
        await delay(RETRY_WAIT);
        return enrichWithGemini(title, url, excerpt, contentSnippet, retries - 1);
      }
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return null;
  }
}

// ── JS 직렬화 ─────────────────────────────────────────────────────────
function toJsEntry(item) {
  const arr = (a) => (a.length === 0 ? '[]' : `[${a.map(s => `'${String(s).replace(/'/g, "\\'")}'`).join(', ')}]`);
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `  {
    id: '${item.id}',
    title: '${esc(item.title)}',
    summary: '${esc(item.summary)}',
    url: '${item.url}',
    type: '${item.type}',
    products: ${arr(item.products)},
    industries: ${arr(item.industries)},
    concerns: ${arr(item.concerns)},
    stage: '${item.stage}',
    priority: ${item.priority},
    recommendReason: '${esc(item.recommendReason)}',
  }`;
}

function saveNewItems(items) {
  const currentSrc  = fs.readFileSync(DATA_FILE, 'utf-8');
  const existingIds = new Set([...currentSrc.matchAll(/id:\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]));
  const toInsert    = items.filter(item => !existingIds.has(item.id));
  if (toInsert.length === 0) return 0;
  const insertStr = toInsert.map(toJsEntry).join(',\n') + ',';
  fs.writeFileSync(DATA_FILE, currentSrc.replace(/^(\];)$/m, `${insertStr}\n$1`), 'utf-8');
  return toInsert.length;
}

// ── 기존 항목 타입 일괄 보정 ─────────────────────────────────────────
function fixExistingTypes(urlTypeMap) {
  let src      = fs.readFileSync(DATA_FILE, 'utf-8');
  let fixed    = 0;
  let notFound = 0;

  // url: '...' 과 그 바로 다음에 오는 type: '...' 를 같이 처리
  src = src.replace(
    /url:\s*'([^']+)',\s*\n(\s*)type:\s*'([^']+)'/g,
    (match, url, indent, currentType) => {
      const key     = normalizeUrl(url);
      const wpType  = urlTypeMap[key];
      if (!wpType) { notFound++; return match; }
      if (wpType === currentType) return match;
      fixed++;
      return `url: '${url}',\n${indent}type: '${wpType}'`;
    }
  );

  fs.writeFileSync(DATA_FILE, src, 'utf-8');
  return { fixed, notFound };
}

// ── 메인 ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 lguplusenterprise.com 크롤링 시작 (WP 카테고리 기반 타입 분류)\n');
  if (!GEMINI_KEY) console.warn('⚠️  GEMINI_API_KEY 없음 — 기본값으로 메타 생성\n');

  // ── 1. WP API로 전체 게시글 + 카테고리 수집 ─────────────────────
  const allPosts = await fetchAllPosts();
  console.log(`🔗 사이트 총 게시글: ${allPosts.length}개\n`);

  // URL → type 맵 구성
  const urlTypeMap = {};
  let unclassified = 0;
  for (const post of allPosts) {
    const key  = normalizeUrl(post.link);
    const type = typeFromCategories(post.categories || []);
    if (type) {
      urlTypeMap[key] = type;
    } else {
      unclassified++;
    }
  }
  console.log(`📂 WP 카테고리 분류: ${Object.keys(urlTypeMap).length}개 매핑, ${unclassified}개 미분류\n`);

  // ── 2. 기존 항목 타입 보정 ──────────────────────────────────────
  console.log('── 기존 항목 타입 보정 ────────────────────────────────────');
  const { fixed, notFound } = fixExistingTypes(urlTypeMap);
  console.log(`   수정: ${fixed}개 | WP 매핑 없음: ${notFound}개\n`);

  // ── 3. 신규 항목 처리 ───────────────────────────────────────────
  const { existingUrls, maxId } = loadExisting();
  const newPosts = allPosts.filter(p => !existingUrls.has(normalizeUrl(p.link)));
  console.log(`✨ 신규 게시글: ${newPosts.length}개\n`);

  if (newPosts.length === 0) {
    const total = [...fs.readFileSync(DATA_FILE,'utf-8').matchAll(/id:\s*['"`]c\d+['"`]/g)].length;
    console.log(`✅ 신규 없음. 총 ${total}개`);
    return;
  }

  console.log('── 신규 항목 메타데이터 생성 ──────────────────────────────');
  const newItems = [];
  let idCounter  = maxId + 1;
  let geminiOk   = 0, geminiFail = 0;

  for (let i = 0; i < newPosts.length; i++) {
    const post    = newPosts[i];
    const wpType  = typeFromCategories(post.categories || []);
    const title   = stripHtml(post.title?.rendered || '');
    const excerpt = stripHtml(post.excerpt?.rendered || '');
    const snippet = stripHtml(post.content?.rendered || '').slice(0, 500);
    const url     = post.link.replace(/\/$/, '') + '/';

    if (!title) { console.log(`[${i+1}/${newPosts.length}] 제목 없음 — 스킵`); continue; }

    process.stdout.write(`[${i+1}/${newPosts.length}] ${title.slice(0, 55)}...\n`);

    // Gemini로 추가 메타 생성 (타입은 WP 카테고리 사용)
    const meta = await enrichWithGemini(title, url, excerpt, snippet);
    if (meta) geminiOk++; else geminiFail++;

    const type = wpType || 'INSIGHT';

    newItems.push({
      id:              `c${String(idCounter).padStart(3, '0')}`,
      title,
      summary:         (meta?.summary || excerpt || title).slice(0, 120),
      url,
      type,
      products:        Array.isArray(meta?.products)   ? meta.products   : [],
      industries:      Array.isArray(meta?.industries) ? meta.industries : [],
      concerns:        Array.isArray(meta?.concerns)   ? meta.concerns   : [],
      stage:           ['초기관심','검토','제안','내부설득'].includes(meta?.stage)
                         ? meta.stage : '검토',
      priority:        [1,2,3].includes(meta?.priority) ? meta.priority : 2,
      recommendReason: (meta?.recommendReason || '관련 업무에 참고가 될 콘텐츠입니다.').slice(0, 80),
    });

    console.log(`  → c${String(idCounter).padStart(3,'0')}: ${type} | ${newItems.at(-1).products.join(', ') || '미분류'}`);
    idCounter++;

    if (newItems.length % 30 === 0) {
      const saved = saveNewItems(newItems);
      console.log(`\n💾 중간 저장 ${saved}개\n`);
    }

    if (GEMINI_KEY) await delay(GEMINI_DELAY);
  }

  // ── 4. 최종 저장 ─────────────────────────────────────────────────
  const saved      = saveNewItems(newItems);
  const finalCount = [...fs.readFileSync(DATA_FILE,'utf-8').matchAll(/id:\s*['"`]c\d+['"`]/g)].length;

  console.log(`\n🎉 완료!`);
  console.log(`   신규 추가: ${saved}개 | Gemini 성공: ${geminiOk} / 실패: ${geminiFail}`);
  console.log(`   총 콘텐츠: ${finalCount}개`);
}

main().catch((e) => {
  console.error('\n❌ 크롤러 오류:', e);
  process.exit(1);
});
