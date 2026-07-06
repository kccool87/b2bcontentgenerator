import { useState, useEffect, useRef } from 'react';
import { INSIGHT_ORDER, SOLUTION_ORDER, CHECKLIST_ORDER, CASE_ORDER, AX_TREND_ORDER } from '../data/contentOrder.js';

const TYPE_META = {
  INSIGHT:   { label: '인사이트',   cls: 'type-badge--insight',   filter: 'type-filter--insight' },
  SOLUTION:  { label: '솔루션',     cls: 'type-badge--solution',  filter: 'type-filter--solution' },
  CHECKLIST: { label: '체크리스트', cls: 'type-badge--checklist', filter: 'type-filter--checklist' },
  CASE:      { label: '고객사례',   cls: 'type-badge--case',      filter: 'type-filter--case' },
  AX_TREND:  { label: 'AX 트렌드', cls: 'type-badge--ax-trend',  filter: 'type-filter--ax-trend' },
};

const STAGE_CLASS = {
  '초기관심': 'stage--init',
  '검토':     'stage--review',
  '제안':     'stage--propose',
  '내부설득': 'stage--pitch',
};

const ORDER_MAP = {
  INSIGHT:   INSIGHT_ORDER,
  SOLUTION:  SOLUTION_ORDER,
  CHECKLIST: CHECKLIST_ORDER,
  CASE:      CASE_ORDER,
  AX_TREND:  AX_TREND_ORDER,
};

const FILTER_TYPES = ['INSIGHT', 'SOLUTION', 'CHECKLIST', 'CASE', 'AX_TREND'];

const MAX_SUMMARY = 130;

const TITLE_SUFFIX = / - LG Uplus Enterprise$/i;

function decodeHtml(s) {
  if (!s) return s;
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanTitle(title) {
  return title ? decodeHtml(title.replace(TITLE_SUFFIX, '')) : title;
}

function trimSummary(text) {
  if (!text || text.length <= MAX_SUMMARY) return text;
  const chunk = text.slice(0, MAX_SUMMARY);
  const sentenceEnd = Math.max(
    chunk.lastIndexOf('다.'),
    chunk.lastIndexOf('요.'),
    chunk.lastIndexOf('까.'),
    chunk.lastIndexOf('니다'),
    chunk.lastIndexOf('습니다'),
    chunk.lastIndexOf('. '),
    chunk.lastIndexOf('! '),
    chunk.lastIndexOf('? '),
  );
  if (sentenceEnd > MAX_SUMMARY * 0.55) {
    const cut = chunk.slice(0, sentenceEnd + 2).trimEnd();
    return cut.endsWith('.') || cut.endsWith('다') ? cut : cut;
  }
  const lastSpace = chunk.lastIndexOf(' ');
  return lastSpace > MAX_SUMMARY * 0.6 ? chunk.slice(0, lastSpace) : chunk;
}

function relevanceScore(item, keywords) {
  const text = [
    item.title, item.summary, item.recommendReason,
    ...item.products, ...item.industries,
  ].join(' ').toLowerCase();
  return keywords.reduce((acc, kw) => {
    const matches = text.match(new RegExp(kw, 'g'));
    return acc + (matches?.length ?? 0);
  }, 0);
}

function SkeletonGrid() {
  return (
    <div className="cards-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card-skeleton" />
      ))}
    </div>
  );
}

const PAGE_INIT = 12;
const PAGE_STEP = 10;

