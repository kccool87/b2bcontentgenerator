/**
 * WP 본문에서 규칙 기반으로 요약 추출 (Gemini 없이)
 * 실행: node scripts/regen-no-ai.js
 */
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../src/data/contentData.js');
const WP_API    = 'https://lguplusenterprise.com/wp-json/wp/v2';

// ─── HTML 정제 ────────────────────────────────────────────────────
function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '')
    .replace(/\s+/g, ' ').trim();
}

function norm(url) {
  try { return decodeURIComponent(url).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase(); }
  catch { return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase(); }
}

// ─── 이미 좋은 요약인지 판단 (넓은 기준) ─────────────────────────
function isGoodSummary(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 30 || t.length > 105) return false;

  // 확실히 나쁜 패턴
  const BAD_RE = [
    /^[💡🎙📌✔🔍👉📢🎯⚡🌟✨❄1️⃣2️⃣3️⃣🗣👥🔐🛡📍👁💻📹😭🤳🖼✦]/u,
    /^["'"'「]/u,
    /^안녕하세요/,
    /^요즘/,
    /^지난번/,
    /^지난 번/,
    /^이번 포스팅/,
    /&[a-z]+;|&#\d+;/,
    /https?:/,
    / - LG Uplus Enterprise$/,
    /^본 콘텐츠를/,
    /^본문 보러/,
    /^직접 알고리즘/,
    /^이 두 단계/,
    /^용량 무료/,
    /^앞으로는 AI/,
    /^미국의 물리학자/,  // 교과서 서술
    /^식당에서 서빙로봇/,
    /^과거에는 국가/,
    /^지난 [0-9]/,
    /^[0-9]+일 /,
  ];
  if (BAD_RE.some(r => r.test(t))) return false;

  // 끝맺음 패턴
  const GOOD_ENDS = [
    '입니다.', '합니다.', '드립니다.', '안내합니다.', '소개합니다.',
    '설명합니다.', '전략입니다.', '방법입니다.', '정리했습니다.',
    '분석합니다.', '공유합니다.', '알아봅니다.', '살펴봅니다.',
    '확인합니다.', '안내해드립니다.', '소개해드립니다.', '있습니다.',
    '바랍니다.',
  ];
  return GOOD_ENDS.some(e => t.endsWith(e));
}

// ─── 문장 품질 검사 ──────────────────────────────────────────────
function isCleanSentence(s) {
  if (!s || s.length < 28 || s.length > 100) return false;
  const BAD = [
    /^안녕하세요/, /^요즘/, /^지난/, /^이번/, /^오늘/, /^그동안/,
    /^여러분/, /^혹시/, /^우리 주위/, /^팬데믹/, /^얼마 전/, /^가게를/,
    /^몇 년 전/, /^기술이 나날이/,
    /^["'「]/, /^[💡🎙📌✔🔍👉📢🎯⚡🌟✨❄1️⃣]/u,
    /&[a-z]+;|&#\d+;/, /https?:/, /포스팅에서/, /지난번/,
    /^우리나라/, /^최근 IT/,
    /^최근 많은/,
    /^최근 식당/,
    /^이제는/,
    /^많은 인파/,
    /^처음엔/,
  ];
  if (BAD.some(r => r.test(s))) return false;
  if (!/[가-힣]{8}/.test(s)) return false;
  return true;
}

// ─── WP 본문에서 첫 번째 유효 문장 추출 ────────────────────────────
function extractSentence(rawBody) {
  const body = rawBody.slice(0, 2000);

  // 방법 1: 마침표 단위 분리
  const parts = body.split(/(?<=[다요습니함까]\.)\s+/u);
  for (const raw of parts) {
    const s = raw.replace(/^\s+|\s+$/g, '');
    if (isCleanSentence(s)) {
      // 끝맺음 정규화
      return normEnd(s);
    }
  }

  // 방법 2: 개행 단위 분리 후 첫 긴 문장
  const lines = body.split(/\n+/);
  for (const line of lines) {
    const s = line.trim();
    if (s.length < 28 || s.length > 100) continue;
    if (!isCleanSentence(s)) continue;
    return normEnd(s);
  }

  return null;
}

// 끝맺음 정규화: 했다. → 합니다. / 됐다. → 됩니다. 등
function normEnd(s) {
  // 이미 좋은 끝
  const OK = ['입니다.', '합니다.', '드립니다.', '안내합니다.', '소개합니다.', '설명합니다.', '있습니다.'];
  if (OK.some(e => s.endsWith(e))) return s;

  // 뉴스 문체 → 정중체
  s = s.replace(/했다\.$/, '했습니다.').replace(/됐다\.$/, '됐습니다.')
       .replace(/였다\.$/, '였습니다.').replace(/었다\.$/, '었습니다.')
       .replace(/했다고 밝혔다\.$/, '했다고 밝혔습니다.')
       .replace(/한다\.$/, '합니다.').replace(/된다\.$/, '됩니다.')
       .replace(/이다\.$/, '입니다.');

  return s;
}

// ─── 제목 기반 요약 생성 ────────────────────────────────────────────
function cleanTitle(t) {
  return t
    .replace(/ - LG Uplus Enterprise$/i, '')
    .replace(/\s*-\s*LG Uplus\s*Enterprise\s*$/i, '')
    .replace(/^[\[【\(][^\]】\)]{1,30}[\]】\)]\s*/u, '') // 앞 [태그] 제거
    .replace(/\s*[\|｜]\s*U\+\S+$/u, '')   // ' | U+상품명' 제거
    .replace(/&amp;/g, '&').replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

