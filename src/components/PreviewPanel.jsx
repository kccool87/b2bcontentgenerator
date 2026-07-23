import { useState, useEffect } from 'react';

const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
function num(i) { return NUMS[i] ?? String(i + 1); }

// ── 관계 단계 → 풀 키 변환 ───────────────────────────────────────────
function stageKey(stage) {
  if (stage === '기존 거래처') return 'EXISTING';
  if (stage === '재구매 검토') return 'REPURCHASE';
  return 'EARLY';
}

// ── 인사말 풀 (관계 단계별 8개) ─────────────────────────────────────
const EMAIL_GREETINGS = {
  EARLY: [
    '안녕하세요. 지난번 짧게 인사드렸던 LG유플러스 OOO입니다.',
    '안녕하세요. 얼마 전 연락드렸던 LG유플러스 기업고객 담당 OOO입니다.',
    '안녕하세요. 지난 미팅에서 잠시 뵈었던 LG유플러스 OOO입니다.',
    '안녕하세요. 얼마 전 짧게 말씀 나눴던 LG유플러스 OOO입니다.',
    '안녕하세요. 지난번 연락드렸던 LG유플러스 기업솔루션팀 OOO입니다.',
    '안녕하세요. 잠시 인사드렸던 LG유플러스 OOO입니다. 다시 연락드립니다.',
    '안녕하세요. 지난번 짧은 통화로 인사드렸던 LG유플러스 OOO입니다.',
    '안녕하세요. 얼마 전 뵀던 LG유플러스 기업고객 담당 OOO입니다.',
  ],
  EXISTING: [
    '안녕하세요. 늘 함께해 주셔서 감사드립니다. LG유플러스 OOO입니다.',
    '안녕하세요. 이번에도 연락드리게 됩니다. LG유플러스 영업담당 OOO입니다.',
    '안녕하세요. 말씀 나눠주셔서 늘 감사드립니다. LG유플러스 기업고객 담당 OOO입니다.',
    '안녕하세요. 평소 관심 가져주셔서 항상 감사드립니다. LG유플러스 OOO입니다.',
    '안녕하세요. 늘 챙겨주셔서 감사드립니다. LG유플러스 OOO입니다.',
    '안녕하세요. 이번에도 좋은 소식 가지고 연락드립니다. LG유플러스 기업솔루션팀 OOO입니다.',
    '안녕하세요. 그간 잘 지내셨는지요. LG유플러스 OOO입니다.',
    '안녕하세요. 늘 편하게 대해주셔서 감사드립니다. LG유플러스 OOO입니다.',
  ],
  REPURCHASE: [
    '안녕하세요. 늘 이용해 주셔서 감사합니다. LG유플러스 OOO입니다.',
    '안녕하세요. 현재 서비스 이용 중이신 담당자님께 안내드립니다. LG유플러스 OOO입니다.',
    '안녕하세요. 항상 좋은 파트너가 되어주셔서 감사드립니다. LG유플러스 OOO입니다.',
    '안녕하세요. 그동안 함께해 주셔서 감사합니다. LG유플러스 OOO입니다.',
    '안녕하세요. 꾸준히 이용해 주고 계신 점 늘 감사드립니다. LG유플러스 OOO입니다.',
    '안녕하세요. 오랜 기간 함께해 주셔서 진심으로 감사드립니다. LG유플러스 OOO입니다.',
    '안녕하세요. 늘 좋은 관계 이어가 주셔서 감사합니다. LG유플러스 OOO입니다.',
    '안녕하세요. 지속적인 이용에 감사드리며 연락드립니다. LG유플러스 OOO입니다.',
  ],
};

