import { useMemo } from 'react';
import { contentData } from '../data/contentData';

const TYPE_ORDER = { CASE: 1, CHECKLIST: 2, INSIGHT: 3, SOLUTION: 4, AX_TREND: 5 };
const MAX_RESULTS = 10;

function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

// 공백 완전 제거 — "기업인터넷전화" ↔ "기업 인터넷 전화" 매칭용
function compact(str) {
  return str.replace(/\s+/g, '');
}

export function useSearch({ query = '' } = {}) {
  const { results, allResults, total } = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return { results: [], allResults: [], total: 0 };

    const tokens = normalize(trimmed).split(' ').filter(Boolean);

    const filtered = contentData.filter((item) => {
      const searchable = [
        item.title,
        item.summary,
        item.recommendReason,
        ...item.products,
        ...item.industries,
        ...item.concerns,
      ].map(normalize);

      return tokens.every((token) =>
        searchable.some(
          (field) =>
            field.includes(token) ||                         // 기본 포함 검색
            compact(field).includes(compact(token))          // 공백 무시 검색
        )
      );
    });

    const total = filtered.length;

    const sorted = [...filtered].sort((a, b) => {
      const rankA = TYPE_ORDER[a.type] ?? 99;
      const rankB = TYPE_ORDER[b.type] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.priority - b.priority;
    });

    return {
      results:    sorted.slice(0, MAX_RESULTS), // 검색 기본: 상위 10개
      allResults: sorted,                        // 전체보기: 제한 없음
      total,
    };
  }, [query]);

  return { results, allResults, total, isEmpty: total === 0 };
}
