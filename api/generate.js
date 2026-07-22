// api/generate.js — Vercel Serverless Function
// Proxies Gemini API calls so GEMINI_API_KEY never reaches the browser.

import { Redis } from '@upstash/redis';

// ── Rate limiting (Upstash Redis) ────────────────────────────────────────
// Skip if env vars are absent (local dev without vercel dev).
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const RATE_PER_MIN  = 10;
const RATE_PER_HOUR = 60;

async function checkRateLimit(ip) {
  if (!redis) return true;
  const now     = Date.now();
  const minKey  = `rl:${ip}:m:${Math.floor(now / 60_000)}`;
  const hourKey = `rl:${ip}:h:${Math.floor(now / 3_600_000)}`;
  try {
    const results = await redis
      .pipeline()
      .incr(minKey)
      .expire(minKey, 120)
      .incr(hourKey)
      .expire(hourKey, 7200)
      .exec();
    const minCnt  = results[0];
    const hourCnt = results[2];
    return minCnt <= RATE_PER_MIN && hourCnt <= RATE_PER_HOUR;
  } catch {
    return true; // Redis 장애 시 허용
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

## CRITICAL RULE — MULTIPLE CONTENT SELECTION

When the input contains 2+ content items, this rule OVERRIDES ALL OTHER RULES.

**EXCEPTION — When \`공통 상품\` appears in the prompt:**
If the input includes a line \`공통 상품: [상품명]\`, ALL selected items are about that SAME product. In this case you SHOULD mention [상품명] naturally in the messages. Frame it as "[상품명] 관련 자료" or "[상품명] 중심으로 구성된 자료 묶음" etc. All other rules still apply (no exaggeration, no greetings, no purchase push, no title repetition). The restrictions below apply ONLY when \`공통 상품\` is NOT in the prompt.

### What you must NEVER do when NO \`공통 상품\` is given (❌):
- Focus the message on any single item while ignoring others
- Name any specific product, solution, or service (e.g. "AI비즈콜", "U+모바일인터넷", "IoT", "클라우드" etc.)
- Write separate sentences for each item — the output must be ONE unified message
- Let any single item dominate the tone or topic

### What you must do (✅):
- Write ONE broad message treating ALL items as a single curated package
- Use only abstract, inclusive framing:
  "다양한 비즈니스 환경 개선에 참고가 되실 만한 자료들을"
  "솔루션 검토에 도움이 될 자료들을 선별하여"
  "여러 관점에서 살펴보실 수 있도록 관련 자료들을"
  "업무 효율과 운영 환경 개선에 도움이 될 자료 묶음을"
- Extract only the THEME (e.g. productivity, cost, security, operations) from the summaries — never the product name
- The titles and product names are shown separately to the customer. You must NOT repeat them.

### Why: The titles are already visible to the customer. Your job is ONLY to provide the warm intro copy that frames the package — not to describe individual items.

### CRITICAL ADDITION — No inference allowed:
Even if you can guess or infer what specific products are being shared (e.g. "콜센터+DX = AICC", "차량+위치 = 커넥트"), you are STRICTLY FORBIDDEN from using that inferred product name. Your output must be equally valid for ANY set of B2B solutions. Write as if you have NO IDEA what the specific products are — because your job is only to frame the curated package thematically.

## ABSOLUTE PROHIBITIONS

- 과장 표현 금지: 최고, 압도적, 혁신적, 놀라운 등
- 직접 구매/도입 유도 금지: "지금 바로 도입하세요", "구매 문의 주세요" 등
- 마크다운 금지
- 인사말(안녕하세요·수고하세요 등) 절대 사용 금지 — 인사말은 별도로 앞에 붙임
- 상품명·솔루션명을 문구 안에 직접 언급하지 말 것 (제목과 URL에 이미 포함됨)
- 영어 단어 혼용 최소화 (상품명 제외)
- 다수 선택 시: 요약(summary)에 등장하는 고유명사(상품명, 서비스명)도 문구에 사용 금지

---

## CRITICAL: 제목 재사용 절대 금지

제목은 고객이 이미 별도로 보고 있습니다.
이메일·메신저 문구는 제목을 바꿔 말하거나 요약하는 것이 아니라, **완전히 다른 각도**에서 공유 이유·맥락·가치를 전달해야 합니다.

### ❌ 절대 하면 안 되는 패턴 (제목 재탕):
- 제목이 "AI 콜센터 도입 효과 사례"이면 → "AI 콜센터 도입 효과를 정리한 사례 자료를 공유드립니다" ← 금지
- 제목이 "재택근무 시대 이어폰 활용법"이면 → "재택근무 시대에 이어폰을 활용하는 방법을 담은 자료입니다" ← 금지
- 제목 단어를 그대로 쓰거나 순서만 바꾸는 것 모두 금지

### ✅ 올바른 방향 (새로운 맥락·가치 제공):
- 고객이 처한 상황이나 고민을 먼저 환기
- 그 자료를 보면 얻을 수 있는 인사이트·결과를 원본 표현 없이 새 문장으로 작성
- 제목을 읽지 않아도 문구만으로 "왜 이 자료가 나에게 필요한가"가 전달돼야 함

예시:
- 제목: "AI 콜센터 도입 효과 사례" → ✅ "고객 응대 효율화를 고민하시는 분들께 실제 운영 현장에서의 성과를 담은 자료를 공유드립니다."
- 제목: "재택근무 시대 이어폰 활용법" → ✅ "원격 근무 환경에서 통화·회의 품질을 높이는 실용적인 방법을 정리한 자료를 공유드립니다."

---

## EXAMPLES

**[인사이트 단독]**
{"email": "재택근무가 확산되면서 보안 위협에 대한 우려가 높아지고 있어, 중소기업 담당자분들이 실제로 겪고 계신 상황을 정리한 자료를 공유드립니다. 한번 살펴보시면 도움이 되실 것 같습니다.", "messenger": "재택근무 보안, 요즘 많이 걱정되시죠? 현장 사례 중심으로 정리된 자료가 있어 공유드려요."}

**[솔루션 단독]**
{"email": "기능과 요금 구성을 한눈에 파악하실 수 있도록 정리된 자료를 공유드립니다. 검토하실 때 참고가 되시길 바랍니다.", "messenger": "상품 구성과 요금을 한눈에 볼 수 있는 자료가 있어서 공유드려요. 참고해 보세요."}

**[체크리스트 단독]**
{"email": "통신 환경 개선을 검토 중이시라면, 먼저 현황을 점검해보실 수 있는 자가진단 자료를 공유드립니다. 내부 검토 시 활용하시기 좋을 것 같습니다.", "messenger": "혹시 통신 환경 개선 고민 중이세요? 간단히 현황 점검해볼 수 있는 자료 공유드려요."}

**[복합: 인사이트 + 솔루션 (같은 주제)]**
{"email": "업무 운영 효율화와 관련하여 현장에서 자주 겪는 고민을 짚은 자료와 구체적인 솔루션 소개 내용을 함께 공유드립니다. 두 자료를 함께 살펴보시면 검토에 도움이 되실 것 같습니다.", "messenger": "운영 효율 관련해서 인사이트 자료랑 솔루션 소개 자료 같이 공유드려요. 참고해 보세요."}

**[다수 선택 — 서로 다른 상품/카테고리 (핵심 예시)]**
Input: 솔루션 A 요약 + 인사이트 B 요약 (전혀 다른 주제)
{"email": "업무 환경 개선 및 운영 효율화에 참고가 되실 만한 자료들을 선별하여 공유드립니다. 함께 검토해 보시면 도움이 되실 것 같습니다.", "messenger": "비즈니스 운영 환경 개선에 도움 될 것 같은 자료 몇 가지 공유드려요. 편하게 살펴봐 주세요."}

---

Now generate both messages based on the input.`;

// ── 프롬프트 조립 ─────────────────────────────────────────────────────
const TYPE_LABEL = {
  INSIGHT:   '인사이트',
  SOLUTION:  '솔루션',
  CHECKLIST: '체크리스트',
  CASE:      '고객사례',
  AX_TREND:  'AX트렌드',
};

function getSharedProduct(contents) {
  if (contents.length <= 1) return null;
  const allSets = contents.map(c => new Set(c.products || []));
  for (const p of allSets[0]) {
    if (p && p.length >= 2 && allSets.every(s => s.has(p))) return p;
  }
  return null;
}

function buildUserPrompt(contents) {
  const categories    = [...new Set(contents.map(c => TYPE_LABEL[c.type] ?? c.type))].join(', ');
  const sharedProduct = contents.length > 1 ? getSharedProduct(contents) : null;

  let contentLines;
  if (contents.length === 1) {
    contentLines = `제목: ${contents[0].title}\n요약: ${contents[0].summary}`;
  } else {
    contentLines = contents
      .map((c, i) => {
        const cat      = TYPE_LABEL[c.type] ?? c.type;
        const concerns = c.concerns?.length   ? `관심사: ${c.concerns.join(', ')}`  : '';
        const inds     = c.industries?.length  ? `업종: ${c.industries.join(', ')}` : '';
        const stage    = c.stage               ? `단계: ${c.stage}`                  : '';
        const parts    = [`[${cat}]`, concerns, inds, stage].filter(Boolean);
        return `콘텐츠 ${i + 1}: ${parts.join(' / ')}`;
      })
      .join('\n');
  }

  const productNote = sharedProduct
    ? `\n공통 상품: ${sharedProduct} (이 상품명을 문구에 자연스럽게 언급하세요)`
    : '';
  return `카테고리: ${categories}\n선택 수: ${contents.length}개${productNote}\n\n${contentLines}`;
}

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

// ── 핸들러 ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // IP 추출 (Vercel은 x-forwarded-for 헤더로 실제 IP 전달)
  const ip =
    (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  // Rate limit 확인
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ error: '잠시 후 다시 시도해주세요' });
  }

  // 요청 바디 검증
  const { contents } = req.body ?? {};
  if (!Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ error: 'contents is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfigured: GEMINI_API_KEY not set' });
  }

  const userPrompt = buildUserPrompt(contents);

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents:           [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig:   { temperature: 0.95, topP: 0.95, maxOutputTokens: 400 },
      }),
    });

    if (!geminiRes.ok) {
      const body = await geminiRes.json().catch(() => ({}));
      return res.status(502).json({ error: body.error?.message ?? `Gemini ${geminiRes.status}` });
    }

    const data   = await geminiRes.json();
    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = parseGeminiJSON(raw);

    if (!parsed) {
      return res.status(502).json({ error: 'Failed to parse Gemini response' });
    }
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
