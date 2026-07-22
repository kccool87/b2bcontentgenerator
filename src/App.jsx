import { useState, useEffect, useMemo, useRef } from 'react';

function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.innerWidth <= bp);
  useEffect(() => {
    const h = () => setV(window.innerWidth <= bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return v;
}
import algoLogo from './assets/algo_logo.png';
import SearchPanel from './components/SearchPanel';
import ResultCards from './components/ResultCards';
import PreviewPanel from './components/PreviewPanel';
import { useSearch } from './hooks/useSearch';
import { useGemini } from './hooks/useGemini';
import { contentData } from './data/contentData';
import './App.css';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [query, setQuery]       = useState('');
  const [showAll, setShowAll]   = useState(true);
  const [selectedIds, setSelectedIds]           = useState(new Set());
  const [shuffleSeed, setShuffleSeed]           = useState(0);
  const [relationshipStage, setRelationshipStage] = useState('초기 관계');

  const isMobile          = useIsMobile();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const sheetRef          = useRef(null);
  const sheetDragStartY   = useRef(null);

  function onSheetHandleTouchStart(e) {
    sheetDragStartY.current = e.touches[0].clientY;
  }
  function onSheetHandleTouchMove(e) {
    if (sheetDragStartY.current === null) return;
    const delta = e.touches[0].clientY - sheetDragStartY.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }
  function onSheetHandleTouchEnd(e) {
    const delta = e.changedTouches[0].clientY - (sheetDragStartY.current ?? 0);
    if (sheetRef.current) sheetRef.current.style.transform = '';
    sheetDragStartY.current = null;
    if (delta > 80) setMobileSheetOpen(false);
  }

  const { results, allResults, total, isEmpty } = useSearch({ query });
  const { message: geminiMessage, isLoading, streamingText, generate, reset: resetGemini } = useGemini();

  const shuffledAll = useMemo(() => shuffle(contentData), [shuffleSeed]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabClick() {
    setShuffleSeed((s) => s + 1);
  }

  // generate / reset 최신 참조를 ref에 유지
  const generateRef   = useRef(generate);
  const resetRef      = useRef(resetGemini);
  generateRef.current = generate;
  resetRef.current    = resetGemini;

  // 관계 단계는 auto-trigger 대상이 아니므로 ref로만 읽음
  const relationshipStageRef    = useRef(relationshipStage);
  relationshipStageRef.current  = relationshipStage;

  // 카드 선택이 바뀔 때만 자동 생성 (관계 단계 변경 시는 미트리거)
  useEffect(() => {
    if (selectedIds.size === 0) {
      resetRef.current();
      return;
    }
    const newContents = contentData.filter((item) => selectedIds.has(item.id));
    const prods = [...new Set(newContents.flatMap((c) => c.products))];
    const inds  = [...new Set(newContents.flatMap((c) => c.industries))];
    generateRef.current(newContents, {
      query,
      selectedProducts:  prods,
      selectedIndustries: inds,
      relationshipStage: relationshipStageRef.current,
    });
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedIds.size === 0) setMobileSheetOpen(false);
  }, [selectedIds]);

  // 시트 열릴 때 배경 스크롤 차단
  useEffect(() => {
    document.body.style.overflow = mobileSheetOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileSheetOpen]);

  function handleSetQuery(q) {
    setQuery(q);
    setShowAll(!q);
  }

  function handleToggleAll() {
    setShowAll(true);
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

  function handleDeselect() {
    setSelectedIds(new Set());
    resetGemini();
  }

  // "다시 생성" 버튼 클릭 — 관계 단계 포함
  async function handleGenerateAI() {
    if (selectedContents.length === 0) return;
    const prods = [...new Set(selectedContents.flatMap((c) => c.products))];
    const inds  = [...new Set(selectedContents.flatMap((c) => c.industries))];
    await generate(selectedContents, {
      query,
      selectedProducts:  prods,
      selectedIndustries: inds,
      relationshipStage,
    });
  }

  // 관계 단계 변경 — 콘텐츠 선택 중이면 즉시 재생성
  function handleRelationshipStageChange(stage) {
    setRelationshipStage(stage);
    if (selectedContents.length > 0) {
      const prods = [...new Set(selectedContents.flatMap((c) => c.products))];
      const inds  = [...new Set(selectedContents.flatMap((c) => c.industries))];
      generate(selectedContents, {
        query,
        selectedProducts:  prods,
        selectedIndustries: inds,
        relationshipStage: stage,
      });
    }
  }

  const displayResults   = showAll ? (query ? allResults : shuffledAll) : results;
  const showResultCount  = showAll || (query && !isEmpty);

  return (
    <div className="app">
      <div className="app-container">
        <div className="page-title-area">
          <div className="app-title">
            <div className="logo-container" onClick={() => { window.location.href = '/'; }}>
              <div className="logo-wrap">
                <img src={algoLogo} alt="U+ALGO" className="title-logo" />
              </div>
            </div>
            <p className="title-sub">검색 <span className="title-algo title-algo--1">알고</span>리즘으로 콘텐츠를 <span className="title-algo title-algo--2">알고</span><span className="title-sales"><span className="ts1"> —</span><span className="ts2"> 세일즈로</span><span className="ts3"> 잇다</span></span></p>
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

          {!isMobile && (
            <aside className="right-panel">
              <PreviewPanel
                selectedContents={selectedContents}
                geminiMessage={geminiMessage}
                onGenerateAI={handleGenerateAI}
                onRemove={handleRemove}
                onReset={handleReset}
                onDeselect={handleDeselect}
                isLoading={isLoading}
                streamingText={streamingText}
                relationshipStage={relationshipStage}
                onRelationshipStageChange={handleRelationshipStageChange}
              />
            </aside>
          )}
        </main>

        {isMobile && selectedIds.size > 0 && !mobileSheetOpen && (
          <div className="mobile-sticky-bar">
            <span className="mobile-sticky-count">{selectedIds.size}개 선택됨</span>
            <button className="mobile-sticky-btn" onClick={() => setMobileSheetOpen(true)}>
              문구 확인하기 ▲
            </button>
          </div>
        )}
      </div>

      {isMobile && (
        <>
          {mobileSheetOpen && (
            <div className="mobile-sheet-backdrop" onClick={() => setMobileSheetOpen(false)} />
          )}
          <div
            className={`mobile-sheet${mobileSheetOpen ? ' mobile-sheet--open' : ''}`}
            ref={sheetRef}
          >
            <div
              className="mobile-sheet-header"
              onTouchStart={onSheetHandleTouchStart}
              onTouchMove={onSheetHandleTouchMove}
              onTouchEnd={onSheetHandleTouchEnd}
            >
              <div className="mobile-sheet-pill" />
              <div className="mobile-sheet-title-row">
                <span className="mobile-sheet-title">문구 미리보기</span>
                <button
                  className="mobile-sheet-close-btn"
                  onClick={() => setMobileSheetOpen(false)}
                >
                  닫기 ✕
                </button>
              </div>
            </div>
            <div className="mobile-sheet-content">
              <PreviewPanel
                selectedContents={selectedContents}
                geminiMessage={geminiMessage}
                onGenerateAI={handleGenerateAI}
                onRemove={handleRemove}
                onReset={handleReset}
                onDeselect={handleDeselect}
                isLoading={isLoading}
                streamingText={streamingText}
                relationshipStage={relationshipStage}
                onRelationshipStageChange={handleRelationshipStageChange}
                hideSns={true}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
