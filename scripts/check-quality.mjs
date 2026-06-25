import { contentData as CONTENT_DATA } from '../src/data/contentData.js';

const BAD_RE = /^[💡🎙📌✔🔍👉📢🎯⚡🌟✨❄🤝🎬⚠️🙋👥🔐🛡📍👁💻📹😭🤳🖼✦"#]/u;
const BAD_STARTS = ['하지만 ','이런 환경','이어 오는','그 대안으로','적용 대상은','이를 기념해','이를 위해','이를 통해'];

let bad = 0;
for (const c of CONTENT_DATA) {
  const t = (c.summary || '').trim();
  const badStart = BAD_STARTS.some(b => t.startsWith(b));
  const hasEventMisfire = t.includes('현장의 주요 발표 내용');
  const hasQuestionPattern = t.includes('에 관한 원인과 해결');
  const hasDoubleVerb = t.includes('다하는 내용');
  const hasBadCap = /LG유플러스가 [a-z][A-Z]/.test(t);

  let reason = '';
  if (!t || t.length < 30) reason = '너무 짧음';
  else if (t.length > 115) reason = '너무 긺';
  else if (BAD_RE.test(t)) reason = '이모지/특수 시작';
  else if (badStart) reason = '접속사 시작';
  else if (hasEventMisfire) reason = '이벤트 감지 오작동';
  else if (hasQuestionPattern) reason = '이유는에 패턴';
  else if (hasDoubleVerb) reason = '이중동사';
  else if (hasBadCap) reason = '대소문자 오류';

  if (reason) {
    bad++;
    console.log(`${c.id} [${reason}] ${t.slice(0, 75)}`);
  }
}
console.log(`\n잔여 문제: ${bad}개`);
