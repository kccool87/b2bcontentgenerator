export default function SearchPanel({ query, setQuery }) {
  return (
    <div className="search-panel">
      <p className="search-headline">
        <svg className="search-headline-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="2"/>
          <path d="M13 13L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        키워드 하나로 고객 맞춤 콘텐츠를 찾아보세요.
      </p>

      <div className="search-bar-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="상품명·업종을 입력하세요  예: AI CCTV 병원 / AICC 콜센터"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => setQuery('')}
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        )}
      </div>

      <p className="search-hint">
        상품명, 업종, 또는 조합해서 입력하면 관련 콘텐츠를 바로 추천해드립니다.
      </p>
    </div>
  );
}