export default function ResultCards({ results, allResults, selectedIds, onToggle, isInitial, showAll, onToggleAll, onTabClick, query }) {
  const [activeType, setActiveType] = useState(null);
  const [sortMode, setSortMode] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_INIT);

  // 모바일 스와이프 vs 탭 구분
  // touchmove는 브라우저가 네이티브 스크롤을 가로채면 취소될 수 있음.
  // touchend는 스크롤 후에도 항상 발사되므로 여기서 최종 delta를 확인한다.
  const touchStartX = useRef(0);
  const blockNextClick = useRef(false);
  const cardActionMap = useRef(new Map());
  const SWIPE_THRESHOLD = 6;
  const CARD_COOLDOWN = 350;

  function onTabTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    blockNextClick.current = false;
  }
  function onTabTouchMove(e) {
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > SWIPE_THRESHOLD) {
      blockNextClick.current = true;
    }
  }
  function onTabTouchEnd(e) {
    if (Math.abs(e.changedTouches[0].clientX - touchStartX.current) > SWIPE_THRESHOLD) {
      blockNextClick.current = true;
    }
  }

  function guardClick(fn) {
    if (blockNextClick.current) { blockNextClick.current = false; return; }
    fn();
  }

  // 동일 카드 연속 탭(더블탭) 방지 — 다른 카드는 즉시 반응
  function guardCardClick(id, fn) {
    const now = Date.now();
    if (now - (cardActionMap.current.get(id) ?? 0) < CARD_COOLDOWN) return;
    cardActionMap.current.set(id, now);
    fn();
  }

  useEffect(() => { setVisibleCount(PAGE_INIT); }, [activeType, sortMode, results, showAll]);

  function toggleFilter(type) {
    setActiveType(type);
    setSortMode(null);
    onTabClick?.();
  }

  const countSource = allResults ?? results;
  const counts = {};
  if (countSource) {
    for (const item of countSource) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
  }
  const totalCount = results?.length ?? 0;

  const hasQuery = Boolean(query?.trim());

  // JSX 변수로 정의 — <FilterBar /> 컴포넌트 대신 {filterBar} 사용.
  // 내부에 컴포넌트로 정의하면 상태 변경마다 새 함수 레퍼런스가 생겨
  // React가 DOM을 언마운트·재마운트 → scrollLeft 초기화됨.
  // JSX 변수는 div/button 타입으로 reconcile되어 DOM을 재생성하지 않음.
  const filterBar = (
    <div className="type-filter-bar">
      <div
        className="type-filter-tabs"
        onTouchStart={onTabTouchStart}
        onTouchMove={onTabTouchMove}
        onTouchEnd={onTabTouchEnd}
      >
        <button
          className={`type-filter-btn type-filter--all${showAll && !activeType ? ' type-filter-btn--active' : ''}`}
          onClick={() => guardClick(() => { onToggleAll(); setActiveType(null); setSortMode(null); onTabClick?.(); })}
        >
          전체 {totalCount > 0 && <span className="filter-btn-count">{totalCount}</span>}
        </button>

        {FILTER_TYPES.map((type) => {
          const meta     = TYPE_META[type];
          const count    = counts[type] ?? 0;
          const isActive = activeType === type;
          const disabled = count === 0 && !isInitial;
          return (
            <button
              key={type}
              className={`type-filter-btn ${meta.filter}${isActive ? ' type-filter-btn--active' : ''}${disabled ? ' type-filter-btn--empty' : ''}`}
              onClick={() => guardClick(() => toggleFilter(type))}
              disabled={disabled}
            >
              {meta.label} {count > 0 && <span className="filter-btn-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const sortBar = (
    <div className="sort-bar">
      <button
        className={`sort-btn${sortMode === 'latest' ? ' sort-btn--active' : ''}`}
        onClick={() => setSortMode(sortMode === 'latest' ? null : 'latest')}
        data-tip="최신 콘텐츠순으로 보기"
      >
        {sortMode === 'latest' && <span className="sort-check">✓</span>}
        최신순
      </button>
      <button
        className={`sort-btn${sortMode === 'relevance' ? ' sort-btn--active' : ''}`}
        onClick={() => hasQuery && setSortMode(sortMode === 'relevance' ? null : 'relevance')}
        disabled={!hasQuery}
        data-tip={hasQuery ? '검색 키워드 관련도순으로 보기' : '검색어를 입력하면 활성화됩니다'}
      >
        {sortMode === 'relevance' && <span className="sort-check">✓</span>}
        관련도순
      </button>
    </div>
  );

  if (isInitial) {
    return (
      <>
        {filterBar}
        {sortBar}
        <div className="cards-container">
          <SkeletonGrid />
        </div>
      </>
    );
  }

  if (!results || results.length === 0) {
    return (
      <>
        {filterBar}
        {sortBar}
        <div className="cards-container">
          <div className="no-results-msg">
            <p>일치하는 콘텐츠가 없습니다.</p>
            <p className="empty-hint">다른 키워드로 검색해보세요.</p>
          </div>
        </div>
      </>
    );
  }

  // 타입 필터
  const filterSource = activeType && allResults ? allResults : results;
  const baseFiltered = activeType ? filterSource.filter((r) => r.type === activeType) : results;

  // 정렬 적용
  let filtered;
  if (sortMode === 'latest') {
    filtered = [...baseFiltered].sort((a, b) => {
      const ia = (ORDER_MAP[a.type] ?? []).indexOf(a.id);
      const ib = (ORDER_MAP[b.type] ?? []).indexOf(b.id);
      return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    });
  } else if (sortMode === 'relevance' && hasQuery) {
    const keywords = query.trim().toLowerCase().split(/\s+/);
    filtered = [...baseFiltered].sort((a, b) => relevanceScore(b, keywords) - relevanceScore(a, keywords));
  } else {
    filtered = baseFiltered;
  }

  return (
    <>
      {filterBar}
      {sortBar}

      <div className="cards-container">
        {filtered.length === 0 ? (
          <div className="no-results-msg">
            <p>해당 유형의 콘텐츠가 없습니다.</p>
            <p className="empty-hint">다른 필터를 선택하거나 전체보기를 해보세요.</p>
          </div>
        ) : (
          <>
            <div className="cards-grid">
              {filtered.slice(0, visibleCount).map((item) => {
                const selected = selectedIds.has(item.id);
                const type     = TYPE_META[item.type] ?? { label: item.type, cls: '', filter: '' };
                const stageCls = STAGE_CLASS[item.stage] ?? 'stage--init';

                return (
                  <div
                    key={item.id}
                    className={`content-card content-card--type-${item.type.toLowerCase().replace('_', '-')}${selected ? ' content-card--selected' : ''}`}
                    onClick={() => guardCardClick(item.id, () => onToggle(item.id))}
                    role="button"
                    aria-pressed={selected}
                  >
                    <div className="card-header">
                      <span className={`type-badge ${type.cls}`}>{type.label}</span>
                      <span className={`stage-badge ${stageCls}`}>{item.stage}</span>
                      <div className={`card-check${selected ? ' card-check--on' : ''}`}>
                        {selected ? '✓' : '+'}
                      </div>
                    </div>

                    <h3 className="card-title">{cleanTitle(item.title)}</h3>

                    <div className="recommend-box">
                      <span className="recommend-icon">💡</span>
                      <div className="recommend-body">
                        <span className="recommend-label">활용 TIP</span>
                        <span className="recommend-text">{item.recommendReason}</span>
                      </div>
                    </div>

                    <p className="card-summary">
                      <span className="summary-label">요약</span>
                      {trimSummary(item.summary)}
                    </p>

                    <div className="card-footer">
                      <div className="card-tags">
                        {item.products.map((p) => (
                          <span key={p} className="tag tag--product">{p}</span>
                        ))}
                        {item.industries.map((ind) => (
                          <span key={ind} className="tag tag--industry">{ind}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {visibleCount < filtered.length && (
              <div className="load-more-wrap">
                <button
                  className="load-more-btn"
                  onClick={() => setVisibleCount((v) => v + PAGE_STEP)}
                >
                  더보기 <span className="load-more-remain">({filtered.length - visibleCount}개 남음)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
