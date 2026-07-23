import { useEffect, useRef } from 'react';

const NODE_COUNT = 50;
const MAX_CONN   = 20;    // 동시 활성 연결 수
const MIN_DIST   = 80;    // 너무 짧은 연결 제외 (px)
const MAX_DIST   = 420;   // 너무 먼 연결 제외 (px)
const FADE_IN    = 0.014; // 연결선 나타나는 속도
const FADE_OUT   = 0.009; // 연결선 사라지는 속도
const MAX_ALPHA  = 0.4;   // 최대 불투명도
const LIFE_MIN   = 160;   // 연결 유지 최소 프레임 — 더 안정적
const LIFE_MAX   = 320;   // 연결 유지 최대 프레임
const NODE_SPEED = 0.18;  // 노드 속도 낮춤 — 선 흔들림 방지

function brand(alpha) {
  return `rgba(132,79,249,${alpha.toFixed(3)})`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function BackgroundNetwork() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let w, h, raf;

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * NODE_SPEED,
      vy: (Math.random() - 0.5) * NODE_SPEED,
    }));

    // 연결 풀 — { i, j, alpha, life, dying }
    const conns = [];

    function spawnConn() {
      // dying 포함 모든 활성 연결을 중복 체크 — 더블링 방지
      const existing = new Set(conns.map(c => `${c.i}-${c.j}`));
      for (let attempt = 0; attempt < 30; attempt++) {
        let i = randInt(0, NODE_COUNT - 1);
        let j = randInt(0, NODE_COUNT - 1);
        if (i === j) continue;
        if (i > j) [i, j] = [j, i];
        if (existing.has(`${i}-${j}`)) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MIN_DIST || d > MAX_DIST) continue;
        conns.push({ i, j, alpha: 0, life: randInt(LIFE_MIN, LIFE_MAX), dying: false });
        return;
      }
    }

    // 초기 연결 채우기
    for (let k = 0; k < MAX_CONN; k++) spawnConn();

    function frame() {
      ctx.clearRect(0, 0, w, h);

      // 노드 이동
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0)  { n.x = 0; n.vx *= -1; }
        if (n.x > w)  { n.x = w; n.vx *= -1; }
        if (n.y < 0)  { n.y = 0; n.vy *= -1; }
        if (n.y > h)  { n.y = h; n.vy *= -1; }
      }

      // 연결 업데이트 & 렌더
      for (let k = conns.length - 1; k >= 0; k--) {
        const c = conns[k];

        if (c.dying) {
          c.alpha -= FADE_OUT;
          if (c.alpha <= 0) { conns.splice(k, 1); continue; }
        } else {
          c.alpha = Math.min(c.alpha + FADE_IN, MAX_ALPHA);
          c.life--;
          if (c.life <= 0) c.dying = true;
        }

        const a = nodes[c.i], b = nodes[c.j];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = brand(c.alpha);
        ctx.lineWidth   = 0.9;
        ctx.stroke();
      }

      // 빈 슬롯 채우기
      while (conns.length < MAX_CONN) spawnConn();

      // 노드 점
      ctx.fillStyle = brand(0.45);
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        width:         '100%',
        height:        '100%',
        zIndex:        0,
        pointerEvents: 'none',
        display:       'block',
      }}
    />
  );
}
