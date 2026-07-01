import { useState, useRef } from 'react';

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const TYPE_LABEL = {
  INSIGHT:   '인사이트',
  SOLUTION:  '솔루션',
  CHECKLIST: '체크리스트',
  CASE:      '고객사례',
  AX_TREND:  'AX트렌드',
};

// ── 시스템 프롬프트 ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a B2B sales assistant for LG U+ Enterprise.

Your job is to write two short, natural messages that a sales rep can send to a business customer to introduce selected blog content — one for email, one for messenger (KakaoTalk/SMS).

---

## OUTPUT FORMAT

Return ONLY a raw JSON object. No markdown. No code blocks. No explanation.

{"email": "이메일용 문구", "messenger": "메신저용 문구"}

**email** rules:
- 2~3문장. 합쇼체 (~드립니다, ~드려요, ~드리겠습니다).
- 정중하고 격식 있는 문체. 정보 밀도 높게.
- 고객이 바빠도 읽을 만한 간결한 비즈니스 문어체.

**messenger** rules:
- 1~2문장. 해요체 (~해요, ~어요, ~드려요).
- 자연스럽고 부담 없는 구어체. 짧고 가볍게.
- 갑을 관계이므로 친구처럼 말하지 않되, 딱딱하지 않은 톤.
- 이메일보다 15~30자 짧게.

---

## RULES BY CATEGORY

### 단일 카테고리

**인사이트**
- Open with a pain point or situation the customer might relate to
- Introduce the content as something that addresses that situation
- Do NOT mention specific product names or features
- DO lead with empathy, keep product references out

**솔루션**
- Introduce the content as a clear, easy-to-understand overview of the product
- Mention what the content covers (features, pricing, etc.) in neutral terms
- Do NOT use superlatives or exaggerated claims ("최고", "압도적" etc.)
- DO convey clarity and credibility

**체크리스트**
- Frame the content as a self-diagnostic tool the customer can use on their own
- Suggest it as a helpful reference, not a sales push
- Do NOT imply "you should buy this"
- DO use the nuance of "this might help you think it through"

**고객사례**
- Reference the customer's industry or situation if known; otherwise use general framing
- Highlight that this is a real case with real outcomes
- Do NOT exaggerate figures; only use what's in the content
- DO emphasize "similar situation, real result"

**AX트렌드**
- Open with the trend topic as a light conversation starter
- Keep it informational, low-pressure
- Do NOT directly connect to a product pitch
- DO keep tone casual and curious

---

### 복합 카테고리 (2개 이상 선택 시)

| 조합 | 흐름 | 문구 전략 |
|---|---|---|
| 인사이트 + 솔루션 | 문제 인식 → 상품 소개 | 고민을 언급한 뒤 솔루션으로 자연스럽게 연결 |
| 인사이트 + 체크리스트 | 문제 인식 → 자가진단 | 상황 공감 후 스스로 점검해볼 것을 제안 |
| 솔루션 + 고객사례 | 상품 소개 + 신뢰 보강 | 기능 자료와 실제 사례를 함께 보내는 구성 |
| 인사이트 + 솔루션 + 고객사례 | 풀 퍼널 | 고민→해결책→실제 사례까지 한 흐름으로 묶기 |
| AX트렌드 + 인사이트 | 업계 흐름 + 공감 | 트렌드로 대화 열고 페인포인트로 연결 |
| 체크리스트 + 고객사례 | 설득 패키지 | 윗선 설득용 자료임을 자연스럽게 언급 |

---

## ABSOLUTE PROHIBITIONS

- 과장 표현 금지: 최고, 압도적, 혁신적, 놀라운 등
- 직접 구매/도입 유도 금지: "지금 바로 도입하세요", "구매 문의 주세요" 등
- 마크다운 금지
- 인사말(안녕하세요·수고하세요 등) 절대 사용 금지 — 인사말은 별도로 앞에 붙임
- 콘텐츠 제목·링크를 그대로 인용하지 말 것
- 영어 단어 혼용 최소화 (상품명 제외)

---

## EXAMPLES

**[인사이트 단독]**
{"email": "재택근무가 확산되면서 보안 위협에 대한 우려가 높아지고 있어, 중소기업 담당자분들이 실제로 겪고 계신 상황을 정리한 자료를 공유드립니다. 한번 살펴보시면 도움이 되실 것 같습니다.", "messenger": "재택근무 보안, 요즘 많이 걱정되시죠? 현장 사례 중심으로 정리된 자료가 있어 공유드려요."}

**[솔루션 단독]**
{"email": "기능과 요금 구성을 한눈에 파악하실 수 있도록 정리된 자료를 공유드립니다. 검토하실 때 참고가 되시길 바랍니다.", "messenger": "상품 구성과 요금을 한눈에 볼 수 있는 자료가 있어서 공유드려요. 참고해 보세요."}

**[체크리스트 단독]**
{"email": "통신 환경 개선을 검토 중이시라면, 먼저 현황을 점검해보실 수 있는 자가진단 자료를 공유드립니다. 내부 검토 시 활용하시기 좋을 것 같습니다.", "messenger": "혹시 통신 환경 개선 고민 중이세요? 간단히 현황 점검해볼 수 있는 자료 공유드려요."}

