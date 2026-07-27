/**
 * c331-c345 플레이스홀더 메타데이터 → 실제 데이터로 교체
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'src', 'data', 'contentData.js');

const REPLACEMENTS = {
  c331: {
    summary: 'AI CCTV는 연기·불꽃을 실시간으로 감지해 창고 화재를 초기에 포착하고 즉각 알림을 발송합니다. 기존 일반 CCTV는 녹화·확인 기능에 그치지만, AI 기반 스마트 CCTV는 사람 없이도 24시간 이상 상황을 탐지해 물류창고 화재 피해를 최소화합니다.',
    products: ['AI CCTV'],
    industries: ['물류', '제조'],
    concerns: ['안전', '화재예방', '운영효율'],
    stage: '초기관심',
    recommendReason: '창고·물류시설 안전 담당자에게 AI CCTV 도입 필요성을 공감시킬 때 첫 미팅 자료로 활용하세요.',
  },
  c332: {
    summary: '무인매장에 CCTV가 설치돼 있어도 도난이 반복되는 구조적 이유를 분석하고, AI CCTV의 이상 행동 실시간 감지 기능으로 예방하는 방법을 소개합니다. 사람 없이 24시간 매장을 모니터링하고 의심 상황에 즉각 알림을 보내 도난 피해를 줄이는 실질적인 방안을 안내합니다.',
    products: ['AI CCTV'],
    industries: ['무인매장', '소매'],
    concerns: ['안전', '도난방지', '운영효율'],
    stage: '초기관심',
    recommendReason: '무인매장·편의점 운영 고객의 도난 고민에 공감대를 형성하고 AI CCTV 필요성을 자연스럽게 제안할 때 활용하세요.',
  },
  c333: {
    summary: '유선전화 중심 사무실 환경에서 발생하는 전화 전달 지연과 업무 중단 문제를 클라우드 기업 인터넷전화로 해결하는 방법을 안내합니다. 외근·재택 환경에서도 회사 번호로 수발신이 가능하고 전화 돌리기 없이 부서 간 연결이 자동화되는 스마트 업무환경 구축 방안을 소개합니다.',
    products: ['센트릭스'],
    industries: ['중소기업', '스타트업'],
    concerns: ['업무효율', '비용절감'],
    stage: '초기관심',
    recommendReason: '전화 업무로 불편함을 겪는 중소기업·스타트업 담당자와 첫 미팅 후 공감 자료로 자연스럽게 공유하세요.',
  },
  c334: {
    summary: '다수의 전세버스를 운영할 때 실시간 위치 확인과 운행 기록 관리를 디지털 차량 관제 솔루션으로 자동화하는 방법을 소개합니다. 수기 관리에서 벗어나 GPS 기반 관제로 차량별 현황을 한눈에 파악하고 운수업 운영 효율을 높이는 전략을 안내합니다.',
    products: ['U+커넥트', 'DTG'],
    industries: ['운수/버스'],
    concerns: ['운영효율', '안전', '비용절감'],
    stage: '초기관심',
    recommendReason: '전세버스·운수업체 담당자에게 차량 관제 솔루션의 필요성을 처음 제안할 때 활용하세요.',
  },
  c335: {
    summary: 'U+웍스 자동결재선 기능으로 기존에 수동으로 설정하던 결재 프로세스를 자동화하는 방법을 안내합니다. 반복적인 결재선 세팅 작업을 없애고 조직 구조에 맞는 결재 흐름을 자동 적용해 업무 속도와 효율을 높이는 구체적인 설정 방법을 소개합니다.',
    products: ['U+웍스'],
    industries: ['중소기업', '제조'],
    concerns: ['업무효율', 'DX'],
    stage: '검토',
    recommendReason: '결재 프로세스 자동화를 고민하는 기업 담당자에게 U+웍스의 구체적인 기능을 보여주는 솔루션 자료로 활용하세요.',
  },
  c336: {
    summary: 'LG유플러스가 OpenAI 기술을 결합한 Agentic 콜봇으로 고객센터 AI를 고도화한 내용을 소개합니다. 단순 질의응답을 넘어 스스로 판단하고 후속 업무까지 처리하는 Agentic AI의 차별화된 기능과 고객 응대 혁신 효과를 안내합니다.',
    products: ['AICC'],
    industries: ['콜센터', '서비스업'],
    concerns: ['고객경험', '운영효율', 'DX'],
    stage: '검토',
    recommendReason: '기존 AI 상담 시스템 고도화를 검토 중인 고객센터 담당자에게 Agentic 콜봇의 차별점을 설명할 때 활용하세요.',
  },
  c337: {
    summary: '매장에 AI CCTV를 도입하기 전에 점검해야 할 핵심 항목을 설치 환경, 기능 요건, 운영 방식별로 체크리스트 형태로 정리했습니다. 매장 유형별 최적 스마트 CCTV 선택 기준과 도입 시 놓치기 쉬운 주의사항을 단계별로 안내합니다.',
    products: ['AI CCTV'],
    industries: ['소매', '무인매장', '프랜차이즈'],
    concerns: ['안전', '도난방지'],
    stage: '검토',
    recommendReason: '매장 CCTV 도입을 검토 중인 고객이 내부적으로 요건을 정리할 때 자가진단 자료로 제공하면 효과적입니다.',
  },
  c338: {
    summary: '지자체 시설공단이 홈페이지 정보를 자동 학습해 상담 지식을 실시간으로 갱신하는 AICC Agentic 콜봇을 도입한 사례를 소개합니다. 수동 업데이트 없이도 최신 정보로 고객 응대가 가능해져 운영 효율과 서비스 품질을 동시에 개선한 공공기관의 AI 콜센터 전환 성과를 담고 있습니다.',
    products: ['AICC'],
    industries: ['공공기관'],
    concerns: ['고객경험', '운영효율'],
    stage: '제안',
    recommendReason: '공공기관 또는 정보 업데이트가 잦은 조직에 AI 콜센터 도입을 제안할 때 실제 성과 사례로 활용하세요.',
  },
  c339: {
    summary: '매장 관리자가 자리를 비워도 AI CCTV가 이상 상황을 실시간으로 감지하고 즉각 알림을 전송해 안심하고 운영할 수 있는 실제 사례를 소개합니다. 스마트 CCTV 도입으로 인력 없이도 매장 보안과 운영 효율을 동시에 높인 현장 경험을 담고 있습니다.',
    products: ['AI CCTV'],
    industries: ['소매', '무인매장'],
    concerns: ['안전', '도난방지', '운영효율'],
    stage: '제안',
    recommendReason: '매장 보안 강화를 고민하는 소매·무인매장 고객에게 실제 도입 효과를 보여주는 사례 자료로 활용하세요.',
  },
  c340: {
    summary: '제조사 H사가 AICC Agentic 콜봇 도입 후 상담 인력을 33% 감축하면서도 고객 응대 속도와 품질을 높인 구체적인 성과를 소개합니다. AI 콜센터 도입으로 운영 비용을 절감하고 서비스 수준을 동시에 개선한 제조업 현장의 실제 사례입니다.',
    products: ['AICC'],
    industries: ['제조'],
    concerns: ['운영효율', '비용절감', '인력관리'],
    stage: '내부설득',
    recommendReason: 'AI 콜센터 도입에 대한 경영진 설득이 필요한 고객에게 구체적 비용절감 ROI 자료로 제공하세요.',
  },
  c341: {
    summary: '유선 인터넷 설치가 어려운 주유소와 공공시설이 U+모바일인터넷을 도입해 안정적인 업무 환경을 구축한 사례를 소개합니다. 이동이 잦거나 고정 회선이 불가한 현장에서 모바일 인터넷이 실질적인 업무 연속성과 결제 시스템 안정성을 보장한 경험을 담고 있습니다.',
    products: ['U+모바일인터넷'],
    industries: ['공공기관', '서비스업'],
    concerns: ['안정성', '업무효율'],
    stage: '제안',
    recommendReason: '유선 인터넷 설치가 어려운 현장 업종 고객에게 모바일 인터넷의 실질적 효과를 보여주는 사례로 활용하세요.',
  },
  c342: {
    summary: '비즈니스캔버스 김우진 대표가 AlphaKey 도입 후 패스워드 없는 인증으로 보안을 강화하면서도 업무 속도가 빨라진 경험을 인터뷰 형식으로 소개합니다. IT 스타트업 현장에서 보안과 업무 효율을 동시에 개선한 AlphaKey의 실제 사용 후기를 담고 있습니다.',
    products: ['AlphaKey'],
    industries: ['IT/테크', '스타트업'],
    concerns: ['보안', '업무효율'],
    stage: '제안',
    recommendReason: 'IT·스타트업 업계 보안 담당자나 경영진에게 AlphaKey의 실질적 업무 효과를 전달할 때 활용하세요.',
  },
  c343: {
    summary: 'AI 서비스 확장으로 데이터센터 전력 수요가 급증하면서 빅테크 기업들이 전력 인프라 확보 경쟁에 뛰어든 배경과 현황을 분석합니다. AI 시대의 핵심 인프라인 전력과 데이터센터의 연결 고리를 이해하고 기업의 디지털 인프라 전략에 참고할 수 있는 업계 트렌드를 소개합니다.',
    products: ['IDC'],
    industries: ['IT/테크'],
    concerns: ['DX'],
    stage: '초기관심',
    recommendReason: 'AI·DX 트렌드에 관심 있는 IT 관련 고객과의 대화에서 업계 흐름을 공유하는 가벼운 트렌드 자료로 활용하세요.',
  },
  c344: {
    summary: '엑셀로 수동 관리하던 법인 차량 운행 기록을 디지털 차량 관리 솔루션으로 자동화해 법인세 신고 전 준비 부담을 줄이는 방법을 안내합니다. 차량별 운행 데이터를 자동 집계·정리해 회계 처리 시간을 단축하고 오류를 줄이는 실용적인 활용 팁을 소개합니다.',
    products: ['U+커넥트', 'DTG'],
    industries: ['운수/버스', '제조'],
    concerns: ['업무효율', '비용절감'],
    stage: '초기관심',
    recommendReason: '법인 차량을 다수 운영하며 운행 기록 관리에 어려움을 겪는 기업 담당자에게 시의성 있는 트렌드 자료로 공유하세요.',
  },
  c345: {
    summary: '겨울철 차량 관리에서 놓치기 쉬운 배터리·타이어·냉각수 등 핵심 안전 점검 항목과 디지털 차량 관제 솔루션을 활용한 체계적 관리 방법을 안내합니다. 기온 저하로 급증하는 차량 고장과 사고 위험을 관제 데이터로 예방하는 실질적인 겨울철 운영 전략을 소개합니다.',
    products: ['U+커넥트', 'DTG'],
    industries: ['운수/버스'],
    concerns: ['안전', '운영효율'],
    stage: '초기관심',
    recommendReason: '겨울철 차량 안전 관리를 앞두고 차량 관제 솔루션 도입을 검토하는 운수업체 담당자에게 시의성 있게 활용하세요.',
  },
};

let src = fs.readFileSync(FILE, 'utf8');

for (const [id, meta] of Object.entries(REPLACEMENTS)) {
  const productsStr = meta.products.map(p => `'${p}'`).join(', ');
  const industriesStr = meta.industries.map(i => `'${i}'`).join(', ');
  const concernsStr = meta.concerns.map(c => `'${c}'`).join(', ');

  // summary 교체
  src = src.replace(
    new RegExp(`(id: '${id}',[\\s\\S]*?summary: ')[^']*('[,])`),
    `$1${meta.summary}$2`
  );

  // products 교체
  src = src.replace(
    new RegExp(`(id: '${id}'[\\s\\S]*?products: )\\[[^\\]]*\\]`),
    `$1[${productsStr}]`
  );

  // industries 교체
  src = src.replace(
    new RegExp(`(id: '${id}'[\\s\\S]*?industries: )\\[[^\\]]*\\]`),
    `$1[${industriesStr}]`
  );

  // concerns 교체
  src = src.replace(
    new RegExp(`(id: '${id}'[\\s\\S]*?concerns: )\\[[^\\]]*\\]`),
    `$1[${concernsStr}]`
  );

  // stage 교체
  src = src.replace(
    new RegExp(`(id: '${id}'[\\s\\S]*?stage: ')[^']*(')`),
    `$1${meta.stage}$2`
  );

  // recommendReason 교체
  src = src.replace(
    new RegExp(`(id: '${id}'[\\s\\S]*?recommendReason: ')[^']*(')`),
    `$1${meta.recommendReason}$2`
  );

  console.log(`✓ ${id} 메타데이터 교체 완료`);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n모든 메타데이터 교체 완료');
