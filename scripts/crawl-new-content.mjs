/**
 * 사이트 크롤링 → contentData에 없는 신규 콘텐츠 탐지 + 내용 추출
 * 실행: node scripts/crawl-new-content.mjs
 */
import { contentData } from '../src/data/contentData.js';

const BASE = 'https://lguplusenterprise.com';

const CATEGORIES = [
  { key: 'INSIGHT',   path: '/category/insight/',                          type: 'INSIGHT',   reverseP1: false },
  { key: 'SOLUTION',  path: '/category/solution/enterprise-solution/',     type: 'SOLUTION',  reverseP1: false },
  { key: 'CHECKLIST', path: '/category/checklist/',                        type: 'CHECKLIST', reverseP1: false },
  { key: 'CASE',      path: '/category/case-study/',                       type: 'CASE',      reverseP1: false },
  { key: 'AX_TREND',  path: '/category/ax-trend/',                         type: 'AX_TREND',  reverseP1: true  },
];

// 기존 URL 슬러그 set (디코딩 후 소문자)
function buildExistingSlugSet() {
  const set = new Set();
  for (const item of contentData) {
    try {
      const path = decodeURIComponent(item.url.replace(BASE + '/', '').replace(/\/$/, ''));
      set.add(path.toLowerCase());
      // 마지막 세그먼트만도 추가
      const seg = path.split('/').filter(Boolean).pop();
      if (seg) set.add(seg.toLowerCase());
    } catch {}
  }
  return set;
}

async function fetchHTML(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; crawler)' }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

// 카테고리 페이지에서 article href 목록 추출
function extractArticles(html) {
  const chunks = html.split('<article');
  const articles = [];
  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i].split('</article>')[0];
    // href 추출
    const hrefMatch = block.match(/href="(https:\/\/lguplusenterprise\.com\/[^"]+?)"/);
    // 제목 추출 (h2/h3 안의 텍스트)
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

// 개별 아티클 페이지에서 본문 내용 추출
function extractArticleContent(html) {
  // 제목
  const titleMatch = html.match(/<h1[^>]*class="[^"]*(?:entry-title|post-title)[^"]*"[^>]*>\s*([^<]+)/i)
    || html.match(/<title>\s*([^<|]+)/);
  const title = titleMatch ? titleMatch[1].trim().replace(/ - LG Uplus Enterprise$/i, '') : '';

  // 본문 텍스트 (entry-content 또는 post-content)
  let bodyText = '';
  const contentMatch = html.match(/<div[^>]*class="[^"]*(?:entry-content|post-content)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<section|<aside|<footer)/i);
  if (contentMatch) {
    bodyText = contentMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
  }

  // 발행일
  const dateMatch = html.match(/(?:datetime|published)[="]([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const pubDate = dateMatch ? dateMatch[1] : '';

  return { title, bodyText, pubDate };
}

async function fetchAllSlugsForCategory(cat) {
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
    process.stderr.write(`  [${cat.key}] p${page}: ${articles.length}개\n`);
  }
  return results;
}

async function main() {
  const existingSlugs = buildExistingSlugSet();
  console.error('기존 슬러그 수:', existingSlugs.size);

  const newArticles = [];

  for (const cat of CATEGORIES) {
    console.error(`\n▶ ${cat.key} 크롤링 중...`);
    const articles = await fetchAllSlugsForCategory(cat);

    for (const art of articles) {
      try {
        const decoded = decodeURIComponent(art.url.replace(BASE + '/', '').replace(/\/$/, ''));
        const slug = decoded.toLowerCase();
        const seg = slug.split('/').filter(Boolean).pop() ?? '';

        if (!existingSlugs.has(slug) && !existingSlugs.has(seg)) {
          newArticles.push({ ...art, type: cat.type, slug: seg });
          console.error(`  [신규] ${art.url}`);
        }
      } catch {}
    }
  }

  console.error(`\n\n총 신규 아티클: ${newArticles.length}개`);

  if (newArticles.length === 0) {
    console.log('// 신규 콘텐츠 없음');
    return;
  }

  // 각 신규 아티클 페이지 fetch → 내용 추출
  const maxId = Math.max(...contentData.map(c => parseInt(c.id.replace('c', ''))));
  let nextId = maxId + 1;

  const newEntries = [];
  for (const art of newArticles) {
    console.error(`  fetch: ${art.url}`);
    const html = await fetchHTML(art.url);
    let title = art.title;
    let bodyText = '';
    let pubDate = '';

    if (html) {
      const extracted = extractArticleContent(html);
      if (extracted.title) title = extracted.title;
      bodyText = extracted.bodyText;
      pubDate = extracted.pubDate;
    }

    newEntries.push({
      id: `c${String(nextId).padStart(3, '0')}`,
      type: art.type,
      url: art.url,
      title,
      slug: art.slug,
      pubDate,
      bodyText: bodyText.slice(0, 500),
    });
    nextId++;
  }

  // JSON 출력 (contentData.js에 붙여넣기 위한 참고용)
  console.log(JSON.stringify(newEntries, null, 2));
}

main().catch(e => { console.error(e.stack); process.exit(1); });
