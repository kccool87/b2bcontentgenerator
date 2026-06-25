/**
 * 활용TIP 일괄 생성 — 일반 placeholder 항목 대상
 * Gemini 없이 타입 + 제목 키워드 기반으로 의미 있는 팁 생성
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = path.resolve(__dirname, '../src/data/contentData.js');
const GENERIC    = '관련 업무에 참고가 될 콘텐츠입니다.';

// ── 타입별 팁 템플릿 (3개 변형) ─────────────────────────────────────
const TYPE_TIPS = {
  INSIGHT: [
    '업계 현황을 먼저 공유하며 신뢰를 쌓는 자료로 활용하세요. 구매 압박 없이 정보만 제공하면 고객이 먼저 대화를 엽니다.',
    '미팅 전 사전 공유 자료로 활용해 보세요. 관련 트렌드를 함께 논의하며 자연스럽게 솔루션 필요성을 인식시킬 수 있습니다.',
    '영업 초반 아이스브레이킹 자료로 효과적입니다. 정보를 먼저 드리는 방식으로 접근하면 다음 미팅 기회를 자연스럽게 만들 수 있습니다.',
  ],
  SOLUTION: [
    '고객의 현재 업무 고민을 먼저 확인한 뒤, 이 자료로 도입 후 달라지는 부분을 구체적으로 보여주세요.',
    '경쟁 솔루션을 검토 중인 고객에게 LG유플러스만의 차별점을 설명하는 자료로 활용해 보세요.',
    '도입을 고민하는 고객에게 운영 효율과 비용 절감 효과를 수치로 설명할 때 함께 제시하세요.',
  ],
  CHECKLIST: [
    '고객과 함께 체크리스트를 살펴보며 현재 운영 방식의 빈틈을 짚어 드리세요. 필요성을 스스로 인식하게 돕는 데 효과적입니다.',
    '방문 전 미리 공유하고, 체크 결과를 바탕으로 솔루션 도입 우선순위를 함께 정리해 보세요.',
    '고객사 현황 점검 목적으로 함께 작성하면 자연스럽게 개선 포인트와 솔루션을 연결할 수 있습니다.',
  ],
  CASE: [
    '비슷한 업종·규모의 실제 도입 사례로 고객의 불안을 해소하고 의사결정에 확신을 드릴 수 있습니다.',
    '내부 보고서를 작성 중인 고객에게 참고 사례로 제공하면 의사결정 속도를 높이는 데 효과적입니다.',
    '도입 효과에 확신이 없는 고객에게 ROI와 실제 성과를 직접적으로 보여줄 수 있는 자료입니다.',
  ],
  AX_TREND: [
    'AI·DX 트렌드에 관심 있는 고객에게 먼저 인사이트를 제공해 대화를 열고, 이후 솔루션 논의로 자연스럽게 이어가세요.',
    '디지털 전환을 고민 중인 C레벨 고객과의 대화 소재로 활용해 보세요. 트렌드를 공유하며 파트너십을 제안하는 계기가 됩니다.',
    '정기적으로 공유하면 정보 제공자로서의 포지셔닝이 강화됩니다. 트렌드 리포트를 먼저 전달하는 영업사원으로 기억되세요.',
  ],
};

// ── 제목 키워드 기반 특화 팁 ─────────────────────────────────────────
const KEYWORD_TIPS = [
  { keys: ['고객센터','콜센터','aicc','agentic'],
    tip: '콜센터 운영 효율화를 고민하는 고객에게 AI 상담 자동화의 실제 효과를 설명하는 자료로 활용하세요.' },
  { keys: ['cctv','영상','보안카메라'],
    tip: 'CCTV 도입을 검토 중인 고객에게 영상 분석 AI와 연계한 보안 고도화 방안을 제시하는 자료로 활용하세요.' },
  { keys: ['보안','sase','제로트러스트','alphakey','알파키','암호'],
    tip: '보안 솔루션 검토 단계의 고객에게 실제 위협 사례와 함께 제시하면 도입 필요성을 직관적으로 전달할 수 있습니다.' },
  { keys: ['재택','원격','하이브리드','모바일인터넷'],
    tip: '외근·재택 근무 비중이 높은 고객사에 업무 연속성 확보 방안으로 제안해 보세요.' },
  { keys: ['차량','운행','버스','운수','fleet'],
    tip: '차량을 다수 운영하는 고객사에 안전 관리와 운행 비용 절감 방안을 함께 제시하는 자료로 활용하세요.' },
  { keys: ['키오스크','오더','포스','매장','무인'],
    tip: '매장 운영 효율화와 인건비 절감을 고민하는 소상공인·프랜차이즈 고객에게 효과적으로 제안할 수 있습니다.' },
  { keys: ['와이파이','wifi','인터넷전화','센트릭스','전화'],
    tip: '사무실 통신 인프라 개선을 논의하는 고객에게 업무 효율 향상 사례와 함께 제시해 보세요.' },
  { keys: ['aidc','데이터센터','idc','클라우드'],
    tip: 'IT 인프라 현대화를 검토 중인 CTO·IT 담당자에게 안정성과 비용 효율을 중심으로 제안하는 자료로 활용하세요.' },
  { keys: ['학교','교육','슈퍼스쿨','에듀'],
    tip: '교육 기관 담당자와의 미팅에서 디지털 교육 환경 구축 사례로 활용해 보세요.' },
  { keys: ['스마트팜','농업','스마트빌딩','iot'],
    tip: '스마트 운영 환경 구축을 고민하는 고객에게 IoT·통신 기반 자동화 사례로 제안하세요.' },
  { keys: ['팝업','행사','이벤트','임시'],
    tip: '단기 현장 통신 솔루션이 필요한 행사·팝업 담당자에게 빠른 구축 사례로 제안하세요.' },
  { keys: ['뉴스레터','뉴스클리핑','주간','월간'],
    tip: '정기적으로 공유하면 신뢰도 높은 정보 제공자로 인식됩니다. 매주·매월 발송 자료로 활용해 보세요.' },
  { keys: ['ai','llm','gpt','생성형'],
    tip: 'AI 도입을 검토 중인 고객과의 기술 대화에서 구체적인 활용 사례를 공유하는 자료로 활용하세요.' },
];

function generateTip(id, title, type) {
  const lower = title.toLowerCase();

  // 키워드 매칭 (우선순위 높음)
  for (const { keys, tip } of KEYWORD_TIPS) {
    if (keys.some(k => lower.includes(k))) return tip;
  }

  // 타입별 변형 선택 (ID 기반 결정적 분산)
  const num  = parseInt(id.replace('c', '')) || 0;
  const pool = TYPE_TIPS[type] ?? TYPE_TIPS['INSIGHT'];
  return pool[num % pool.length];
}

// ── 파일 업데이트 ─────────────────────────────────────────────────────
let src     = fs.readFileSync(DATA_FILE, 'utf-8');
let updated = 0;
let kept    = 0;

// 각 항목에서 id, title, type, recommendReason 추출 후 치환
src = src.replace(
  /id:\s*'(c\d+)',([\s\S]*?)title:\s*'([^']*)',([\s\S]*?)type:\s*'([^']*)',([\s\S]*?)recommendReason:\s*'([^']*)'/g,
  (match, id, g2, title, g4, type, g6, currentTip) => {
    if (currentTip !== GENERIC) { kept++; return match; }
    const tip = generateTip(id, title, type).replace(/'/g, "\\'");
    updated++;
    return match.replace(`recommendReason: '${currentTip}'`, `recommendReason: '${tip}'`);
  }
);

fs.writeFileSync(DATA_FILE, src, 'utf-8');
console.log(`✅ 완료: 업데이트 ${updated}개 | 기존 유지 ${kept}개`);
