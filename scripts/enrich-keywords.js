/**
 * 빈 products/concerns 항목에 WP 본문 키워드 추출
 * Gemini 없이 패턴 매칭으로 상품명·업종·고민 태그 채움
 */
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = path.resolve(__dirname, '../src/data/contentData.js');
const WP_API     = 'https://lguplusenterprise.com/wp-json/wp/v2';

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── 상품 키워드 패턴 ───────────────────────────────────────────────
const PRODUCT_PATTERNS = [
  { name: 'AICC',            keys: ['aicc', 'ai contact center', 'ai 콜센터', 'ai 컨택센터', 'agentic 콜봇', 'agentic콜봇', 'agentic aicc'] },
  { name: 'AI CCTV',         keys: ['ai cctv', 'ai카메라', 'ai 카메라', '영상분석', '지능형 cctv'] },
  { name: '센트릭스',        keys: ['센트릭스', 'centrex'] },
  { name: 'U+웍스',          keys: ['u+웍스', 'u+ 웍스', 'uworks', '유플러스웍스'] },
  { name: 'U+모바일인터넷',  keys: ['모바일인터넷', 'mobile internet', 'lte 라우터', '5g 라우터', '무선라우터'] },
  { name: '안심보상인터넷',  keys: ['안심보상인터넷', '안심보상'] },
  { name: 'AI비즈콜',        keys: ['ai비즈콜', 'ai 비즈콜', 'aibiz콜'] },
  { name: 'U+커넥트',        keys: ['u+커넥트', 'u+ 커넥트', '차량관제', '차량 관제'] },
  { name: '전국대표번호',    keys: ['전국대표번호', '대표번호'] },
  { name: 'AlphaKey',        keys: ['alphakey', '알파키', 'u+sase', 'sase', 'pqc'] },
  { name: '웹팩스',          keys: ['웹팩스', 'web팩스'] },
  { name: 'U+슈퍼스쿨',     keys: ['슈퍼스쿨', 'superschool', '스쿨'] },
  { name: 'U+키오스크',      keys: ['키오스크', 'kiosk', '무인주문'] },
  { name: 'U+오더',          keys: ['u+오더', '테이블오더', '테이블 오더'] },
  { name: 'U+포스',          keys: ['u+포스', 'u+ 포스', 'pos'] },
  { name: 'U+메시지허브',    keys: ['메시지허브', '문자발송', 'rcs'] },
  { name: '전용회선',        keys: ['전용회선', '전용선'] },
  { name: 'IDC',             keys: ['idc', '데이터센터', 'data center', 'aidc'] },
  { name: 'U+초정밀측위',   keys: ['초정밀측위', '정밀측위', 'rtk'] },
  { name: '비즈온',          keys: ['비즈온', 'bizon'] },
  { name: 'U+AI전화',        keys: ['ai전화', 'ai 전화', '기업ai전화'] },
  { name: 'U+프리미엄와이파이', keys: ['프리미엄 와이파이', '프리미엄와이파이', 'premium wifi'] },
];

// ── 업종 키워드 패턴 ───────────────────────────────────────────────
const INDUSTRY_PATTERNS = [
  { name: '콜센터',          keys: ['콜센터', '컨택센터', 'contact center', '상담센터'] },
  { name: '금융',            keys: ['금융', '은행', '보험', '증권', '핀테크'] },
  { name: '제조',            keys: ['제조', 'manufacturing', '공장', '스마트팩토리'] },
  { name: '물류',            keys: ['물류', '배송', 'logistics', '배달', '운송'] },
  { name: '건설',            keys: ['건설', '시공', '공사', '건축'] },
  { name: '소상공인',        keys: ['소상공인', '자영업', '소매점'] },
  { name: '프랜차이즈',      keys: ['프랜차이즈', '가맹점', '체인'] },
  { name: '병원',            keys: ['병원', '의료', '헬스케어', '의원', '약국'] },
  { name: '학교/교육',       keys: ['학교', '교육', '대학', '학원', '에듀'] },
  { name: '운수/버스',       keys: ['버스', '운수', '택시', '차량', '운행'] },
  { name: '팝업스토어/행사', keys: ['팝업', '행사', '이벤트', '전시'] },
  { name: 'IT/테크',         keys: ['it기업', '테크', '소프트웨어', 'saas', '플랫폼'] },
  { name: '유통',            keys: ['유통', '리테일', 'retail', '마트', '편의점'] },
  { name: '공공기관',        keys: ['공공', '정부', '지자체', '공기업', '지방자치'] },
];

