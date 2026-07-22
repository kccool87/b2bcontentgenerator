import { useState, useEffect } from 'react';

const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
function num(i) { return NUMS[i] ?? String(i + 1); }

// ── 인사말 풀 ──────────────────────────────────────────────────────
const EMAIL_GREETINGS = [
  '안녕하세요. 지난번에 말씀 나눴던 LG유플러스 OOO입니다.',
  '안녕하세요. 한번 인사 드렸던 LG유플러스 영업담당 OOO입니다.',
  '안녕하세요. 말씀 나눠주셔서 늘 감사드립니다. LG유플러스 기업고객 담당 OOO입니다.',
  '안녕하세요. 평소 관심 가져주셔서 항상 감사드립니다. LG유플러스 OOO입니다.',
  '안녕하세요. 지난번 대화 이후 꼭 한번 더 연락드리고 싶었습니다. LG유플러스 OOO입니다.',
  '안녕하세요. 좋은 인연으로 다시 연락드리게 됩니다. LG유플러스 기업솔루션팀 OOO입니다.',
];

const MESSENGER_GREETINGS = [
  '안녕하세요? LG유플러스 OOO 담당자입니다.',
  '안녕하세요! LG유플러스 OOO입니다.',
  '안녕하세요? 잘 지내고 계신가요? LG유플러스 OOO입니다.',
  '안녕하세요! 오늘도 좋은 하루 되세요. LG유플러스 OOO입니다.',
  '안녕하세요? 고객님, LG유플러스 OOO 담당입니다.',
  '안녕하세요! LG유플러스 OOO 담당자입니다, 연락드려요.',
];