function generateFromTitle(item) {
  const { title, type, products = [], industries = [], concerns = [] } = item;
  const clean = cleanTitle(title);

  // ── 뉴스클리핑 ────────────────────────────────────────────
  if (title.includes('뉴스클리핑') || /\d+월\s*\d+주차/.test(title)) {
    const m = title.match(/(\d+)월\s*(\d+)주차/);
    if (m) return `${m[1]}월 ${m[2]}주차 IT·AI 산업 주요 뉴스와 최신 동향을 정리한 뉴스 클리핑입니다.`;
    return 'IT·AI 업계의 주요 뉴스와 최신 기술 동향을 정리한 주간 뉴스 클리핑입니다.';
  }

  // ── LG유플러스 PR 제목 ─────────────────────────────────────
  const prMatch = clean.match(/^LG유플러스[,가]?\s+(.{10,60})/);
  if (prMatch && type === 'AX_TREND') {
    const action = prMatch[1].replace(/[,、·…]+$/, '').trim();
    if (action.length > 10 && action.length <= 60) {
      return `LG유플러스가 ${action.charAt(0).toLowerCase() + action.slice(1)}하는 내용을 소개합니다.`;
    }
  }

  // ── 의문문 제목 ───────────────────────────────────────────
  if (/[?？]$/.test(clean)) {
    const topic = clean.replace(/[?？]$/, '').trim();
    const short = topic.length > 50 ? topic.slice(0, 50) : topic;
    return `${short}에 관한 원인과 해결 방법을 소개합니다.`;
  }

  // ── Leadership ────────────────────────────────────────────
  if (/리더십|팀장|팀원을|팀원의|팀원이|임원|피드백|1on1|위임|번아웃/.test(clean)) {
    const short = clean.length > 45 ? clean.slice(0, 45) : clean;
    return `${short}에 관한 리더십 인사이트와 효과적인 실무 방법을 소개합니다.`;
  }

  // ── Tool Guide / AI 툴 ────────────────────────────────────
  if (/AI 툴|GPT|ChatGPT|Copilot|Midjourney|STT|노션|Notion|Canva|Outlook/.test(clean)) {
    const short = clean.length > 45 ? clean.slice(0, 45) : clean;
    return `${short}을 활용해 업무 생산성을 높이는 AI 도구 실무 가이드입니다.`;
  }

  // ── 직장인 꿀팁 / 라이프스타일 ──────────────────────────────
  if (/직장인|자기계발|퇴근|루틴|시간 관리|발표|프레젠테이션|이메일|회의/.test(clean)) {
    const short = clean.length > 45 ? clean.slice(0, 45) : clean;
    return `${short}을 위한 직장인 실무 역량 강화 방법을 안내합니다.`;
  }

  // ── 이벤트 / 행사 후기 ────────────────────────────────────
  if (/포럼|행사|전시|MWC|컨퍼런스|현장|스케치|발대식/.test(clean)) {
    const short = clean.length > 50 ? clean.slice(0, 50) : clean;
    return `${short} 현장의 주요 발표 내용과 핵심 인사이트를 소개합니다.`;
  }

  // ── SOLUTION/INSIGHT – 제품명 있음 ───────────────────────
  if (products.length > 0) {
    const prod = products[0];
    const concern = concerns[0] || '';
    const ind = industries[0] || '';

    if (type === 'CASE') {
      return `${prod}을 도입해 ${concern || '운영 효율'}을 개선한 ${ind || '기업'}의 실제 사례를 소개합니다.`;
    }
    if (type === 'SOLUTION') {
      const benefit = concern ? `${concern} 개선을 위한 ` : '';
      return `${benefit}${prod}의 핵심 기능과 구체적인 도입 효과를 소개합니다.`;
    }
    if (type === 'INSIGHT') {
      return `${prod}이 필요한 상황과 실무 도입 방법, 기대 효과를 안내합니다.`;
    }
  }

  // ── AX_TREND 기술 트렌드 ─────────────────────────────────
  if (type === 'AX_TREND') {
    const short = clean.length > 50 ? clean.slice(0, 50) : clean;
    return `${short}에 관한 최신 기술 트렌드와 업계 인사이트를 소개합니다.`;
  }

  // ── 기타 ─────────────────────────────────────────────────
  const short = clean.length > 48 ? clean.slice(0, 48) : clean;
  return `${short} 관련 핵심 내용과 활용 방법을 안내합니다.`;
}

