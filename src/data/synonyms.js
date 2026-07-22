// 동의어 그룹 정의
// 같은 배열 안의 단어들은 검색 시 서로 대체 가능하게 취급됩니다.
// 모든 값은 소문자 · 공백 없음 (normalize 후와 동일하게 작성).
// 임베딩 기반 시맨틱 검색으로 교체할 때 이 파일만 삭제하면 됩니다.

export const SYNONYM_GROUPS = [
  // AI 고객센터 / 콜봇 계열
  ['aicc', 'ai콜센터', '콜봇', 'agentic', 'agentic콜봇', 'ai상담', 'ai비즈콜'],

  // 기업 인터넷전화 (센트릭스 / U+AI전화)
  ['인터넷전화', '센트릭스', 'u+ai전화', 'voip', '기업전화', 'ai전화'],

  // AI CCTV / 지능형 CCTV
  ['지능형cctv', 'aicctv', '스마트cctv', 'ai카메라', '지능형카메라'],

  // 차량 관제 / DTG (U+커넥트)
  ['차량관제', 'dtg', '차량추적', '운행관리', 'u+커넥트'],

  // 재택 · 원격근무
  ['재택근무', '원격근무', '재택', 'wfh'],

  // AlphaKey / 패스워드리스 인증
  ['alphakey', '알파키', '패스워드리스', 'fido', '생체인증'],

  // U+웍스 / 그룹웨어 · 협업
  ['u+웍스', '웍스', '기업메신저', '그룹웨어', '협업툴', '전자결재'],

  // 와이파이 (U+와이파이 / U+프리미엄와이파이)
  ['와이파이', 'wifi', '무선인터넷', '무선랜', 'u+와이파이'],

  // 모바일 인터넷 (U+모바일인터넷)
  ['모바일인터넷', 'lte인터넷', '5g인터넷', 'u+모바일인터넷'],

  // DX / 디지털 전환
  ['dx', '디지털전환', '디지털혁신', 'it전환'],

  // 스마트팩토리 / 제조 자동화
  ['스마트팩토리', '제조자동화', '공장자동화', '스마트공장'],
];

// 빠른 조회를 위한 내부 Map (token → group 전체 배열)
const _map = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    _map.set(term, group);
  }
}

/**
 * 토큰의 동의어 그룹을 반환합니다.
 * 동의어가 없으면 토큰 자체만 담은 배열을 반환합니다.
 * @param {string} token - normalize() 적용된 소문자 단일 토큰
 * @returns {string[]}
 */
export function getExpanded(token) {
  return _map.get(token) ?? [token];
}
