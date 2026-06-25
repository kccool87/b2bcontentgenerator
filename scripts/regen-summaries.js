/**
 * WP 본문을 Gemini로 요약해 contentData.js 업데이트
 * - 실행: node scripts/regen-summaries.js
 * - 환경변수: VITE_GEMINI_API_KEY (또는 .env 에서 읽음)
 */
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = path.resolve(__dirname, '../src/data/contentData.js');
const WP_API     = 'https://lguplusenterprise.com/wp-json/wp/v2';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// .env 에서 키 읽기
let API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  try {
    const env = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf-8');
    const m   = env.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (m) API_KEY = m[1].trim();
  } catch {}
}
if (!API_KEY) { console.error('❌ VITE_GEMINI_API_KEY 없음'); process.exit(1); }

const delay = ms => new Promise(r => setTimeout(r, ms));

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&#\d+;/g,'')
    .replace(/&[a-z]+;/g,'').replace(/\s+/g,' ').trim();
}
function norm(url) {
  try { return decodeURIComponent(url).replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'').toLowerCase(); }
  catch { return url.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'').toLowerCase(); }
}

// 이미 좋은 요약인지 판단 (c001-c087 스타일)
function isGoodSummary(s) {
  if (!s) return false;
  const trimmed = s.trim();
  return (
    trimmed.length >= 25 && trimmed.length <= 100 &&
    !trimmed.startsWith('#') && !trimmed.startsWith('"') &&
    !/^[💡🎙📌✔🔍👉📢🎯⚡🌟🗣👥🔐🛡📍👁💻📹😭🤳🖼]/.test(trimmed) &&
    (trimmed.endsWith('입니다.') || trimmed.endsWith('합니다.') ||
     trimmed.endsWith('드립니다.') || trimmed.endsWith('안내합니다.') ||
     trimmed.endsWith('소개합니다.') || trimmed.endsWith('설명합니다.') ||
     trimmed.endsWith('전략입니다.') || trimmed.endsWith('방법입니다.'))
  );
}

async function geminiSummarize(title, bodyText) {
  const body2000 = bodyText.slice(0, 2500);
  const prompt = `다음 LG유플러스 B2B 마케팅 콘텐츠를 읽고, 핵심 내용을 한 문장(40~70자)으로 요약하세요.

규칙:
- 어떤 솔루션·기능이 등장하는지 구체적으로 언급
- 어떤 고객이나 상황에 도움이 되는지 포함
- "입니다" 또는 "합니다" 또는 "소개합니다" 또는 "안내합니다" 로 마무리
- 인사말, 부연설명, 따옴표 없이 요약문 하나만 출력
- 콘텐츠 제목을 그대로 반복하지 말 것

제목: ${title}

본문:
${body2000}`;

  const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 120 },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${res.status}: ${err.error?.message ?? 'unknown'}`);
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

// ── WP 전체 게시글 수집 ────────────────────────────────────────────
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
    title: stripHtml(post.title?.rendered || ''),
    body:  stripHtml(post.content?.rendered || ''),
  };
}

// ── contentData.js 처리 ────────────────────────────────────────────
let src = fs.readFileSync(DATA_FILE, 'utf-8');

// 전체 아이템 파싱
const itemRegex = /id:\s*'(c\d+)'[\s\S]*?title:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?summary:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?url:\s*'([^']+)'/g;
const items = [];
let m;
while ((m = itemRegex.exec(src)) !== null) {
  const [full, id, rawTitle, rawSummary, url] = m;
  const summary = rawSummary.replace(/\\'/g,"'");
  if (!isGoodSummary(summary)) {
    items.push({ id, title: rawTitle.replace(/\\'/g,"'"), summary, rawSummary, url });
  }
}

console.log(`🔍 재생성 대상: ${items.length}개\n`);

let updated = 0;
let failed  = 0;

for (let i = 0; i < items.length; i++) {
  const { id, title, rawSummary, url } = items[i];
  const key  = norm(url);
  const data = wpMap[key];
  if (!data) { console.log(`  SKIP ${id}: WP 없음`); failed++; continue; }

  process.stdout.write(`  [${i+1}/${items.length}] ${id} ...`);
  try {
    const newSummary = await geminiSummarize(data.title || title, data.body);
    if (!newSummary || newSummary.length < 15) { console.log(' 빈 결과 SKIP'); failed++; continue; }

    const escaped = newSummary.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const before  = src;
    src = src.replace(`summary: '${rawSummary}'`, `summary: '${escaped}'`);
    if (src === before) { console.log(' 치환 실패'); failed++; }
    else {
      updated++;
      console.log(` ✅ ${newSummary.slice(0, 55)}`);
      // 10개마다 중간 저장
      if (updated % 10 === 0) fs.writeFileSync(DATA_FILE, src, 'utf-8');
    }
  } catch (e) {
    console.log(` ❌ ${e.message}`);
    failed++;
    if (e.message.startsWith('429')) {
      console.log('  → 쿼터 초과, 60초 대기...');
      await delay(60000);
    }
  }
  // 1초 간격 (Rate limit 방지)
  await delay(1100);
}

fs.writeFileSync(DATA_FILE, src, 'utf-8');
console.log(`\n완료: ${updated}개 업데이트, ${failed}개 실패`);
