/**
 * AX_TREND 최신 등록순 정렬 순서를 사이트에서 직접 추출
 * 실행: node scripts/build-ax-trend-order.mjs > src/data/axTrendOrder.js
 */
import { contentData } from '../src/data/contentData.js';

const BASE = 'https://lguplusenterprise.com';

// contentData에서 AX_TREND 슬러그 → ID 맵 빌드
const axItems = contentData.filter(c => c.type === 'AX_TREND');
const slugToIds = new Map();   // 하나의 슬러그에 복수 ID 가능 (중복 항목 대비)

for (const item of axItems) {
  const slug = item.url
    .replace(BASE + '/', '')
    .replace(/\/$/, '')
    .toLowerCase();
  if (!slugToIds.has(slug)) slugToIds.set(slug, []);
  slugToIds.get(slug).push(item.id);
}

// 사이트 카테고리 페이지에서 게시물 슬러그 추출
async function fetchPageSlugs(pageNum) {
  const url = `${BASE}/category/ax-trend/page/${pageNum}/`;

  let html;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;      // 404 → 마지막 페이지
    html = await res.text();
  } catch {
    return null;
  }

  // <article> 블록 단위로 분리해서 각 블록의 첫 번째 href만 추출
  const chunks = html.split('<article');
  const slugs = [];
  const seen = new Set();

  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i].split('</article>')[0];
    const m = block.match(/href="https:\/\/lguplusenterprise\.com\/([^/"]+)\/"/);
    if (m) {
      const slug = m[1].toLowerCase();
      if (!seen.has(slug)) {
        seen.add(slug);
        slugs.push(slug);
      }
    }
  }
  if (slugs.length === 0) return null;

  // 페이지 1은 CSS flex 레이아웃으로 HTML 순서가 역순 → 뒤집어서 최신순 복원
  if (pageNum === 1) slugs.reverse();

  return slugs;
}

async function main() {
  process.stderr.write('사이트에서 AX_TREND 순서 수집 중...\n');

  const orderedIds = [];
  const matched = new Set();

  for (let page = 1; page <= 25; page++) {
    const slugs = await fetchPageSlugs(page);
    if (!slugs) {
      process.stderr.write(`페이지 ${page}: 종료\n`);
      break;
    }
    process.stderr.write(`페이지 ${page}: ${slugs.length}개 슬러그\n`);

    for (const webSlug of slugs) {
      const ids = slugToIds.get(webSlug);
      if (ids) {
        for (const id of ids) {
          if (!matched.has(id)) {
            orderedIds.push(id);
            matched.add(id);
          }
        }
      } else {
        // 접두어 매칭 (contentData URL이 짧은 경우)
        for (const [slug, ids2] of slugToIds) {
          if (webSlug.startsWith(slug) || slug.startsWith(webSlug)) {
            for (const id of ids2) {
              if (!matched.has(id)) {
                orderedIds.push(id);
                matched.add(id);
              }
            }
          }
        }
      }
    }
  }

  // 미매칭 항목은 ID 순 뒤에 추가
  const unmatched = axItems
    .filter(c => !matched.has(c.id))
    .map(c => c.id)
    .sort();
  if (unmatched.length > 0) {
    process.stderr.write(`미매칭 ${unmatched.length}개: ${unmatched.join(', ')}\n`);
    orderedIds.push(...unmatched);
  }

  process.stderr.write(`총 ${orderedIds.length}개 순서 결정\n`);

  // 출력
  console.log('// AX 트렌드 최신 등록순 (lguplusenterprise.com/category/ax-trend/ 기준)');
  console.log('// build-ax-trend-order.mjs 로 자동 생성');
  console.log(`export const AX_TREND_ORDER = [`);
  for (const id of orderedIds) {
    console.log(`  '${id}',`);
  }
  console.log(`];`);
}

main().catch(e => { process.stderr.write(e.message + '\n'); process.exit(1); });
