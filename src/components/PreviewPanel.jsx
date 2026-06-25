import { useState, useEffect } from 'react';

const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
function num(i) { return NUMS[i] ?? String(i + 1); }

const LOADING_PHASES = [
  '콘텐츠 분석 중 ·',
  '고객 상황 파악 중 ··',
  '소개 문구 작성 중 ···',
  '마무리 다듬는 중 ····',
];

// ── URL 처리 ────────────────────────────────────────────────────
function cleanUrl(url) {
  try { return decodeURIComponent(url); } catch { return url; }
}
function displayUrl(url) {
  try {
    const decoded = decodeURIComponent(url).replace(/^https?:\/\//, '');
    return decoded.length > 52 ? decoded.slice(0, 50) + '…' : decoded;
  } catch {
    const clean = url.replace(/^https?:\/\//, '');
    return clean.length > 52 ? clean.slice(0, 50) + '…' : clean;
  }
}

// ── 포맷 함수 ──────────────────────────────────────────────────
function buildPreviewTitleUrlBlock(items) {
  return items.map((c, i) => `${num(i)} ${c.title}\n${displayUrl(c.url)}`).join('\n\n');
}

function buildTitleUrlBlock(items) {
  return items.map((c, i) => `${num(i)} ${c.title}\n${cleanUrl(c.url)}`).join('\n\n');
}

function buildFullCopy(items, intro) {
  const body = items
    .map((c, i) => `${num(i)} ${c.title}\n- ${c.summary}\n${cleanUrl(c.url)}`)
    .join('\n\n');
  return intro ? `${intro}\n\n${body}` : body;
}

function buildEmailCopy(items, intro) {
  const body = items
    .map((c, i) => `${num(i)} ${c.title}\n- ${c.summary}\n${cleanUrl(c.url)}`)
    .join('\n\n');
  const footer = '\n\n필요하시면 관련 상품 상담도 함께 도와드리겠습니다.';
  return intro ? `${intro}\n\n${body}${footer}` : `${body}${footer}`;
}

function buildKakaoCopy(items, intro) {
  const body = items.map((c, i) => `${num(i)} ${c.title}\n🔗 ${cleanUrl(c.url)}`).join('\n\n');
  return intro ? `${intro}\n\n${body}` : body;
}

async function writeClipboard(text) {
  if (navigator.clipboard) {
    try { await navigator.clipboard.writeText(text); return; } catch {}
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  Object.assign(ta.style, { position: 'fixed', opacity: '0' });
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

// ── SNS 바 ─────────────────────────────────────────────────────────
const SNS_LINKS = [
  { name: 'naverblog', href: 'https://blog.naver.com/lguplusbusiness',              label: '네이버 블로그' },
  { name: 'wordpress', href: 'https://lguplusenterprise.com/',                       label: '워드프레스' },
  { name: 'linkedin',  href: 'https://www.linkedin.com/company/lg-uplus-enterprise', label: '링크드인' },
  { name: 'instagram', href: 'https://www.instagram.com/lguplus_enterprise/',        label: '인스타그램' },
  { name: 'facebook',  href: 'https://www.facebook.com/lguplusenterprise',           label: '페이스북' },
];

function SnsBar() {
  return (
    <div className="sns-section">
      <p className="sns-headline">📣 더 많은 콘텐츠를 보려면 아래 U+Enterprise SNS 채널을 방문해보세요.</p>
      <div className="sns-icons">
        {SNS_LINKS.map(({ name, href, label }) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="sns-icon-link" title={label}>
            <img src={`${import.meta.env.BASE_URL}img/${name}.png`} alt={label} className="sns-icon-img" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ── 컴포넌트 ──────────────────────────────────────────────────────
export default function PreviewPanel({
  selectedContents,
  geminiMessage,
  onGenerateAI,
  onRemove,
  onReset,
  isLoading,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (!isLoading) { setPhaseIdx(0); return; }
    const id = setInterval(() => setPhaseIdx((i) => (i + 1) % LOADING_PHASES.length), 700);
    return () => clearInterval(id);
  }, [isLoading]);

  async function handleCopy(key, text) {
    await writeClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (!selectedContents || selectedContents.length === 0) {
    return (
      <div className="preview-panel preview-panel--empty">
        <div className="empty-preview-inner">
          <div className="empty-preview-icon">✦</div>
          <p>콘텐츠를 선택하면<br />고객 제안 문구가 생성됩니다.</p>
        </div>
        <SnsBar />
      </div>
    );
  }

  // 소개 문구: AI 생성 시에만 표시 (기본 문구 없음)
  const intro       = geminiMessage ?? '';
  const titleBlock  = buildPreviewTitleUrlBlock(selectedContents);
  const previewText = intro ? `${intro}\n\n${titleBlock}` : titleBlock;

  const COPY_BUTTONS = [
    {
      key:     'full',
      label:   '전체 복사',
      cls:     'copy-btn--full',
      getText: () => buildFullCopy(selectedContents, intro),
    },
    {
      key:     'url',
      label:   '제목+URL 복사',
      cls:     'copy-btn--url',
      getText: () => buildTitleUrlBlock(selectedContents),
    },
    {
      key:     'email',
      label:   '이메일용 복사',
      cls:     'copy-btn--email',
      getText: () => buildEmailCopy(selectedContents, intro),
    },
    {
      key:     'kakao',
      label:   '카카오용 복사',
      cls:     'copy-btn--kakao',
      getText: () => buildKakaoCopy(selectedContents, intro),
    },
  ];

  return (
    <div className="preview-panel">
      <div className="preview-title-row">
        <h2 className="preview-title">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="preview-title-icon" aria-hidden="true">
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 3V5z" fill="currentColor"/>
          </svg>
          고객 제안 문구 미리보기
        </h2>
        <button className="preview-reset-btn" onClick={onReset} title="전체 초기화">
          ↺ 초기화
        </button>
      </div>

      {/* 선택된 콘텐츠 목록 */}
      <div className="selected-list">
        <p className="selected-label">선택된 콘텐츠 ({selectedContents.length}개)</p>
        {selectedContents.map((item) => (
          <div key={item.id} className="selected-item">
            <span className="selected-dot" />
            <span className="selected-title">{item.title}</span>
            <button
              className="selected-remove"
              onClick={() => onRemove(item.id)}
              title="선택 해제"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* AI 문구 자동 생성 */}
      <div className="ai-section">
        <p className="ai-label">✦ AI 자동 생성 · 클릭할 때마다 새로운 문구가 생성됩니다.</p>
        <button className="ai-btn" onClick={onGenerateAI} disabled={isLoading}>
          {isLoading ? '생성 중...' : '고객 제안 문구 자동 생성'}
        </button>
      </div>

      {/* 미리보기 영역 */}
      <div className="preview-box">
        {isLoading ? (
          <div className="preview-loading">
            <span className="loading-spinner" />
            <span className="loading-text">{LOADING_PHASES[phaseIdx]}</span>
          </div>
        ) : (
          <pre className="preview-text">{previewText}</pre>
        )}
      </div>

      {/* 복사 버튼 2×2 */}
      <div className="copy-btns">
        {COPY_BUTTONS.map(({ key, label, cls, getText }) => (
          <button
            key={key}
            className={`copy-btn ${cls} ${copiedKey === key ? 'copy-btn--done' : ''}`}
            onClick={() => handleCopy(key, getText())}
            disabled={isLoading}
          >
            {copiedKey === key ? '복사 완료!' : label}
          </button>
        ))}
      </div>

      <SnsBar />
    </div>
  );
}
