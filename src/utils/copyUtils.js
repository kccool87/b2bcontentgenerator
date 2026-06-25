const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

function num(i) {
  return NUMS[i] ?? String(i + 1);
}

export function formatEmailCopy(contents) {
  const body = contents
    .map(
      (item, i) =>
        `${num(i)} ${item.title}\n- ${item.summary}\n${item.url}`
    )
    .join('\n\n');

  return `고객님께 참고가 될 만한 U+ Enterprise 콘텐츠를 함께 공유드립니다.\n\n${body}\n\n필요하시면 관련 상품 상담도 함께 도와드리겠습니다.`;
}

export function formatKakaoTopy(contents) {
  const body = contents
    .map((item, i) => `${num(i)} ${item.title}\n${item.url}`)
    .join('\n\n');

  return `📌 U+ Enterprise 추천 콘텐츠\n\n${body}`;
}

export function formatTitleUrlOnly(contents) {
  return contents
    .map((item, i) => `${num(i)} ${item.title}\n${item.url}`)
    .join('\n\n');
}

export async function copyToClipboard(text) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }

  const ta = document.createElement('textarea');
  ta.value = text;
  Object.assign(ta.style, { position: 'fixed', opacity: '0' });
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}
