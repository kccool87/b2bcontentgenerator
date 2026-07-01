import { useState, useEffect } from 'react';

const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
function num(i) { return NUMS[i] ?? String(i + 1); }

// ── 인사말 풀 (이메일 = 합쇼체·격식 / 메신저 = 해요체·자연스럽게) ──
const EMAIL_GREETINGS = [
  '안녕하세요. LG유플러스 기업고객 담당 OOO입니다.',
  '안녕하세요. LG유플러스 기업솔루션팀 OOO입니다.',
  '항상 관심 가져주셔서 감사드립니다. LG유플러스 영업담당 OOO입니다.',
  '안녕하세요. 평소 변함없는 성원에 감사드립니다. LG유플러스 OOO입니다.',
  '안녕하세요. 항상 감사드립니다. LG유플러스 기업고객 담당 OOO입니다.',
  '안녕하세요. 저는 LG유플러스에서 기업 솔루션을 담당하고 있는 OOO입니다.',
];

const MESSENGER_GREETINGS = [
  '안녕하세요? LG유플러스 OOO 담당자입니다.',
  '안녕하세요! LG유플러스 OOO입니다.',
  '안녕하세요? 잘 지내고 계신가요? LG유플러스 OOO입니다.',
  '안녕하세요! 오늘도 좋은 하루 되세요. LG유플러스 OOO입니다.',
  '안녕하세요? 고객님, LG유플러스 OOO 담당입니다.',
  '안녕하세요! LG유플러스 OOO 담당자입니다, 연락드려요.',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const LOADING_PHASES = [
  '콘텐츠 분석 중 ·',
  '고객 상황 파악 중 ··',
  '소개 문구 작성 중 ···',
  '마무리 다듬는 중 ····',
];

// ── 제목 정제 ───────────────────────────────────────────────────
const TITLE_SUFFIX = / - LG Uplus Enterprise$/i;
function ct(title) { return title ? title.replace(TITLE_SUFFIX, '') : title; }

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

// ── URL 링크 헬퍼 ───────────────────────────────────────────────
function UrlLink({ item }) {
  return (
    <a href={cleanUrl(item.url)} target="_blank" rel="noopener noreferrer" className="preview-link">
      {displayUrl(item.url)}
    </a>
  );
}

// ── 탭별 미리보기 JSX ────────────────────────────────────────────

// 이메일: 합쇼체 인사 + 격식 도입문 + 제목·요약·URL + 맺음말
function EmailPreview({ greeting, intro, items }) {
  return (
    <>
      {greeting}{'\n\n'}
      {intro && <>{intro}{'\n\n'}</>}
      {items.map((c, i) => (
        <span key={c.id}>
          {i > 0 && '\n\n'}
          {num(i)} {ct(c.title)}{'\n'}
          {'- '}{c.summary}{'\n'}
          <UrlLink item={c} />
        </span>
      ))}
      {'\n\n검토하시다가 궁금하신 점 있으시면 언제든지 말씀해 주시기 바랍니다.'}
    </>
  );
}

// 메신저: 해요체 인사 + 가벼운 도입문 + 제목·URL만 (요약 없음)
function MessengerPreview({ greeting, intro, items }) {
  return (
    <>
      {greeting}{'\n\n'}
      {intro && <>{intro}{'\n\n'}</>}
      {items.map((c, i) => (
        <span key={c.id}>
          {i > 0 && '\n'}
          {num(i)} {ct(c.title)}{'\n'}
          {'🔗 '}<UrlLink item={c} />
        </span>
      ))}
    </>
  );
}

function UrlPreview({ items }) {
  return (
    <>
      {items.map((c, i) => (
        <span key={c.id}>
          {i > 0 && '\n\n'}
          {num(i)} {ct(c.title)}{'\n'}
          <UrlLink item={c} />
        </span>
      ))}
    </>
  );
}

// ── 복사용 plain text 빌더 ───────────────────────────────────────
function buildEmailCopy(items, greeting, intro) {
  const head = intro ? `${greeting}\n\n${intro}` : greeting;
  const body = items
    .map((c, i) => `${num(i)} ${ct(c.title)}\n- ${c.summary}\n${cleanUrl(c.url)}`)
    .join('\n\n');
  return `${head}\n\n${body}\n\n검토하시다가 궁금하신 점 있으시면 언제든지 말씀해 주시기 바랍니다.`;
}

function buildMessengerCopy(items, greeting, intro) {
  const head = intro ? `${greeting}\n\n${intro}` : greeting;
  const body = items.map((c, i) => `${num(i)} ${ct(c.title)}\n🔗 ${cleanUrl(c.url)}`).join('\n');
  return `${head}\n\n${body}`;
}

function buildUrlCopy(items) {
  return items.map((c, i) => `${num(i)} ${ct(c.title)}\n${cleanUrl(c.url)}`).join('\n\n');
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

// ── 탭 정의 ─────────────────────────────────────────────────────
const FORMAT_TABS = [
  { key: 'email',     icon: '✉',  label: '이메일용' },
  { key: 'messenger', icon: '💬', label: '메신저용' },
  { key: 'url',       icon: '🔗', label: '제목+URL' },
];

// ── 컴포넌트 ──────────────────────────────────────────────────────
export default function PreviewPanel({
  selectedContents,
  geminiMessage,        // { email: string, messenger: string } | null
  onGenerateAI,
  onRemove,
  onReset,
  isLoading,
}) {
  const [activeTab, setActiveTab]           = useState('email');
  const [copied, setCopied]                 = useState(false);
  const [phaseIdx, setPhaseIdx]             = useState(0);
  const [emailGreeting, setEmailGreeting]   = useState(() => pick(EMAIL_GREETINGS));
  const [msgGreeting,   setMsgGreeting]     = useState(() => pick(MESSENGER_GREETINGS));

  useEffect(() => {
    if (!isLoading) { setPhaseIdx(0); return; }
    const id = setInterval(() => setPhaseIdx((i) => (i + 1) % LOADING_PHASES.length), 700);
    return () => clearInterval(id);
  }, [isLoading]);

  // 선택 콘텐츠 수가 바뀔 때마다 인사말 재추첨
  useEffect(() => {
    if (selectedContents.length > 0) {
      setEmailGreeting(pick(EMAIL_GREETINGS));
      setMsgGreeting(pick(MESSENGER_GREETINGS));
    }
  }, [selectedContents.length]);

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

  // geminiMessage = { email, messenger } 객체
  const emailIntro     = geminiMessage?.email     ?? '';
  const messengerIntro = geminiMessage?.messenger ?? '';

  function getCopyText() {
    if (activeTab === 'email')     return buildEmailCopy(selectedContents, emailGreeting, emailIntro);
    if (activeTab === 'messenger') return buildMessengerCopy(selectedContents, msgGreeting, messengerIntro);
    return buildUrlCopy(selectedContents);
  }

  async function handleCopy() {
    await writeClipboard(getCopyText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
            <span className="selected-title">{ct(item.title)}</span>
            <button className="selected-remove" onClick={() => onRemove(item.id)} title="선택 해제">×</button>
          </div>
        ))}
      </div>

      {/* 포맷 탭 */}
      <div className="format-tab-bar">
        {FORMAT_TABS.map(({ key, icon, label }) => (
          <button
            key={key}
            className={`format-tab${activeTab === key ? ' format-tab--active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <span className="format-tab-icon">{icon}</span>
            <span className="format-tab-label">{label}</span>
          </button>
        ))}
      </div>

      {/* 미리보기 영역 */}
      <div className="preview-box">
        {isLoading ? (
          <div className="preview-loading">
            <span className="loading-spinner" />
            <span className="loading-text">{LOADING_PHASES[phaseIdx]}</span>
          </div>
        ) : (
          <pre className="preview-text">
            {activeTab === 'email'     && <EmailPreview     greeting={emailGreeting} intro={emailIntro}     items={selectedContents} />}
            {activeTab === 'messenger' && <MessengerPreview greeting={msgGreeting}   intro={messengerIntro} items={selectedContents} />}
            {activeTab === 'url'       && <UrlPreview       items={selectedContents} />}
          </pre>
        )}
      </div>

      {/* 하단 액션 영역 */}
      <div className="copy-action-area">
        <p className="copy-action-hint">✦ 클릭할 때마다 새로운 AI 문구가 생성됩니다.</p>
        <div className="copy-action-row">
          <button
            className={`ai-regen-btn${isLoading ? ' ai-regen-btn--loading' : ''}`}
            onClick={onGenerateAI}
            disabled={isLoading}
            title="AI가 새로운 소개 문구를 생성합니다"
          >
            {isLoading ? (
              <><span className="ai-regen-spinner" />생성 중</>
            ) : (
              <><span className="ai-regen-icon">✦</span>AI 문구 다시 생성</>
            )}
          </button>
          <button
            className={`copy-single-btn${copied ? ' copy-single-btn--done' : ''}`}
            onClick={handleCopy}
            disabled={isLoading}
          >
            {copied ? '✓ 복사 완료!' : '문구 복사하기'}
          </button>
        </div>
      </div>

      <SnsBar />
    </div>
  );
}