const EMAIL_CLOSINGS = [
  '앞으로도 도움이 될 자료가 있으면 먼저 챙겨드리겠습니다. 감사합니다.\n-LG유플러스 OOO 드림-',
  '다음에도 좋은 자료가 생기면 공유드리겠습니다. 좋은 하루 되세요.\n-LG유플러스 OOO 드림-',
  '언제든 편하게 연락 주시면 바로 도와드리겠습니다. 늘 감사드립니다.\n-LG유플러스 OOO 드림-',
  '좋은 인연 계속 이어가길 바랍니다. 항상 감사드립니다.\n-LG유플러스 OOO 드림-',
  '앞으로도 유익한 내용 있으면 먼저 연락드리겠습니다. 좋은 하루 되세요.\n-LG유플러스 OOO 드림-',
  '앞으로도 지속적으로 좋은 정보 나누며 함께하겠습니다. 감사합니다.\n-LG유플러스 OOO 드림-',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const LOADING_PHASES = [
  '콘텐츠 분석 중 ·',
  '고객 상황 파악 중 ··',
  '소개 문구 작성 중 ···',
  '마무리 다듬는 중 ····',
];

// ── 관계 단계 정의 ───────────────────────────────────────────────
const RELATIONSHIP_STAGES = [
  { value: '초면',       label: '초면(콜드)' },
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

// ── 이메일/메신저 미리보기 — 편집 가능 구조 ────────────────────────
function EditableEmailPreview({ greeting, intro, onIntroChange, items, closing }) {
  return (
    <div className="preview-editable">
      <pre className="preview-static-seg">{greeting}</pre>
      <textarea
        className="preview-intro-textarea"
        value={intro}
        onChange={(e) => onIntroChange(e.target.value)}
        placeholder="콘텐츠를 선택하면 AI가 소개 문구를 생성합니다."
        rows={3}
      />
      <pre className="preview-static-seg preview-items-seg">
        {items.map((c, i) => (
          <span key={c.id}>
            {'\n\n'}{num(i)} {ct(c.title)}{'\n'}
            {'- '}{c.summary}{'\n'}
            <UrlLink item={c} />
          </span>
        ))}
        {'\n\n'}{closing}
      </pre>
    </div>
  );
}

function EditableMessengerPreview({ greeting, intro, onIntroChange, items }) {
  return (
    <div className="preview-editable">
      <pre className="preview-static-seg">{greeting}</pre>
      <textarea
        className="preview-intro-textarea"
        value={intro}
        onChange={(e) => onIntroChange(e.target.value)}
        placeholder="콘텐츠를 선택하면 AI가 소개 문구를 생성합니다."
        rows={2}
      />
      <pre className="preview-static-seg preview-items-seg">
        {items.map((c, i) => (
          <span key={c.id}>
            {'\n'}{num(i)} {ct(c.title)}{'\n'}
            {'🔗 '}<UrlLink item={c} />
          </span>
        ))}
      </pre>
    </div>
  );
}

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
}) {
  const [activeTab, setActiveTab]         = useState('email');
  const [copied, setCopied]               = useState(false);
  const [kakaoShared, setKakaoShared]     = useState(false);
  const [phaseIdx, setPhaseIdx]           = useState(0);
  const [emailGreeting, setEmailGreeting] = useState(() => pick(EMAIL_GREETINGS));
  const [msgGreeting,   setMsgGreeting]   = useState(() => pick(MESSENGER_GREETINGS));
  const [emailClosing,  setEmailClosing]  = useState(() => pick(EMAIL_CLOSINGS));

  // 편집 가능한 AI 소개 문구 로컬 state
  const [editedEmail,     setEditedEmail]     = useState('');
  const [editedMessenger, setEditedMessenger] = useState('');

  // 새 AI 응답이 오면 편집 state 동기화
  useEffect(() => {
    if (geminiMessage && !geminiMessage.rateLimited) {
      setEditedEmail(geminiMessage.email ?? '');
      setEditedMessenger(geminiMessage.messenger ?? '');
    }
  }, [geminiMessage]);

  // 로딩 페이즈 애니메이션 (스트리밍 시작 전 spinner용)
  useEffect(() => {
    if (!isLoading) { setPhaseIdx(0); return; }
    const id = setInterval(() => setPhaseIdx((i) => (i + 1) % LOADING_PHASES.length), 700);
    return () => clearInterval(id);
  }, [isLoading]);

  const isEmpty = !selectedContents || selectedContents.length === 0;

  // 선택 콘텐츠 수가 바뀔 때마다 인사말·맺음말 재추첨
  useEffect(() => {
    if (!isEmpty) {
      setEmailGreeting(pick(EMAIL_GREETINGS));
      setMsgGreeting(pick(MESSENGER_GREETINGS));
      setEmailClosing(pick(EMAIL_CLOSINGS));
    }
  }, [selectedContents?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // AI 원본 문구로 되돌리기
  function handleResetToAI() {
    if (!geminiMessage || geminiMessage.rateLimited) return;
    setEditedEmail(geminiMessage.email ?? '');
    setEditedMessenger(geminiMessage.messenger ?? '');
  }

  const isEmailEdited     = !!geminiMessage && !geminiMessage.rateLimited && editedEmail     !== (geminiMessage.email     ?? '');
  const isMessengerEdited = !!geminiMessage && !geminiMessage.rateLimited && editedMessenger !== (geminiMessage.messenger ?? '');
  const isIntroEdited     = activeTab === 'email' ? isEmailEdited : activeTab === 'messenger' ? isMessengerEdited : false;

  function getCopyText() {
    if (activeTab === 'email')     return buildEmailCopy(selectedContents, emailGreeting, editedEmail, emailClosing);
    if (activeTab === 'messenger') return buildMessengerCopy(selectedContents, msgGreeting, editedMessenger);
    return buildUrlCopy(selectedContents);
  }

  async function handleCopy() {
    await writeClipboard(getCopyText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 카카오톡 공유: 메신저 문구 복사 + 앱/웹 열기 시도
  async function handleKakaoShare() {
    const text = buildMessengerCopy(selectedContents, msgGreeting, editedMessenger);
    await writeClipboard(text);
    setKakaoShared(true);
    setTimeout(() => setKakaoShared(false), 2500);
    // 모바일에서 카카오톡 앱 열기 시도 (데스크탑에서는 무시됨)
    try { window.open('kakaotalk://', '_self'); } catch {}
  }

  // 메일로 보내기: 제목 + 이메일 본문을 mailto: 링크로 전달
  function handleMailTo() {
    const subject = selectedContents.map((c, i) => `${num(i)} ${ct(c.title)}`).join(' / ');
    const body    = buildEmailCopy(selectedContents, emailGreeting, editedEmail, emailClosing);
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
  }

  // 스트리밍 중 표시 여부
  const isStreaming = isLoading && !!streamingText;

  return (
    <div className="preview-panel">
      <div className="preview-title-row">
        <h2 className="preview-title">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="preview-title-icon" aria-hidden="true">
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 3V5z" fill="currentColor"/>
          </svg>
          고객 제안 문구 미리보기
        </h2>
        {!isEmpty && (
          <button className="preview-reset-btn" onClick={onDeselect} title="선택된 콘텐츠 모두 해제">
            선택해제
          </button>
        )}
      </div>

      {/* 선택된 콘텐츠 칩 */}
      {!isEmpty && (
        <>
          <p className="selected-chips-label">선택된 콘텐츠 ({selectedContents.length}개)</p>
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

      {/* 관계 단계 선택 */}
      {!isEmpty && (
        <div className="relationship-stage-row">
          <span className="relationship-stage-label">관계 단계</span>
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
          /* 스트리밍 중 — 원문 텍스트가 타이핑되듯 표시 */
          <pre className="preview-streaming">{streamingText}</pre>
        ) : isLoading ? (
          /* 스트리밍 시작 전 스피너 */
          <div className="preview-loading">
            <span className="loading-spinner" />
            <span className="loading-text">{LOADING_PHASES[phaseIdx]}</span>
          </div>
        ) : (
          /* 완료 — 편집 가능한 미리보기 */
          <>
            {activeTab === 'email' && (
              <EditableEmailPreview
                greeting={emailGreeting}
                intro={editedEmail}
                onIntroChange={setEditedEmail}
                items={selectedContents}
                closing={emailClosing}
              />
            )}
            {activeTab === 'messenger' && (
              <EditableMessengerPreview
                greeting={msgGreeting}
                intro={editedMessenger}
                onIntroChange={setEditedMessenger}
                items={selectedContents}
              />
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
          {isIntroEdited && (
            <button className="reset-to-ai-btn" onClick={handleResetToAI} title="AI가 생성한 원본 문구로 되돌립니다">
              AI 문구로 되돌리기
            </button>
          )}
        </div>
        <div className="copy-action-row">
          <button
            className={`ai-regen-btn${isLoading ? ' ai-regen-btn--loading' : ''}`}
            onClick={onGenerateAI}
            disabled={isLoading || isEmpty}
            title="현재 관계 단계 설정으로 AI 문구를 새로 생성합니다"
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
            disabled={isLoading || isEmpty}
          >
            {copied ? '✓ 복사 완료!' : '문구 복사하기'}
          </button>
        </div>

        {/* 발송 버튼 — copy-action-area 내부에 배치해야 overflow:hidden에 잘리지 않음 */}
        <div className="share-btn-row">
          <button
            className={`share-btn share-btn--kakao${kakaoShared ? ' share-btn--done' : ''}`}
            onClick={handleKakaoShare}
            disabled={isLoading || isEmpty}
            title="메신저 문구를 복사하고 카카오톡을 엽니다"
          >
            <span className="share-btn-icon">💬</span>
            {kakaoShared ? '복사됨! 카카오톡에 붙여넣기' : '카카오톡으로 보내기'}
          </button>
          <button
            className="share-btn share-btn--email"
            onClick={handleMailTo}
            disabled={isLoading || isEmpty}
            title="이메일 문구를 기본 메일 앱으로 보냅니다"
          >
            <span className="share-btn-icon">✉</span>
            이메일로 보내기
          </button>
        </div>
      </div>

      <SnsBar />
    </div>
  );
}
