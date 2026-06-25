import { useState, useRef } from 'react';

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ── 폴백 메시지 ────────────────────────────────────────────────────
const FALLBACK_SINGLE = [
  (ctx) => `${ctx} 때문에 고민 많으셨죠? 실제로 도움 됐다는 사례 위주로 골라봤습니다.`,
  (ctx) => `보다가 ${ctx} 상황에 딱 맞을 것 같아서 바로 공유드려요. 가볍게 한번 보세요.`,
  (ctx) => `${ctx} 검토하실 때 이 자료가 꽤 실질적인 힌트가 될 것 같습니다.`,
  (ctx) => `${ctx} 관련해서 현장에서 실제 쓰이는 내용을 담은 자료를 찾았습니다. 참고해 보세요.`,
  (ctx) => `요즘 ${ctx} 쪽으로 움직임이 많더라고요. 흐름 파악에 도움 될 자료 같아 전달드립니다.`,
  (ctx) => `${ctx}, 아직 결정 전이시라면 이 자료 먼저 보시고 판단하시는 게 좋을 것 같습니다.`,
];

const FALLBACK_MIXED = [
  () => `여러 관점에서 비교하실 수 있도록 관련 자료를 골라봤어요. 필요한 부분만 골라 보셔도 충분합니다.`,
  () => `의사결정 전에 한번 훑어보시면 좋을 자료들입니다. 궁금한 점 생기시면 바로 말씀해 주세요.`,
  () => `검토 단계에서 실제로 유용했다고 알려진 자료들 위주로 담았습니다. 부담 없이 봐주세요.`,
  () => `각각 다른 각도에서 도움이 될 것 같아 함께 공유드립니다. 마음에 드는 내용 있으시면 알려주세요.`,
];

const FALLBACK_AX_TREND = [
  () => `요즘 업계에서 조용히 속도 붙고 있는 흐름인데, 한번 훑어보시면 방향 잡는 데 도움이 될 것 같습니다.`,
  () => `전략 고민하실 때 이런 트렌드 먼저 파악하시면 훨씬 수월하더라고요. 참고용으로 공유드립니다.`,
  () => `요즘 제일 많이 언급되는 기술 흐름인데, 모르고 지나치기엔 아까운 내용입니다.`,
  () => `시장이 어디로 가고 있는지 감 잡기 좋은 자료들입니다. 가볍게 훑어보세요.`,
];

const FALLBACK_AX_MIXED = [
  () => `트렌드 흐름도 짚고, 실질적인 도입 힌트도 함께 담아봤습니다. 두 가지 다 유용하실 거예요.`,
  () => `시장 방향성과 실무 활용 포인트를 같이 보실 수 있는 자료입니다. 참고해 보세요.`,
  () => `업계 변화 흐름을 보면서 도입 방향도 같이 검토하실 수 있도록 구성했습니다.`,
];

const STYLE_VARIANTS = [
  {
    tone: '문제를 먼저 공감해주는 톤',
    opener: '고객이 겪는 불편이나 고민을 한 줄로 짚어준 뒤, 이 자료가 해결 실마리가 될 수 있다는 방향으로 작성',
  },
  {
    tone: '우연히 발견해 바로 공유하는 가벼운 톤',
    opener: '영업사원이 자료를 보다가 고객 상황에 딱 맞을 것 같아 바로 전달하는 자연스러운 느낌으로 작성',
  },
  {
    tone: '실무 포인트를 콕 짚는 톤',
    opener: '실제 도입 사례나 수치·효과 포인트를 간단히 언급하며 실질적인 참고 자료임을 전달하는 방향으로 작성',
  },
  {
    tone: '트렌드 인사이트를 나누는 동료 같은 톤',
    opener: '요즘 업계에서 화두가 되는 흐름을 짧게 언급하고, 그 맥락에서 이 자료가 유익할 것이라는 방향으로 작성',
  },
  {
    tone: '담백하고 여백 있는 톤',
    opener: '과장 없이 "이런 자료가 있었는데, 참고하시면 좋을 것 같아요" 정도의 가볍고 진정성 있는 느낌으로 작성',
  },
  {
    tone: '질문으로 시작하는 호기심 유발 톤',
    opener: '고객이 공감할 만한 짧은 질문으로 시작해 자료를 자연스럽게 이어서 소개하는 방향으로 작성',
  },
];

