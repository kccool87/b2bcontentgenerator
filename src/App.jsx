import { useState, useEffect, useMemo, useRef } from 'react';
import algoLogo from './assets/algo_logo.png';
import SearchPanel from './components/SearchPanel';
import ResultCards from './components/ResultCards';
import PreviewPanel from './components/PreviewPanel';
import { useSearch } from './hooks/useSearch';
import { useGemini } from './hooks/useGemini';
import { contentData } from './data/contentData';
import './App.css';

// Fisher-Yates 셔플 — 앱 마운트 시 한 번만 실행
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [query, setQuery]     = useState('');
  const [showAll, setShowAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const { results, allResults, total, isEmpty } = useSearch({ query });
  const { message: geminiMessage, isLoading, generate, reset: resetGemini } = useGemini();

  // 탭 클릭 시마다 재셔플
  const shuffledAll = useMemo(() => shuffle(contentData), [shuffleSeed]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabClick() {
    setShuffleSeed((s) => s + 1);
  }

  // generate / reset 최신 참조를 ref에 유지 (useEffect 의존성 문제 방지)
  const generateRef   = useRef(generate);
  const resetRef      = useRef(resetGemini);
  generateRef.current = generate;
  resetRef.current    = resetGemini;

  // 카드 선택이 바뀔 때마다 소개 문구 자동 생성
  useEffect(() => {
    if (selectedIds.size === 0) {
      resetRef.current();
      return;
    }
    const newContents = contentData.filter((item) => selectedIds.has(item.id));
    const prods = [...new Set(newContents.flatMap((c) => c.products))];
    const inds  = [...new Set(newContents.flatMap((c) => c.industries))];
    generateRef.current(newContents, { query, selectedProducts: prods, selectedIndustries: inds });
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색어 입력 시 showAll 연동
  function handleSetQuery(q) {
    setQuery(q);
    setShowAll(!q); // 검색어 있으면 false, 없으면 true(전체보기)
  }

  function handleToggleAll() {
    setShowAll(true);
    // 검색 중에도 query 유지 — 관련 콘텐츠 전체 노출
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleRemove(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const selectedContents = contentData.filter((item) => selectedIds.has(item.id));

  function handleReset() {
    setQuery('');
    setShowAll(true);
    setSelectedIds(new Set());
    resetGemini();
  }

  // 수동으로 "소개 문구 자동 생성" 버튼 클릭 시 재생성
  async function handleGenerateAI() {
    if (selectedContents.length === 0) return;
    const prods = [...new Set(selectedContents.flatMap((c) => c.products))];
    const inds  = [...new Set(selectedContents.flatMap((c) => c.industries))];
    await generate(selectedContents, { query, selectedProducts: prods, selectedIndustries: inds });
  }

  // 표시 결과
  const displayResults = showAll
    ? (query ? allResults : shuffledAll)
    : results;

  const showResultCount = showAll || (query && !isEmpty);

  return (
    <div className="app">
      <div className="app-container">
        <div className="page-title-area">
          <div className="app-title">
            <img src={algoLogo} alt="U+ALGO" className="title-logo" onClick={() => { window.location.href = '/'; }} style={{cursor:'pointer'}} />
            <p className="title-sub">검색 <span style={{color:'#844ff9'}}>알고</span>리즘으로 콘텐츠를 <span style={{color:'#844ff9'}}>알고</span> — 세일즈로 잇다</p>
          </div>
        </div>

        <main className="app-main">
          <section className="left-panel">
            <SearchPanel query={query} setQuery={handleSetQuery} onReset={handleReset} />

            {showResultCount && (
              <p className="result-count">
                <strong>{displayResults.length}개</strong>
                {showAll && !query ? ' 전체 콘텐츠' : ' 검색 결과'}
                {!showAll && total > results.length && (
                  <span className="result-total"> (전체 {total}개 중)</span>
                )}
                {selectedIds.size > 0 && (
                  <span className="select-count"> · {selectedIds.size}개 선택됨</span>
                )}
              </p>
            )}

            <ResultCards
              results={displayResults}
              allResults={showAll ? null : allResults}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              isInitial={false}
              showAll={showAll}
              onToggleAll={handleToggleAll}
              onTabClick={handleTabClick}
              query={query}
            />
          </section>

          <aside className="right-panel">
            <PreviewPanel
              selectedContents={selectedContents}
              geminiMessage={geminiMessage}
              onGenerateAI={handleGenerateAI}
              onRemove={handleRemove}
              onReset={handleReset}
              isLoading={isLoading}
            />
          </aside>
        </main>
      </div>
    </div>
  );
}