// ─── 요약 트림 (100자 초과 시 마지막 좋은 위치에서 자름) ────────────
function trimSummary(s) {
  if (s.length <= 100) return s;
  // 90자 전후에서 적절한 끊김 찾기
  const MAX = 95;
  const cut = s.slice(0, MAX);
  const lastDot = cut.lastIndexOf('.');
  if (lastDot > 40) return cut.slice(0, lastDot + 1);
  return cut + '…';
}

// ── WP 전체 게시글 수집 ─────────────────────────────────────────────
console.log('📦 WP 게시글 수집 중...');
const allPosts = [];
const fields   = '_fields=id,link,title,excerpt,content';
const first    = await fetch(`${WP_API}/posts?per_page=100&page=1&${fields}`, { signal: AbortSignal.timeout(30000) });
const pages    = parseInt(first.headers.get('X-WP-TotalPages') || '1');
allPosts.push(...await first.json());
for (let p = 2; p <= pages; p++) {
  const r = await fetch(`${WP_API}/posts?per_page=100&page=${p}&${fields}`, { signal: AbortSignal.timeout(30000) });
  allPosts.push(...await r.json());
  process.stdout.write(`  p${p}: ${allPosts.length}개\n`);
}
console.log(`   완료: ${allPosts.length}개\n`);

const wpMap = {};
for (const post of allPosts) {
  const key = norm(post.link);
  wpMap[key] = {
    title:   stripHtml(post.title?.rendered || ''),
    excerpt: stripHtml(post.excerpt?.rendered || ''),
    body:    stripHtml(post.content?.rendered || ''),
  };
}

// ── contentData.js 처리 ─────────────────────────────────────────────
let src = fs.readFileSync(DATA_FILE, 'utf-8');

const itemRegex = /id:\s*'(c\d+)'[\s\S]*?title:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?summary:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?url:\s*'([^']+)'[\s\S]*?type:\s*'([^']+)'[\s\S]*?products:\s*(\[[^\]]*\])[\s\S]*?industries:\s*(\[[^\]]*\])[\s\S]*?concerns:\s*(\[[^\]]*\])/g;

const items = [];
let m;
while ((m = itemRegex.exec(src)) !== null) {
  const [, id, rawTitle, rawSummary, url, type, rawProds, rawInds, rawCons] = m;
  const summary = rawSummary.replace(/\\'/g, "'");
  if (!isGoodSummary(summary)) {
    const parseArr = (s) => {
      try { return JSON.parse(s.replace(/'/g, '"')); } catch { return []; }
    };
    items.push({
      id,
      title: rawTitle.replace(/\\'/g, "'"),
      summary,
      rawSummary,
      url,
      type,
      products:   parseArr(rawProds),
      industries: parseArr(rawInds),
      concerns:   parseArr(rawCons),
    });
  }
}

console.log(`🔍 재생성 대상: ${items.length}개\n`);

let updated = 0;
let skipped = 0;

for (const item of items) {
  const { id, title, rawSummary, url, type, products, industries, concerns } = item;
  const key  = norm(url);
  const data = wpMap[key];

  let newSummary = null;

  // 1) WP excerpt / body에서 추출 시도
  if (data) {
    newSummary = extractSentence(data.excerpt + ' ' + data.body);
    if (newSummary) newSummary = trimSummary(newSummary);
    if (newSummary && !isGoodSummary(newSummary)) newSummary = null;
  }

  // 2) 제목 기반 생성
  if (!newSummary) {
    newSummary = generateFromTitle({ title, type, products, industries, concerns });
    newSummary = trimSummary(newSummary);
  }

  if (!newSummary || newSummary.length < 25) {
    console.log(`  SKIP ${id}: 생성 실패`);
    skipped++;
    continue;
  }

  const escaped = newSummary.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const before  = src;
  src = src.replace(`summary: '${rawSummary}'`, `summary: '${escaped}'`);
  if (src === before) {
    console.log(`  SKIP ${id}: 치환 실패`);
    skipped++;
  } else {
    updated++;
    const mark = data ? '📄' : '📝';
    console.log(`  ${mark} ${id} → ${newSummary.slice(0, 60)}`);
    if (updated % 20 === 0) fs.writeFileSync(DATA_FILE, src, 'utf-8');
  }
}

fs.writeFileSync(DATA_FILE, src, 'utf-8');
console.log(`\n완료: ${updated}개 업데이트, ${skipped}개 스킵`);