function buildFallback(contents, context) {
  const { selectedProducts = [], selectedIndustries = [], query = '' } = context;

  const hasAxTrend   = contents.some(c => c.type === 'AX_TREND');
  const isAllAxTrend = hasAxTrend && contents.every(c => c.type === 'AX_TREND');
  const isMixed      = selectedProducts.length > 1 || selectedIndustries.length > 1
    || (selectedProducts.length >= 1 && selectedIndustries.length >= 1);

  if (isAllAxTrend) {
    const fn = FALLBACK_AX_TREND[Math.floor(Math.random() * FALLBACK_AX_TREND.length)];
    return fn();
  }

  if (hasAxTrend) {
    const fn = FALLBACK_AX_MIXED[Math.floor(Math.random() * FALLBACK_AX_MIXED.length)];
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

// ── 훅 ─────────────────────────────────────────────────────────
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

    const { query = '', selectedProducts = [], selectedIndustries = [] } = context;

    // 콘텐츠 타입 분석
    const hasAxTrend   = contents.some(c => c.type === 'AX_TREND');
    const isAllAxTrend = hasAxTrend && contents.every(c => c.type === 'AX_TREND');
    const hasSolution  = contents.some(c => c.type !== 'AX_TREND');
    const isMixed      = selectedProducts.length > 1 || selectedIndustries.length > 1
      || (selectedProducts.length >= 1 && selectedIndustries.length >= 1);
    const singleCtx    = selectedProducts[0] || selectedIndustries[0] || query.split(' ')[0] || '';
    const style        = STYLE_VARIANTS[Math.floor(Math.random() * STYLE_VARIANTS.length)];

    const contextLine = [
      query && `검색어: ${query}`,
      selectedProducts.length  > 0 && `관련 상품: ${selectedProducts.join(', ')}`,
      selectedIndustries.length > 0 && `관련 업종: ${selectedIndustries.join(', ')}`,
    ].filter(Boolean).join(' / ');

    const contentList = contents.map((c) => `- [${c.type}] ${c.summary}`).join('\n');

    // 콘텐츠 성격에 맞는 목적 가이드
    let purposeGuide;
    if (isAllAxTrend) {
      purposeGuide = `이 콘텐츠들은 특정 솔루션 도입이 아닌, AI·디지털전환 등 업계 전반의 기술 트렌드와 새로운 기술 인사이트를 담고 있습니다.
고객이 비즈니스 트렌드를 파악하고 앞으로의 방향성을 고민하는 데 유익한 정보를 나눈다는 목적으로 작성하세요.
솔루션 도입이나 구매 유도 뉘앙스는 절대 포함하지 마세요.`;
    } else if (hasAxTrend && hasSolution) {
      purposeGuide = `이 콘텐츠들은 업계 트렌드 인사이트와 솔루션 도입 관련 자료가 함께 포함되어 있습니다.
시장 흐름 파악에 도움이 되는 정보와 도입 검토에 실질적으로 참고할 수 있는 자료를 함께 제공한다는 방향으로 작성하세요.`;
    } else if (isMixed) {
      purposeGuide = `여러 솔루션·업종이 섞여 있으므로, 고객이 다양한 관점을 참고해 의사결정을 내리는 데 실질적인 도움을 주고 싶다는 마음을 담아 작성하세요.`;
    } else {
      purposeGuide = `${singleCtx ? `${singleCtx} ` : ''}관련 고객에게, 고민하실 때 진짜 도움이 될 정보를 나눠드리고 싶다는 진정성 있는 마음으로 작성하세요.`;
    }

    const userPrompt = `B2B 영업사원이 고객에게 콘텐츠를 공유할 때 앞에 붙이는 짧은 메시지를 작성해주세요.

콘텐츠 목적: ${purposeGuide}

【이번 문구 스타일】
톤: ${style.tone}
작성 방식: ${style.opener}

${contextLine ? `고객 상황: ${contextLine}\n` : ''}공유 콘텐츠 요약:
${contentList}

반드시 지켜야 할 규칙:
- 인사말(안녕하세요·수고하세요 등) 절대 사용 금지
- 콘텐츠 제목·링크를 그대로 인용하지 말 것 (제목·링크는 메시지 아래에 따로 첨부됨)
- 영업적 과장이나 딱딱한 홍보 문구 금지
- 고객에게 진정성 있게 유용한 정보를 나눈다는 느낌
- 편안하고 자연스러운 말투 (격식 있되 부담 없게, 반말 금지)
- 2~3문장, 100자 이내`;

    try {
      const res = await fetch(`${API_URL}?key=${apiKey}`, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: '당신은 B2B 영업사원이 고객에게 콘텐츠를 공유할 때 앞에 붙이는 짧은 메시지를 만드는 전문 카피라이터입니다. 매번 완전히 다른 구조와 표현으로 문구를 생성해야 합니다. 문제 공감형, 우연 발견형, 실무 포인트형, 트렌드 인사이트형, 질문형 등 다양한 방식 중 하나를 선택해 작성하세요. 형식적인 인사말, 과장된 홍보 표현, 판에 박힌 시작("안녕하세요", "이번에", "도움이") 은 피하세요. 100자 이내, 자연스러운 한국어로 작성합니다.',
            }],
          },
          contents:         [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 1.0, topP: 0.95, maxOutputTokens: 220 },
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
