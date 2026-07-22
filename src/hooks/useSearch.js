import { useMemo } from 'react';
import { contentData } from '../data/contentData';
import { getExpanded } from '../data/synonyms';

// TYPE_ORDER는 동점일 때만 tie-break로 사용 (relevance score 우선)
const TYPE_ORDER = { CASE: 1, CHECKLIST: 2, INSIGHT: 3, SOLUTION: 4, AX_TREND: 5 };
const MAX_RESULTS = 10;

// 필드별 relevance 가중치
// title → products → summary → recommendReason → industries → concerns 순
const FIELDS = [
  { get: (item) => [item.title],            weight: 10 },
  { get: (item) => item.products,           weight: 6  },
  { get: (item) => [item.summary],          weight: 4  },
  { get: (item) => [item.recommendReason],  weight: 3  },
  { get: (item) => item.industries,         weight: 2  },
  { get: (item) => item.concerns,           weight: 1  },
];

function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

// 공백 완전 제거 — "기업인터넷전화" ↔ "기업 인터넷 전화" 매칭용
function compact(str) {
  return str.replace(/\s+/g, '');
}

function textContains(normalizedText, token) {
  return (
    normalizedText.includes(token) ||
    compact(normalizedText).includes(compact(token))
  );
}

/**
 * 아이템이 모든 토큰을 만족하는지 검사하고, 만족하면 relevance score를 반환합니다.
 * 하나라도 매칭되지 않으면 null 반환 (필터에서 제외).
 *
 * score = 토큰별 (매칭된 필드 가중치 합산)의 총합
 * → 타이틀·제품명에서 매칭될수록, 여러 필드에서 동시에 매칭될수록 높은 점수
 *
 * @returns {number|null}
 */
function getScore(item, tokens) {
  let totalScore = 0;

  for (const token of tokens) {
    const expanded = getExpanded(token); // 동의어 포함 확장 토큰 목록
    let tokenMatched = false;

    for (const { get, weight } of FIELDS) {
      const texts = get(item).map(normalize);
      if (texts.some(text => expanded.some(t => textContains(text, t)))) {
        tokenMatched = true;
        totalScore += weight;
      }
    }

    // 이 토큰이 어느 필드에도 없으면 필터 탈락
    if (!tokenMatched) return null;
  }

  return totalScore;
}

export function useSearch({ query = '' } = {}) {
  const { results, allResults, total } = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return { results: [], allResults: [], total: 0 };

    const tokens = normalize(trimmed).split(' ').filter(Boolean);

    // 1. 필터 + 스코어링 — 단일 패스
    const scored = [];
    for (const item of contentData) {
      const score = getScore(item, tokens);
      if (score !== null) scored.push({ item, score });
    }

    const total = scored.length;

    // 2. 정렬: relevance score DESC → TYPE_ORDER ASC → priority ASC
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const rankA = TYPE_ORDER[a.item.type] ?? 99;
      const rankB = TYPE_ORDER[b.item.type] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.item.priority - b.item.priority;
    });

    const sorted = scored.map(({ item }) => item);

    return {
      results:    sorted.slice(0, MAX_RESULTS),
      allResults: sorted,
      total,
    };
  }, [query]);

  return { results, allResults, total, isEmpty: total === 0 };
}
