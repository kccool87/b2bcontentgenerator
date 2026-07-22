import { useState, useRef } from 'react';

// Gemini 직접 호출은 /api/generate 서버로 위임.
// 브라우저 번들에 API 키가 포함되지 않음.

const TYPE_LABEL = {
  INSIGHT:   '인사이트',
  SOLUTION:  '솔루션',
  CHECKLIST: '체크리스트',
  CASE:      '고객사례',
  AX_TREND:  'AX트렌드',
};

// ── 폴백 메시지 — 단일 선택용 ─────────────────────────────────────
const FALLBACK_EMAIL = [
  (ctx) => `${ctx} 관련 내용을 검토하실 때 참고가 될 만한 자료를 공유드립니다. 살펴봐 주시면 감사하겠습니다.`,
  (ctx) => `${ctx} 상황에서 실질적으로 도움이 될 자료를 선별해 공유드립니다. 내부 검토 시 활용하시기 바랍니다.`,
  (ctx) => `${ctx} 관련하여 고객사에서 실제로 활용하신 사례와 정보를 담은 자료를 공유드립니다. 참고해 주시길 바랍니다.`,
  ()    => `의사결정에 도움이 되실 만한 자료를 공유드립니다. 필요하신 부분 참고해 주시길 바랍니다.`,
];

const FALLBACK_MESSENGER = [
  (ctx) => `${ctx} 관련해서 도움 될 것 같은 자료 공유드려요. 한번 봐주세요!`,
  (ctx) => `${ctx} 고민 중이시라면 이 자료 참고해 보세요. 도움이 되실 것 같아서요.`,
  (ctx) => `${ctx} 쪽으로 좋은 자료가 있어서 공유드려요.`,
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

// ── 폴백 메시지 — 다중 선택 전용 (상품명 없음) ────────────────────
const FALLBACK_MULTI_EMAIL = [
  () => `업무 환경 개선 및 운영 효율화에 참고가 되실 만한 자료들을 선별하여 공유드립니다. 함께 검토해 보시면 도움이 되실 것 같습니다.`,
  () => `솔루션 도입 검토에 도움이 될 만한 자료 묶음을 공유드립니다. 내부 검토 시 활용해 보시기 바랍니다.`,
  () => `다양한 비즈니스 환경 개선에 참고가 되실 만한 자료들을 골라 공유드립니다. 살펴봐 주시면 감사하겠습니다.`,
];
const FALLBACK_MULTI_MESSENGER = [
  () => `비즈니스 운영 개선에 도움 될 것 같은 자료 몇 가지 공유드려요. 편하게 살펴봐 주세요!`,
  () => `관련 자료 몇 가지 골라봤는데, 시간 되실 때 한번 훑어봐 주세요.`,
  () => `도움 될 것 같은 자료들 선별해서 공유드려요. 참고해 보세요.`,
];

function buildMultiFallback() {
  const ei = Math.floor(Math.random() * FALLBACK_MULTI_EMAIL.length);
  const mi = Math.floor(Math.random() * FALLBACK_MULTI_MESSENGER.length);
  return { email: FALLBACK_MULTI_EMAIL[ei](), messenger: FALLBACK_MULTI_MESSENGER[mi]() };
}

function getSharedProduct(contents) {
  if (contents.length <= 1) return null;
  const allSets = contents.map(c => new Set(c.products || []));
  for (const p of allSets[0]) {
    if (p && p.length >= 2 && allSets.every(s => s.has(p))) return p;
  }
  return null;
}

function hasProductLeak(parsed, contents, sharedProduct = null) {
  const names = [...new Set(contents.flatMap(c => c.products || []))]
    .filter(p => p && p.length >= 3 && p !== sharedProduct);
  if (names.length === 0) return false;
  const text = (parsed.email + ' ' + parsed.messenger).toLowerCase();
  return names.some(p => text.includes(p.toLowerCase()));
}

function buildFallback(contents, context) {
  const { selectedProducts = [], selectedIndustries = [], query = '' } = context;

  if (contents.length > 1) {
    const shared = getSharedProduct(contents);
    if (shared) {
      const ei = Math.floor(Math.random() * FALLBACK_EMAIL.length);
      const mi = Math.floor(Math.random() * FALLBACK_MESSENGER.length);
      return { email: FALLBACK_EMAIL[ei](shared), messenger: FALLBACK_MESSENGER[mi](shared) };
    }
    return buildMultiFallback();
  }

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

// ── 스트리밍 텍스트 파서 ──────────────────────────────────────────
// SSE 청크에서 조립된 원문 텍스트 → { email, messenger }
function parseStreamedText(text) {
  if (!text) return null;
  let s = text.replace(/```(?:json)?\n?/g, '').trim();
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

// ── 캐시 키 ─────────────────────────────────────────────────────
// 같은 콘텐츠 조합 + 같은 관계 단계 → 캐시 재사용
function buildCacheKey(contents, context) {
  const ids   = [...contents].map(c => c.id).sort().join(',');
  const stage = context?.relationshipStage ?? '초면';
  return `${ids}|${stage}`;
}

// ── 훅 ─────────────────────────────────────────────────────────────
export function useGemini() {
  const [message, setMessage]           = useState(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError]               = useState(null);
  const abortRef                        = useRef(null);
  const cacheRef                        = useRef(new Map()); // 세션 내 메모리 캐시

  async function generate(contents, context = {}) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 캐시 히트 — API 호출 없이 즉시 반환
    const cacheKey = buildCacheKey(contents, context);
    if (cacheRef.current.has(cacheKey)) {
      setMessage(cacheRef.current.get(cacheKey));
      setIsLoading(false);
      setStreamingText('');
      setError(null);
      return;
    }

    setIsLoading(true);
    setStreamingText('');
    setError(null);
    setMessage(null);

    const sharedProduct = contents.length > 1 ? getSharedProduct(contents) : null;

    try {
      const res = await fetch('/api/generate', {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contents, context }),
      });

      if (res.status === 429) {
        if (!controller.signal.aborted) {
          setMessage({
            email:       '요청이 많아 잠시 후 다시 시도해주세요.',
            messenger:   '요청이 많아 잠시 후 다시 시도해주세요.',
            rateLimited: true,
          });
        }
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // SSE 스트림 읽기
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let assembledText = '';
      let buffer        = '';

      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // 마지막 불완전 줄은 다음 청크로 넘김

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt  = JSON.parse(json);
            const text = evt?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (text) {
              assembledText += text;
              if (!controller.signal.aborted) setStreamingText(assembledText);
            }
          } catch {
            // 파싱 실패 청크는 무시
          }
        }
      }

      // 스트림 종료 → 조립된 텍스트 파싱
      if (!controller.signal.aborted) {
        const parsed = parseStreamedText(assembledText);

        let finalMsg;
        if (parsed?.email) {
          if (contents.length > 1 && hasProductLeak(parsed, contents, sharedProduct)) {
            finalMsg = buildMultiFallback();
          } else {
            // 성공적인 AI 응답만 캐싱
            cacheRef.current.set(cacheKey, parsed);
            finalMsg = parsed;
          }
        } else {
          finalMsg = buildFallback(contents, context);
        }

        setStreamingText('');
        setMessage(finalMsg);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setStreamingText('');
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
    setStreamingText('');
  }

  return { message, isLoading, streamingText, error, generate, reset };
}