// ── 고민 키워드 패턴 ───────────────────────────────────────────────
const CONCERN_PATTERNS = [
  { name: '보안',            keys: ['보안', 'security', '해킹', '사이버', '랜섬웨어'] },
  { name: '비용절감',        keys: ['비용절감', '절감', '경비절감', '운영비'] },
  { name: '업무효율',        keys: ['업무효율', '효율화', '생산성', '자동화'] },
  { name: 'DX',              keys: ['dx', 'digital transformation', '디지털전환', '디지털화'] },
  { name: 'AI혁신',          keys: ['ai 도입', 'ai 혁신', '인공지능', 'llm', 'generative ai', '생성형 ai'] },
  { name: '고객경험',        keys: ['고객경험', 'cx', '고객만족', '고객서비스'] },
  { name: '원격근무',        keys: ['원격근무', '재택근무', '하이브리드 근무', '재택'] },
  { name: '안전',            keys: ['안전', '사고예방', '안전관리'] },
  { name: '운영효율',        keys: ['운영 효율', '운영효율', '관리 효율'] },
];

function extractKeywords(text) {
  const lower = text.toLowerCase();
  const products   = PRODUCT_PATTERNS.filter(p => p.keys.some(k => lower.includes(k))).map(p => p.name);
  const industries = INDUSTRY_PATTERNS.filter(p => p.keys.some(k => lower.includes(k))).map(p => p.name);
  const concerns   = CONCERN_PATTERNS.filter(p => p.keys.some(k => lower.includes(k))).map(p => p.name);
  return { products: [...new Set(products)], industries: [...new Set(industries)], concerns: [...new Set(concerns)] };
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g,' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#\d+;/g,'').replace(/&[a-z]+;/g,'')
    .replace(/\s+/g,' ').trim();
}
function norm(url) {
  try { return decodeURIComponent(url).replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'').toLowerCase(); }
  catch { return url.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'').toLowerCase(); }
}

// ── WP 전체 게시글 수집 ────────────────────────────────────────────
console.log('📦 WP 게시글 수집 중...');
const allPosts = [];
const fields   = '_fields=id,link,excerpt,content';
const first    = await fetch(`${WP_API}/posts?per_page=100&page=1&${fields}`, { signal: AbortSignal.timeout(30000) });
const pages    = parseInt(first.headers.get('X-WP-TotalPages') || '1');
allPosts.push(...await first.json());
for (let p = 2; p <= pages; p++) {
  const r = await fetch(`${WP_API}/posts?per_page=100&page=${p}&${fields}`, { signal: AbortSignal.timeout(30000) });
  allPosts.push(...await r.json());
  process.stdout.write(`  p${p}: ${allPosts.length}개\n`);
}
console.log(`   완료: ${allPosts.length}개\n`);

// URL → full text 맵
const wpTextMap = {};
for (const post of allPosts) {
  const key = norm(post.link);
  const excerpt = stripHtml(post.excerpt?.rendered || '');
  const body    = stripHtml(post.content?.rendered || '').slice(0, 2000); // 본문 앞 2000자
  wpTextMap[key] = `${excerpt} ${body}`;
}

// ── contentData 처리 ──────────────────────────────────────────────
let src = fs.readFileSync(DATA_FILE, 'utf-8');

// 빈 products 항목 찾기
const emptyItems = [...src.matchAll(
  /id:\s*'(c\d+)'[\s\S]*?url:\s*'([^']+)'[\s\S]*?products:\s*\[\]/g
)].map(m => ({ id: m[1], url: m[2] }));

console.log(`🔍 products가 빈 항목: ${emptyItems.length}개`);

let enriched = 0;
const esc = a => a.map(s => `'${s.replace(/'/g,"\\'")}'`).join(', ');

for (const { id, url } of emptyItems) {
  const key  = norm(url);
  const text = wpTextMap[key];
  if (!text) continue;

  const { products, industries, concerns } = extractKeywords(text);
  if (products.length === 0 && industries.length === 0 && concerns.length === 0) continue;

  // products: [] 교체
  const prodStr   = `[${products.length   ? esc(products)   : ''}]`;
  const indStr    = `[${industries.length  ? esc(industries) : ''}]`;
  const concStr   = `[${concerns.length    ? esc(concerns)   : ''}]`;

  // id 기반으로 해당 항목 블록 찾아 교체
  const itemRegex = new RegExp(
    `(id:\\s*'${id}'[\\s\\S]*?products:\\s*)\\[[^\\]]*\\]([\\s\\S]*?industries:\\s*)\\[[^\\]]*\\]([\\s\\S]*?concerns:\\s*)\\[[^\\]]*\\]`
  );
  const before = src;
  src = src.replace(itemRegex, `$1${prodStr}$2${indStr}$3${concStr}`);
  if (src !== before) {
    enriched++;
    if (enriched <= 5 || products.length > 0) {
      console.log(`  ${id}: products=${products.join(',')||'-'} | industries=${industries.join(',')||'-'}`);
    }
  }
}

fs.writeFileSync(DATA_FILE, src, 'utf-8');
console.log(`\n✅ 완료: ${enriched}개 항목 키워드 추가`);
