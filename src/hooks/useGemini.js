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

Your job is to write a short, natural message that a sales rep can send to a business customer via KakaoTalk or SMS to introduce selected blog content.

---

## INPUT YOU WILL RECEIVE

- Selected content category (one or more): 인사이트 / 솔루션 / 체크리스트 / 고객사례 / AX트렌드
- Content title
- Content summary (1–3 sentences)

---

## OUTPUT FORMAT

Write exactly 2–3 sentences in Korean.
Structure: [공감 or 상황 언급] → [콘텐츠 한 줄 소개] → [CTA]
Tone: Polite but conversational. Use 합쇼체 (e.g. ~드립니다, ~드려요).
No markdown. No bullet points. Plain text only.

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

Read the combination as a single narrative arc and write one cohesive message.
Use the following logic:

| 조합 | 흐름 | 문구 전략 |
|---|---|---|
| 인사이트 + 솔루션 | 문제 인식 → 상품 소개 | 고민을 언급한 뒤 솔루션으로 자연스럽게 연결 |
| 인사이트 + 체크리스트 | 문제 인식 → 자가진단 | 상황 공감 후 스스로 점검해볼 것을 제안 |
| 솔루션 + 고객사례 | 상품 소개 + 신뢰 보강 | 기능 자료와 실제 사례를 함께 보내는 구성 |
| 인사이트 + 솔루션 + 고객사례 | 풀 퍼널 | 고민→해결책→실제 사례까지 한 흐름으로 묶기 |
| AX트렌드 + 인사이트 | 업계 흐름 + 공감 | 트렌드로 대화 열고 페인포인트로 연결 |
| 체크리스트 + 고객사례 | 설득 패키지 | 윗선 설득용 자료임을 자연스럽게 언급 |

For combinations not listed above, identify the dominant intent and apply the closest matching logic.

---

## ABSOLUTE PROHIBITIONS

- 과장 표현 금지: 최고, 압도적, 혁신적, 놀라운 등
- 직접 구매/도입 유도 금지: "지금 바로 도입하세요", "구매 문의 주세요" 등
- 마크다운 금지: 별표, 번호 목록, 헤더 등 사용 금지
- 3문장 초과 금지
- 영어 단어 혼용 최소화 (상품명 제외)
- 인사말(안녕하세요·수고하세요 등) 절대 사용 금지
- 콘텐츠 제목·링크를 그대로 인용하지 말 것 (제목·링크는 메시지 아래에 따로 첨부됨)

---

## EXAMPLES

**[인사이트 단독]**
입력: 카테고리=인사이트 / 제목=재택근무 확산으로 달라진 중소기업 보안 현실
출력: 재택근무가 늘면서 보안 사고 걱정이 커지고 있는 요즘, 중소기업 담당자분들이 실제로 겪고 계신 상황을 정리한 글이 있어서 공유드립니다. 한번 살펴보시면 도움이 되실 것 같습니다.

**[솔루션 단독]**
입력: 카테고리=솔루션 / 제목=U+기업인터넷 요금제 완전 정리
출력: U+기업인터넷의 기능과 요금제를 한눈에 보실 수 있도록 정리한 자료를 공유드립니다. 검토하실 때 참고가 되시길 바랍니다.

**[체크리스트 단독]**
입력: 카테고리=체크리스트 / 제목=우리 회사 통신 환경, 지금 괜찮을까? 자가진단 체크리스트
출력: 통신 환경 개선을 고민 중이시라면, 먼저 이 체크리스트로 현황을 점검해보시는 것도 좋을 것 같아서 공유드려요. 부담 없이 살펴봐 주세요.

**[고객사례 단독]**
입력: 카테고리=고객사례 / 제목=물류 스타트업 A사, 지능형 CCTV 도입 후 달라진 점
출력: 물류 업종에서 지능형 CCTV를 실제로 도입하신 고객사 사례를 공유드립니다. 비슷한 환경에 계신다면 참고가 되실 것 같습니다.

**[AX트렌드 단독]**
입력: 카테고리=AX트렌드 / 제목=2025년 중소기업이 주목해야 할 AI 도입 트렌드
출력: 요즘 중소기업 사이에서도 AI 도입 이야기가 많이 나오고 있는데, 관련 트렌드를 정리한 글이 있어서 가볍게 공유드립니다.