const MESSENGER_GREETINGS = {
  EARLY: [
    '안녕하세요! 지난번 짧게 인사드렸던 LG유플러스 OOO입니다 😊',
    '안녕하세요~ 얼마 전 연락드렸던 LG유플러스 OOO예요.',
    '안녕하세요! 지난 미팅에서 뵈었던 LG유플러스 OOO입니다.',
    '안녕하세요. 얼마 전 말씀 나눴던 LG유플러스 OOO예요 🙂',
    '안녕하세요~ 지난번 연락드렸던 LG유플러스 기업솔루션팀 OOO입니다!',
    '안녕하세요! 잠시 인사드렸던 LG유플러스 OOO입니다. 다시 연락드려요.',
    '안녕하세요. 지난번 통화로 인사드렸던 LG유플러스 OOO입니다 😄',
    '안녕하세요~ 얼마 전 뵀던 LG유플러스 기업고객 담당 OOO예요.',
  ],
  EXISTING: [
    '안녕하세요! 이번에도 연락드려요. LG유플러스 OOO입니다 😊',
    '안녕하세요~ 늘 함께해 주셔서 감사해요. LG유플러스 OOO예요!',
    '안녕하세요! 늘 좋게 봐주셔서 감사해요. LG유플러스 OOO입니다.',
    '안녕하세요 😊 평소 관심 가져주셔서 항상 감사드립니다. LG유플러스 OOO예요.',
    '안녕하세요! 이번에도 좋은 소식 가지고 연락드려요. LG유플러스 OOO입니다.',
    '안녕하세요~ 늘 잘 봐주셔서 감사드립니다. LG유플러스 기업솔루션팀 OOO예요!',
    '안녕하세요! 그간 잘 지내셨나요? LG유플러스 OOO예요 🙂',
    '안녕하세요~ 늘 편하게 대해주셔서 감사해요! LG유플러스 OOO입니다.',
  ],
  REPURCHASE: [
    '안녕하세요! 늘 이용해 주셔서 감사합니다 😊 LG유플러스 OOO입니다.',
    '안녕하세요~ 현재 서비스 이용 중이신 담당자님께 연락드려요. LG유플러스 OOO입니다!',
    '안녕하세요! 항상 좋은 파트너가 되어주셔서 감사해요. LG유플러스 OOO입니다.',
    '안녕하세요 😊 그동안 함께해 주셔서 감사드립니다. LG유플러스 OOO예요.',
    '안녕하세요~ 꾸준히 이용해 주셔서 늘 감사드려요! LG유플러스 OOO입니다.',
    '안녕하세요! 오랜 기간 함께해 주셔서 진심으로 감사합니다 🙏 LG유플러스 OOO예요.',
    '안녕하세요~ 늘 좋은 관계 이어가 주셔서 감사해요. LG유플러스 OOO입니다!',
    '안녕하세요! 지속적인 이용에 감사드립니다. LG유플러스 OOO입니다 😊',
  ],
};

