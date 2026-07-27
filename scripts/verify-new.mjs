import { contentData } from '../src/data/contentData.js';
const news = contentData.filter(c => parseInt(c.id.replace('c','')) >= 331);
console.log('총 신규:', news.length, '개\n');
for (const c of news) {
  console.log(`[${c.id}] ${c.type} | stage:${c.stage}`);
  console.log(`  products: ${c.products.join(', ') || '없음'}`);
  console.log(`  industries: ${c.industries.join(', ') || '없음'}`);
  console.log(`  concerns: ${c.concerns.join(', ') || '없음'}`);
  console.log(`  summary: ${c.summary.slice(0, 60)}...`);
}