**[복합: 인사이트 + 솔루션]**
{"email": "무인 매장 운영 중 보안이나 돌발 상황 관리에 어려움을 겪고 계신다면, 관련 고민을 짚은 인사이트 자료와 솔루션 소개 내용을 함께 공유드립니다. 두 가지 같이 살펴보시면 도움이 되실 것 같습니다.", "messenger": "무인 매장 보안 고민되신다면, 관련 인사이트랑 솔루션 자료 같이 보내드려요. 참고해 보세요."}

---

Now generate both messages based on the input.`;

// ── JSON 파싱 (코드블록 등 제거) ────────────────────────────────────
function parseGeminiJSON(raw) {
  let s = raw.replace(/```(?:json)?\n?/g, '').trim();
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  try {
    const parsed = JSON.parse(s);
    return {
      email:     (parsed.email     || '').trim(),
      messenger: (parsed.messenger || '').trim(),
    };
  } catch {
    return null;
  }
}

// ── 폴백 메시지 ────────────────────────────────────────────────────
const FALLBACK_EMAIL = [
  (ctx) => `${ctx} 관련 내용을 검토하실 때 참고가 될 만한 자료를 공유드립니다. 살펴봐 주시면 감사하겠습니다.`,
  (ctx) => `${ctx} 상황에서 실질적으로 도움이 될 자료를 선별해 공유드립니다. 내부 검토 시 활용하시기 바랍니다.`,
  (ctx) => `${ctx} 관련하여 고객사에서 실제로 활용하신 사례와 정보를 담은 자료를 공유드립니다. 참고해 주시길 바랍니다.`,
  ()    => `의사결정에 도움이 되실 만한 자료들을 골라 공유드립니다. 필요하신 부분 참고해 주시길 바랍니다.`,
];

const FALLBACK_MESSENGER = [
  (ctx) => `${ctx} 관련해서 도움 될 것 같은 자료 공유드려요. 한번 봐주세요!`,
  (ctx) => `${ctx} 고민 중이시라면 이 자료 참고해 보세요. 도움이 되실 것 같아서요.`,
  (ctx) => `${ctx} 쪽으로 요즘 좋은 자료가 있어서 바로 공유드려요.`,
  ()    => `관련 자료 골라봤는데, 부담 없이 한번 살펴봐 주세요!`,
];

const FALLBACK_AX_EMAIL = [
  () => `업계에서 주목받고 있는 기술 트렌드를 정리한 자료를 공유드립니다. 비즈니스 방향 수립에 참고가 되시길 바랍니다.`,
  () => `최근 빠르게 변화하는 업계 흐름을 한눈에 파악하실 수 있도록 관련 자료를 공유드립니다.`,
];

const FALLBACK_AX_MESSENGER = [
  () => `요즘 업계에서 많이 얘기되는 트렌드 자료 공유드려요. 가볍게 한번 봐주세요.`,
  () => `최근 핫한 기술 흐름 정리한 자료 있어서 공유드려요!`,
];

function buildFallback(contents, context) {
  const { selectedProducts = [], selectedIndustries = [], query = '' } = context;
  const hasAxTrend   = contents.some(c => c.type === 'AX_TREND');
  const isAllAxTrend = hasAxTrend && contents.every(c => c.type === 'AX_TREND');

  if (isAllAxTrend) {
    const e = FALLBACK_AX_EMAIL[Math.floor(Math.random() * FALLBACK_AX_EMAIL.length)]();
    const m = FALLBACK_AX_MESSENGER[Math.floor(Math.random() * FALLBACK_AX_MESSENGER.length)]();
    return { email: e, messenger: m };
  }

  const ctx = selectedProducts[0] || selectedIndustries[0] || query.split(' ')[0] || '솔루션';
  const ei  = Math.floor(Math.random() * FALLBACK_EMAIL.length);
  const mi  = Math.floor(Math.random() * FALLBACK_MESSENGER.length);
  return {
    email:     FALLBACK_EMAIL[ei](ctx),
    messenger: FALLBACK_MESSENGER[mi](ctx),
  };
}

// ── 훅 ─────────────────────────────────────────────────────────────
export function useGemini() {
  const [message, setMessage]     = useState(null);  // { email, messenger } | null
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);
  const abortRef                  = useRef(null);

  async function generate(contents, context = {}) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 900));
      if (!controller.signal.aborted) {
        setMessage(buildFallback(contents, context));
        setIsLoading(false);
      }
      return;
    }

    const categories   = [...new Set(contents.map(c => TYPE_LABEL[c.type] ?? c.type))].join(', ');
    const contentLines = contents.length === 1
      ? `제목: ${contents[0].title}\n요약: ${contents[0].summary}`
      : contents.map((c, i) => `제목 ${i + 1}: ${c.title}\n요약 ${i + 1}: ${c.summary}`).join('\n');

    const userPrompt = `카테고리: ${categories}\n${contentLines}`;

    try {
      const res = await fetch(`${API_URL}?key=${apiKey}`, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents:           [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig:   { temperature: 0.95, topP: 0.95, maxOutputTokens: 400 },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      }

      const data   = await res.json();
      const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = parseGeminiJSON(raw);

      if (!controller.signal.aborted) {
        setMessage(parsed ?? buildFallback(contents, context));
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setMessage(buildFallback(contents, context));
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }

  function reset() {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setMessage(null);
    setError(null);
    setIsLoading(false);
  }

  return { message, isLoading, error, generate, reset };
}
