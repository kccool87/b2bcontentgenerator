/**
 * 5개 카테고리의 최신 등록순을 사이트에서 추출 → src/data/contentOrder.js 생성
 * 실행: node scripts/build-content-order.mjs > src/data/contentOrder.js
 */
import { contentData } from '../src/data/contentData.js';

const BASE = 'https://lguplusenterprise.com';

const CATEGORIES = [
  { key: 'INSIGHT',   path: '/category/insight/',                           type: 'INSIGHT'   },
  { key: 'SOLUTION',  path: '/category/solution/enterprise-solution/',      type: 'SOLUTION'  },
  { key: 'CHECKLIST', path: '/category/checklist/',                         type: 'CHECKLIST' },
  { key: 'CASE',      path: '/category/case-study/',                        type: 'CASE'      },
  { key: 'AX_TREND',  path: '/category/ax-trend/',                          type: 'AX_TREND'  },
];

// 타입별 슬러그 → ID 맵
function buildSlugMap(type) {
  const map = new Map();
  for (const item of contentData.filter(c => c.type === type)) {
    const slug = item.url.replace(BASE + '/', '').replace(/\/$/, '').toLowerCase();
    if (!map.has(slug)) map.set(slug, []);
    map.get(slug).push(item.id);
  }
  return map;
}

async function fetchPageSlugs(catPath, pageNum) {
  const url = `${BASE}${catPath}page/${pageNum}/`;
  let html;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // <article> 블록별로 첫 번째 href 추출
  const chunks = html.split('<article');
  const slugs = [];
  const seen = new Set();
  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i].split('</article>')[0];
    const m = block.match(/href="https:\/\/lguplusenterprise\.com\/([^"]+?)\/"/);
    if (m) {
      // 마지막 경로 세그먼트(슬러그)만 추출
      const parts = m[1].split('/').filter(Boolean);
      const slug = parts[parts.length - 1].toLowerCase();
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        slugs.push(slug);
      }
    }
  }
  if (slugs.length === 0) return null;
  // 페이지 1은 HTML 순서가 최신→오래된 역순으로 렌더링됨
  if (pageNum === 1) slugs.reverse();
  return slugs;
}

async function buildOrder(cat) {
  const slugToIds = buildSlugMap(cat.type);
  const axItems = contentData.filter(c => c.type === cat.type);
  const orderedIds = [];
  const matched = new Set();

  process.stderr.write(`\n[${cat.key}] 수집 중...\n`);
  for (let page = 1; page <= 30; page++) {
    const slugs = await fetchPageSlugs(cat.path, page);
    if (!slugs) { process.stderr.write(`  페이지 ${page}: 종료\n`); break; }
    process.stderr.write(`  페이지 ${page}: ${slugs.length}개\n`);

    for (const webSlug of slugs) {
      // 정확 매칭
      let ids = slugToIds.get(webSlug);
      if (!ids) {
        // 접두어 매칭 (contentData URL이 짧은 경우)
        for (const [slug, idList] of slugToIds) {
          if (webSlug.startsWith(slug) || slug.startsWith(webSlug)) {
            ids = idList; break;
          }
        }
      }
      if (ids) {
        for (const id of ids) {
          if (!matched.has(id)) { orderedIds.push(id); matched.add(id); }
        }
      }
    }
  }

  const unmatched = axItems.filter(c => !matched.has(c.id)).map(c => c.id).sort();
  if (unmatched.length) {
    process.stderr.write(`  미매칭 ${unmatched.length}개: ${unmatched.join(', ')}\n`);
    orderedIds.push(...unmatched);
  }
  process.stderr.write(`  총 ${orderedIds.length}개\n`);
  return orderedIds;
}

async function main() {
  const results = {};
  for (const cat of CATEGORIES) {
    results[cat.key] = await buildOrder(cat);
  }

  console.log('// 각 카테고리 최신 등록순 — build-content-order.mjs 로 자동 생성');
  for (const cat of CATEGORIES) {
    console.log(`\nexport const ${cat.key}_ORDER = [`);
    for (const id of results[cat.key]) console.log(`  '${id}',`);
    console.log(`];`);
  }
}

main().catch(e => { process.stderr.write(e.stack + '\n'); process.exit(1); });
