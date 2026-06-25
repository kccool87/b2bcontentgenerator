import { useState } from 'react';

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

// 요청된 버튼 순서 (전체보기 제외)
const FILTER_TYPES = ['INSIGHT', 'SOLUTION', 'CHECKLIST', 'CASE', 'AX_TREND'];

const MAX_SUMMARY = 130;

// 문장 경계(마침표·다·요·까 뒤)에서 130자 이내로 압축
function trimSummary(text) {
  if (!text || text.length <= MAX_SUMMARY) return text;
  const chunk = text.slice(0, MAX_SUMMARY);
  // 마침표 계열로 끝나는 마지막 위치
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
  // fallback: 마지막 공백
  const lastSpace = chunk.lastIndexOf(' ');
  return lastSpace > MAX_SUMMARY * 0.6 ? chunk.slice(0, lastSpace) : chunk;
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

export default function ResultCards({ results, allResults, selectedIds, onToggle, isInitial, showAll, onToggleAll, onTabClick }) {
  const [activeType, setActiveType] = useState(null);

  function toggleFilter(type) {
    setActiveType((prev) => (prev === type ? null : type));
    onTabClick?.();
  }

  // 타입별 개수: 검색 시 전체 결과 기준, 전체보기 시 표시 결과 기준
  const countSource = allResults ?? results;
  const counts = {};
  if (countSource) {
    for (const item of countSource) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
  }
  const totalCount = results?.length ?? 0;

  const FilterBar = () => (
    <div className="type-filter-bar">
      {/* 전체보기 버튼 */}
      <button
        className={`type-filter-btn type-filter--all${showAll && !activeType ? ' type-filter-btn--active' : ''}`}
        onClick={() => { onToggleAll(); setActiveType(null); onTabClick?.(); }}
      >
        전체보기 {totalCount > 0 && <span className="filter-btn-count">{totalCount}</span>}
      </button>

      {/* 타입별 버튼 */}
      {FILTER_TYPES.map((type) => {
        const meta     = TYPE_META[type];
        const count    = counts[type] ?? 0;
        const isActive = activeType === type;
        const disabled = count === 0 && !isInitial;
        return (
          <button
            key={type}
            className={`type-filter-btn ${meta.filter}${isActive ? ' type-filter-btn--active' : ''}${disabled ? ' type-filter-btn--empty' : ''}`}
            onClick={() => toggleFilter(type)}
            disabled={disabled}
          >
            {meta.label} {count > 0 && <span className="filter-btn-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );

  // 초기 상태 (검색어 없음 + 전체보기 아님)
  if (isInitial) {
    return (
      <>
        <FilterBar />
        <div className="cards-container">
          <SkeletonGrid />
        </div>
      </>
    );
  }

  // 결과 없음
  if (!results || results.length === 0) {
    return (
      <>
        <FilterBar />
        <div className="cards-container">
          <div className="no-results-msg">
            <p>일치하는 콘텐츠가 없습니다.</p>
            <p className="empty-hint">다른 키워드로 검색해보세요.</p>
          </div>
        </div>
      </>
    );
  }

  // 타입 필터: 검색 시 전체 결과에서 필터, 전체보기 시 표시 결과에서 필터
  const filterSource = activeType && allResults ? allResults : results;
  const filtered = activeType ? filterSource.filter((r) => r.type === activeType) : results;

  return (
    <>
      <FilterBar />
      <div className="cards-container">
        {filtered.length === 0 ? (
          <div className="no-results-msg">
            <p>해당 유형의 콘텐츠가 없습니다.</p>
            <p className="empty-hint">다른 필터를 선택하거나 전체보기를 해보세요.</p>
          </div>
        ) : (
          <div className="cards-grid">
            {filtered.map((item) => {
              const selected = selectedIds.has(item.id);
              const type     = TYPE_META[item.type] ?? { label: item.type, cls: '', filter: '' };
              const stageCls = STAGE_CLASS[item.stage] ?? 'stage--init';

              return (
                <div
                  key={item.id}
                  className={`content-card${selected ? ' content-card--selected' : ''}`}
                  onClick={() => onToggle(item.id)}
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

                  <h3 className="card-title">{item.title}</h3>

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
        )}
      </div>
    </>
  );
}