const EMAIL_CLOSINGS = {
  EARLY: [
    '필요하신 내용이 있으시면 언제든지 편하게 연락 주세요.\n-LG유플러스 OOO 드림-',
    '추가로 궁금하신 점이 있으시면 말씀해 주세요. 성실히 안내드리겠습니다.\n-LG유플러스 OOO 드림-',
    '부담 없이 연락 주시면 상세히 안내드리겠습니다.\n-LG유플러스 OOO 드림-',
    '관심 있으신 부분이 있으시면 편하게 말씀해 주세요.\n-LG유플러스 OOO 드림-',
    '추가 문의나 미팅이 필요하시면 연락 주시면 바로 찾아뵙겠습니다.\n-LG유플러스 OOO 드림-',
    '언제든 편한 시간에 연락 주시면 찾아뵙겠습니다. 감사합니다.\n-LG유플러스 OOO 드림-',
    '더 궁금하신 점이 있으시면 연락 주세요. 성심껏 도와드리겠습니다.\n-LG유플러스 OOO 드림-',
    '편하신 시간에 연락 주시면 자세히 안내드리겠습니다. 감사합니다.\n-LG유플러스 OOO 드림-',
  ],
  EXISTING: [
    '추가로 확인하고 싶으신 사항이 있으시면 말씀해 주세요.\n-LG유플러스 OOO 드림-',
    '궁금한 점이 있으시면 언제든지 편하게 말씀해 주세요.\n-LG유플러스 OOO 드림-',
    '다음에 더 좋은 제안으로 찾아뵐 수 있도록 노력하겠습니다.\n-LG유플러스 OOO 드림-',
    '항상 도움이 될 수 있는 파트너가 되겠습니다.\n-LG유플러스 OOO 드림-',
    '필요하신 부분 있으시면 편하게 연락 주세요. 늘 함께하겠습니다.\n-LG유플러스 OOO 드림-',
    '다음번에도 좋은 소식 가지고 연락드리겠습니다. 감사합니다.\n-LG유플러스 OOO 드림-',
    '혹시 미팅이 가능하시다면 일정 잡아 직접 찾아뵙겠습니다.\n-LG유플러스 OOO 드림-',
    '언제든 필요하신 부분에 맞춰 지원드리겠습니다. 잘 부탁드립니다.\n-LG유플러스 OOO 드림-',
  ],
  REPURCHASE: [
    '앞으로도 좋은 파트너로 계속 함께하겠습니다. 감사합니다.\n-LG유플러스 OOO 드림-',
    '언제든지 필요하신 부분은 말씀만 해 주세요. 항상 최선을 다하겠습니다.\n-LG유플러스 OOO 드림-',
    '지속적인 신뢰와 이용에 진심으로 감사드립니다. 더 좋은 서비스로 보답하겠습니다.\n-LG유플러스 OOO 드림-',
    '앞으로도 든든한 파트너로 곁에 있겠습니다. 감사합니다.\n-LG유플러스 OOO 드림-',
    '더 좋은 가치를 드릴 수 있도록 계속해서 노력하겠습니다.\n-LG유플러스 OOO 드림-',
    '오래도록 함께할 수 있도록 최선을 다하겠습니다. 항상 감사드립니다.\n-LG유플러스 OOO 드림-',
    '장기적인 협력 관계를 위해 늘 최선을 다해 지원드리겠습니다.\n-LG유플러스 OOO 드림-',
    '앞으로도 변함없이 함께해 주시기 바랍니다. 진심으로 감사드립니다.\n-LG유플러스 OOO 드림-',
  ],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const LOADING_PHASES = [
  '콘텐츠 분석 중 ·',
  '고객 상황 파악 중 ··',
  '소개 문구 작성 중 ···',
  '마무리 다듬는 중 ····',
];

// ── 관계 단계 정의 ───────────────────────────────────────────────
const RELATIONSHIP_STAGES = [
  { value: '초기 관계',   label: '초기 관계' },
  { value: '기존 거래처', label: '기존 거래처' },
  { value: '재구매 검토', label: '재구매 검토' },
];

// ── 제목 정제 ───────────────────────────────────────────────────────
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

function ct(title) { return title ? decodeHtml(title.replace(TITLE_SUFFIX, '')) : title; }

// ── URL 처리 ────────────────────────────────────────────────────────
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

function UrlLink({ item }) {
  return (
    <a href={cleanUrl(item.url)} target="_blank" rel="noopener noreferrer" className="preview-link">
      {displayUrl(item.url)}
    </a>
  );
}

// ── 복사용 plain text 빌더 ───────────────────────────────────────────
function buildEmailCopy(items, greeting, intro, closing) {
  const head = intro ? `${greeting}\n\n${intro}` : greeting;
  const body = items
    .map((c, i) => `${num(i)} ${ct(c.title)}\n- ${c.summary}\n${cleanUrl(c.url)}`)
    .join('\n\n');
  return `${head}\n\n${body}\n\n${closing}`;
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

// ── SNS 바 ─────────────────────────────────────────────────────────────
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

function UrlPreview({ items }) {
  return (
    <pre className="preview-text">
      {items.map((c, i) => (
        <span key={c.id}>
          {i > 0 && '\n\n'}
          {num(i)} {ct(c.title)}{'\n'}
          <UrlLink item={c} />
        </span>
      ))}
    </pre>
  );
}

// ── 컴포넌트 ──────────────────────────────────────────────────────
export default function PreviewPanel({
  selectedContents,
  geminiMessage,
  onGenerateAI,
  onRemove,
  onReset,
  onDeselect,
  isLoading,
  streamingText,
  relationshipStage,
  onRelationshipStageChange,
  hideSns = false,
}) {
  const [activeTab, setActiveTab]         = useState('email');
  const [copied, setCopied]               = useState(false);
  const [kakaoShared, setKakaoShared]     = useState(false);
  const [phaseIdx, setPhaseIdx]           = useState(0);
  const [emailGreeting, setEmailGreeting] = useState(() => pick(EMAIL_GREETINGS[stageKey(relationshipStage)]));
  const [msgGreeting,   setMsgGreeting]   = useState(() => pick(MESSENGER_GREETINGS[stageKey(relationshipStage)]));
  const [emailClosing,  setEmailClosing]  = useState(() => pick(EMAIL_CLOSINGS[stageKey(relationshipStage)]));

  // 전체 편집 가능 텍스트 state
  const [fullEmailText,     setFullEmailText]     = useState('');
  const [fullMessengerText, setFullMessengerText] = useState('');
  const [userEditedEmail,   setUserEditedEmail]   = useState(false);
  const [userEditedMessenger, setUserEditedMessenger] = useState(false);
  const [isEditing,         setIsEditing]         = useState(false);

  const isEmpty = !selectedContents || selectedContents.length === 0;

  // 로딩 페이즈 애니메이션
  useEffect(() => {
    if (!isLoading) { setPhaseIdx(0); return; }
    const id = setInterval(() => setPhaseIdx((i) => (i + 1) % LOADING_PHASES.length), 700);
    return () => clearInterval(id);
  }, [isLoading]);

  // 콘텐츠 수 또는 관계 단계 변경 시 인사말·맺음말 재추첨
  useEffect(() => {
    if (!isEmpty) {
      const key = stageKey(relationshipStage);
      setEmailGreeting(pick(EMAIL_GREETINGS[key]));
      setMsgGreeting(pick(MESSENGER_GREETINGS[key]));
      setEmailClosing(pick(EMAIL_CLOSINGS[key]));
    }
  }, [selectedContents?.length, relationshipStage]); // eslint-disable-line react-hooks/exhaustive-deps

  // AI 응답 or 인사말 변경 → 전체 텍스트 재조립 (유저 수정 초기화)
  useEffect(() => {
    if (isEmpty) return;
    const emailIntro = (geminiMessage && !geminiMessage.rateLimited) ? (geminiMessage.email ?? '') : '';
    const msgIntro   = (geminiMessage && !geminiMessage.rateLimited) ? (geminiMessage.messenger ?? '') : '';
    setFullEmailText(buildEmailCopy(selectedContents, emailGreeting, emailIntro, emailClosing));
    setFullMessengerText(buildMessengerCopy(selectedContents, msgGreeting, msgIntro));
    setUserEditedEmail(false);
    setUserEditedMessenger(false);
    setIsEditing(false);
  }, [geminiMessage, emailGreeting, emailClosing, msgGreeting]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleResetToAI() {
    if (!geminiMessage || geminiMessage.rateLimited) return;
    const emailIntro = geminiMessage.email ?? '';
    const msgIntro   = geminiMessage.messenger ?? '';
    setFullEmailText(buildEmailCopy(selectedContents, emailGreeting, emailIntro, emailClosing));
    setFullMessengerText(buildMessengerCopy(selectedContents, msgGreeting, msgIntro));
    setUserEditedEmail(false);
    setUserEditedMessenger(false);
    setIsEditing(false);
  }

  const canResetToAI = !!geminiMessage && !geminiMessage.rateLimited && (userEditedEmail || userEditedMessenger);

  function getCopyText() {
    if (activeTab === 'email')     return fullEmailText;
    if (activeTab === 'messenger') return fullMessengerText;
    return buildUrlCopy(selectedContents);
  }

  async function handleCopy() {
    await writeClipboard(getCopyText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleKakaoShare() {
    await writeClipboard(fullMessengerText);
    setKakaoShared(true);
    setTimeout(() => setKakaoShared(false), 2500);
    try { window.open('kakaotalk://', '_self'); } catch {}
  }

  function handleMailTo() {
    const subject = selectedContents.map((c, i) => `${num(i)} ${ct(c.title)}`).join(' / ');
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullEmailText)}`, '_self');
  }

  const isStreaming = isLoading && !!streamingText;

  // 텍스트 내 URL을 클릭 가능한 링크로 변환
  function renderWithLinks(text) {
    if (!text) return null;
    return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
      /^https?:\/\//.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="preview-link">{part}</a>
        : part
    );
  }

  return (
    <div className="preview-panel">
      {/* 고객 관계 단계 — 항상 표시 */}
      <div className="relationship-stage-row">
        <span className="relationship-stage-label">고객 관계</span>
        <div className="relationship-stage-btns">
          {RELATIONSHIP_STAGES.map(({ value, label }) => (
            <button
              key={value}
              className={`stage-btn${relationshipStage === value ? ' stage-btn--active' : ''}`}
              onClick={() => onRelationshipStageChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 콘텐츠 칩 */}
      {!isEmpty && (
        <>
          <div className="selected-chips-header">
            <p className="selected-chips-label">선택된 콘텐츠 ({selectedContents.length}개)</p>
            <button className="preview-reset-btn" onClick={onDeselect} title="선택된 콘텐츠 모두 해제">
              선택 해제
            </button>
          </div>
          <div className="selected-chips-wrap">
            {selectedContents.map((item, i) => (
              <span key={item.id} className="selected-chip" title={ct(item.title)}>
                <span className="chip-num">{num(i)}</span>
                <span className="chip-title">{ct(item.title)}</span>
                <button className="chip-remove" onClick={() => onRemove(item.id)} title="선택 해제">×</button>
              </span>
            ))}
          </div>
        </>
      )}

      {/* 포맷 탭 */}
      <div className="format-tab-bar">
        {FORMAT_TABS.map(({ key, icon, label }) => (
          <button
            key={key}
            className={`format-tab${activeTab === key ? ' format-tab--active' : ''}${isEmpty ? ' format-tab--inactive' : ''}`}
            onClick={() => !isEmpty && setActiveTab(key)}
            disabled={isEmpty}
          >
            <span className="format-tab-icon">{icon}</span>
            <span className="format-tab-label">{label}</span>
          </button>
        ))}
      </div>

      {/* 미리보기 영역 */}
      <div className="preview-box">
        {isEmpty ? (
          <div className="preview-empty-hint">
            <span className="preview-empty-icon">✦</span>
            <p>콘텐츠를 선택하면<br />고객 제안 문구가 생성됩니다.</p>
          </div>
        ) : isStreaming ? (
          <pre className="preview-streaming">{streamingText}</pre>
        ) : isLoading ? (
          <div className="preview-loading">
            <span className="loading-spinner" />
            <span className="loading-text">{LOADING_PHASES[phaseIdx]}</span>
          </div>
        ) : (
          <>
            {activeTab === 'email' && (
              isEditing ? (
                <textarea
                  className="preview-full-textarea"
                  value={fullEmailText}
                  onChange={(e) => { setFullEmailText(e.target.value); setUserEditedEmail(true); }}
                  spellCheck={false}
                  autoFocus
                />
              ) : (
                <div className="preview-full-view">
                  {renderWithLinks(fullEmailText)}
                </div>
              )
            )}
            {activeTab === 'messenger' && (
              isEditing ? (
                <textarea
                  className="preview-full-textarea"
                  value={fullMessengerText}
                  onChange={(e) => { setFullMessengerText(e.target.value); setUserEditedMessenger(true); }}
                  spellCheck={false}
                  autoFocus
                />
              ) : (
                <div className="preview-full-view">
                  {renderWithLinks(fullMessengerText)}
                </div>
              )
            )}
            {activeTab === 'url' && (
              <UrlPreview items={selectedContents} />
            )}
          </>
        )}
      </div>

      {/* 하단 액션 영역 */}
      <div className="copy-action-area">
        <div className="copy-action-hint-row">
          <p className="copy-action-hint">✦ 클릭할 때마다 새로운 AI 문구가 생성됩니다.</p>
          {!isEditing ? (
            <button
              className="edit-text-btn"
              onClick={() => setIsEditing(true)}
              disabled={isEmpty || isLoading}
            >
              ✎ 문구 수정하기
            </button>
          ) : (
            <div className="edit-action-btns">
              <button className="edit-done-btn" onClick={() => setIsEditing(false)}>
                완료
              </button>
              <button
                className="reset-to-ai-btn"
                onClick={handleResetToAI}
                disabled={!canResetToAI}
              >
                문구 되돌리기
              </button>
            </div>
          )}
        </div>
        <div className="action-grid">
          {/* 행 1: AI 재생성 + 문구 복사 */}
          <button
            className={`action-btn action-btn--regen${isLoading ? ' action-btn--loading' : ''}`}
            onClick={onGenerateAI}
            disabled={isLoading || isEmpty}
            title="현재 관계 단계 설정으로 AI 문구를 새로 생성합니다"
          >
            {isLoading
              ? <><span className="ai-regen-spinner" />생성 중</>
              : <>✦ AI 문구 재생성</>}
          </button>

          <button
            className={`action-btn action-btn--copy${copied ? ' action-btn--copy-done' : ''}`}
            onClick={handleCopy}
            disabled={isLoading || isEmpty}
          >
            {copied ? '✓ 복사 완료' : '⧉ 문구 복사하기'}
          </button>

          {/* 행 2: 이메일 + 카카오톡 */}
          <button
            className="action-btn action-btn--email"
            onClick={handleMailTo}
            disabled={isLoading || isEmpty}
            title="이메일 문구를 기본 메일 앱으로 보냅니다"
          >
            ✉ 이메일 발송
          </button>

          <button
            className={`action-btn action-btn--kakao${kakaoShared ? ' action-btn--kakao-done' : ''}`}
            onClick={handleKakaoShare}
            disabled={isLoading || isEmpty}
            title="메신저 문구를 복사하고 카카오톡을 엽니다"
          >
            {kakaoShared ? '붙여넣기 하세요' : '💬 카카오톡 발송'}
          </button>
        </div>
      </div>

      {!hideSns && <SnsBar />}
    </div>
  );
}
