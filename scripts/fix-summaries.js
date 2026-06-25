/**
 * 비정상 요약(해시태그·이모지·짧은 요약) 항목의 WP 본문에서 요약 재추출
 */
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = path.resolve(__dirname, '../src/data/contentData.js');
const WP_API     = 'https://lguplusenterprise.com/wp-json/wp/v2';
const MAX_LEN    = 200;

function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/g, '').replace(/\s+/g, ' ').trim();
}

function norm(url) {
  try { return decodeURIComponent(url).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase(); }
  catch { return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase(); }
}

// 요약 추출 우선순위
function extractSummary(body) {
  // 1. 뉴스클리핑 형식: "📌 기사 간단 요약" 이후 텍스트 추출
  const newsIdx = body.indexOf('📌');
  if (newsIdx !== -1) {
    const after = body.slice(newsIdx).replace(/📌\s*기사\s*간단\s*요약\s*/, '').replace(/✔\s*/g, '').trim();
    const lines = after.split(/[\n.]/);
    const bullets = lines.filter(l => l.trim().length > 10).slice(0, 3).map(l => l.trim()).join(' / ');
    if (bullets.length > 20) return bullets.slice(0, MAX_LEN);
  }

  // 2. 첫 번째 의미 있는 문단 찾기 (이모지·해시태그·짧은 줄 제외)
  const SKIP = /^[#🎙💡💬🗣👉🔍📌✔😭🤳🖼💻📹🗣️👥🗣🔐🛡️📍👁]|^["'「]|^\s*$/;
  const paras = body.split(/\n+/);
  for (const para of paras) {
    const p = para.trim();
    if (p.length >= 40 && !SKIP.test(p) && !p.startsWith('#')) {
      return p.slice(0, MAX_LEN);
    }
  }

  // 3. 이모지 헤더 이후 첫 문장
  const emojiLine = body.match(/[🎙💡💬🗣👉🔍📌😭🤳][^\n]{5,}\n+([\s\S]{40,})/);
  if (emojiLine) {
    const content = emojiLine[1].replace(/[#\n]+/g, ' ').trim();
    if (content.length > 40) return content.slice(0, MAX_LEN);
  }

  // 4. 해시태그 이후 첫 문단
  const afterHash = body.replace(/^(#\S+\s*)+/, '').trim();
  if (afterHash.length > 40) return afterHash.slice(0, MAX_LEN);

  return null;
}

function isBad(summary) {
  if (!summary) return true;
  const s = summary.trim();
  return (
    s.length < 25 ||
    s.startsWith('#') ||
    s.startsWith('"') ||
    /^[💡🎙📌✔🔍👉📢🎯⚡🌟🗣👥🔐🛡📍👁💻📹😭🤳🖼]/.test(s)
  );
}

// ── WP 전체 게시글 수집 ────────────────────────────────────────────
console.log('📦 WP 게시글 수집 중...');
const allPosts = [];
const fields = '_fields=id,link,excerpt,content';
const first = await fetch(`${WP_API}/posts?per_page=100&page=1&${fields}`, { signal: AbortSignal.timeout(30000) });
const pages = parseInt(first.headers.get('X-WP-TotalPages') || '1');
allPosts.push(...await first.json());
for (let p = 2; p <= pages; p++) {
  const r = await fetch(`${WP_API}/posts?per_page=100&page=${p}&${fields}`, { signal: AbortSignal.timeout(30000) });
  allPosts.push(...await r.json());
  process.stdout.write(`  p${p}: ${allPosts.length}개\n`);
}
console.log(`   완료: ${allPosts.length}개\n`);

// URL → {excerpt, body} 맵
const wpMap = {};
for (const post of allPosts) {
  const key = norm(post.link);
  wpMap[key] = {
    excerpt: stripHtml(post.excerpt?.rendered || ''),
    body:    stripHtml(post.content?.rendered || '').slice(0, 3000),
  };
}

// ── contentData.js 수정 ───────────────────────────────────────────
let src = fs.readFileSync(DATA_FILE, 'utf-8');

// 전체 항목 파싱: id + url + summary
const itemRegex = /id:\s*'(c\d+)'[\s\S]*?summary:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?url:\s*'([^']+)'/g;
let match;
let fixed = 0;
let skipped = 0;

while ((match = itemRegex.exec(src)) !== null) {
  const [, id, rawSummary, url] = match;
  const summary = rawSummary.replace(/\\'/g, "'");

  if (!isBad(summary)) continue;

  const key  = norm(url);
  const data = wpMap[key];
  if (!data) { skipped++; continue; }

  const newSummary = extractSummary(data.body) || extractSummary(data.excerpt);
  if (!newSummary || newSummary.length < 20) { skipped++; continue; }
  if (!isBad(newSummary) && newSummary !== summary) {
    const escaped = newSummary.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    src = src.replace(
      `summary: '${rawSummary}'`,
      `summary: '${escaped}'`
    );
    fixed++;
    console.log(`  ✅ ${id}: ${newSummary.slice(0, 60)}…`);
  } else {
    skipped++;
  }
}

fs.writeFileSync(DATA_FILE, src, 'utf-8');
console.log(`\n완료: ${fixed}개 수정, ${skipped}개 스킵`);
