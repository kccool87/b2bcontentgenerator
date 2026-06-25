/**
 * 이모지·라벨로 시작하는 요약에서 앞부분 제거
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../src/data/contentData.js');

const BAD_IDS = ['c099','c117','c129','c154','c188','c190','c192','c193','c194','c195',
  'c197','c198','c200','c204','c211','c213','c223','c229','c230','c232',
  'c234','c235','c239','c241','c248','c249','c250','c253','c256','c261','c262','c263'];

function cleanSummary(raw) {
  // HTML 엔티티
  let s = raw
    .replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/&#\d+;/g, '');

  // 이모지 + 선택적 라벨 + 콜론 패턴 제거 (예: "💬 팀장의 고민 : ")
  s = s.replace(/^[\s\S]{0,3}[^가-힣a-zA-Z0-9]{0,3}[^:：\n]{0,20}[:：]\s*/u, '');

  // 남은 이모지 제거 (앞에 이모지만 있는 경우)
  s = s.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]+[️]?\s*/gu, '');

  // 특수 기호들
  s = s.replace(/^[👉👁🛡🔐📍🔍🗣️📩📹🖼💻]+[\u{FE0F}]?\s*/gu, '');

  // 파이프 문자로 시작하는 경우 (c094, c095 형태: "| 제목")
  s = s.replace(/^\|\s*/, '');

  return s.trim();
}

let src = fs.readFileSync(DATA_FILE, 'utf-8');
let fixed = 0;

for (const id of BAD_IDS) {
  // summary 값 추출
  const pat = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?summary:\\s*')((?:[^'\\\\]|\\\\.)*)'`);
  const m = src.match(pat);
  if (!m) { console.log('NOT FOUND:', id); continue; }

  const rawVal  = m[2];                            // 이스케이프된 원래 값
  const decoded = rawVal.replace(/\\'/g, "'");     // JS 이스케이프 해제

  const cleaned = cleanSummary(decoded);

  if (cleaned === decoded || cleaned.length < 20) {
    console.log('SKIP:', id, '|', decoded.slice(0, 50));
    continue;
  }

  const escaped = cleaned.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  src = src.replace(`summary: '${rawVal}'`, `summary: '${escaped}'`);
  console.log('✅', id, '|', cleaned.slice(0, 65));
  fixed++;
}

fs.writeFileSync(DATA_FILE, src, 'utf-8');
console.log('\n완료:', fixed, '개 수정');