**[복합: 인사이트 + 솔루션]**
입력: 카테고리=인사이트, 솔루션 / 제목들=매장 무인화의 그늘 / 지능형CCTV 상품 소개
출력: 무인 매장 운영하시면서 보안이나 돌발 상황 관리가 걱정되신다면, 관련 고민을 다룬 글과 저희 솔루션 소개 자료를 함께 공유드립니다. 두 가지 같이 보시면 도움이 되실 것 같습니다.

**[복합: 체크리스트 + 고객사례]**
입력: 카테고리=체크리스트, 고객사례 / 제목들=VoIP 도입 전 꼭 확인할 것들 / 제조업 B사 센트릭스 도입 사례
출력: VoIP 도입을 검토 중이시라면, 자가진단 체크리스트와 실제 도입 사례를 함께 공유드립니다. 내부 검토나 윗분 설득하실 때 참고 자료로 활용하시기 좋을 것 같습니다.

---

Now generate the message based on the input provided.`;

// ── 폴백 메시지 ────────────────────────────────────────────────────
const FALLBACK_SINGLE = [
  (ctx) => `${ctx} 때문에 고민 많으셨죠? 실제로 도움 됐다는 사례 위주로 골라봤습니다.`,
  (ctx) => `${ctx} 상황에 딱 맞을 것 같아서 바로 공유드려요. 가볍게 한번 보세요.`,
  (ctx) => `${ctx} 검토하실 때 이 자료가 꽤 실질적인 힌트가 될 것 같습니다.`,
  (ctx) => `${ctx} 관련해서 현장에서 실제 쓰이는 내용을 담은 자료를 찾았습니다. 참고해 보세요.`,
  (ctx) => `요즘 ${ctx} 쪽으로 움직임이 많더라고요. 흐름 파악에 도움 될 자료 같아 전달드립니다.`,
];

const FALLBACK_MIXED = [
  () => `여러 관점에서 비교하실 수 있도록 관련 자료를 골라봤어요. 필요한 부분만 골라 보셔도 충분합니다.`,
  () => `의사결정 전에 한번 훑어보시면 좋을 자료들입니다. 궁금한 점 생기시면 바로 말씀해 주세요.`,
  () => `검토 단계에서 실제로 유용했다고 알려진 자료들 위주로 담았습니다. 부담 없이 봐주세요.`,
];

const FALLBACK_AX_TREND = [
  () => `요즘 업계에서 조용히 속도 붙고 있는 흐름인데, 한번 훑어보시면 방향 잡는 데 도움이 될 것 같습니다.`,
  () => `전략 고민하실 때 이런 트렌드 먼저 파악하시면 훨씬 수월하더라고요. 참고용으로 공유드립니다.`,
  () => `요즘 제일 많이 언급되는 기술 흐름인데, 모르고 지나치기엔 아까운 내용입니다.`,
];

function buildFallback(contents, context) {
  const { selectedProducts = [], selectedIndustries = [], query = '' } = context;
  const hasAxTrend   = contents.some(c => c.type === 'AX_TREND');
  const isAllAxTrend = hasAxTrend && contents.every(c => c.type === 'AX_TREND');
  const isMixed      = contents.length > 1 || selectedProducts.length > 1 || selectedIndustries.length > 1;

  if (isAllAxTrend) {
    const fn = FALLBACK_AX_TREND[Math.floor(Math.random() * FALLBACK_AX_TREND.length)];
    return fn();
  }
  if (isMixed) {
    const fn = FALLBACK_MIXED[Math.floor(Math.random() * FALLBACK_MIXED.length)];
    return fn();
  }
  const ctx = selectedProducts[0] || selectedIndustries[0] || query.split(' ')[0] || '솔루션';
  const fn  = FALLBACK_SINGLE[Math.floor(Math.random() * FALLBACK_SINGLE.length)];
  return fn(ctx);
}

// ── 훅 ─────────────────────────────────────────────────────────────
export function useGemini() {
  const [message, setMessage]     = useState(null);
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

    // 카테고리 목록 (중복 제거)
    const categories = [...new Set(contents.map(c => TYPE_LABEL[c.type] ?? c.type))].join(', ');

    // 콘텐츠 목록 (제목 + 요약)
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
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents:         [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 1.0, topP: 0.95, maxOutputTokens: 300 },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!controller.signal.aborted) {
        setMessage(text.trim() || buildFallback(contents, context));
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setMessage(buildFallback(contents, context));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
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
