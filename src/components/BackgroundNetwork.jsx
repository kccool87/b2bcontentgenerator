import { useEffect, useRef } from 'react';

const NODE_COUNT = 50;
const MAX_CONN   = 30;    // 동시 활성 연결 수
const FADE_IN    = 0.018; // 연결선 나타나는 속도
const FADE_OUT   = 0.012; // 연결선 사라지는 속도
const MAX_ALPHA  = 0.38;  // 최대 불투명도
const LIFE_MIN   = 90;    // 연결 유지 최소 프레임
const LIFE_MAX   = 220;   // 연결 유지 최대 프레임
const NODE_SPEED = 0.65;  // 노드 이동 속도

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

    // 노드 — 더 빠른 속도
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * NODE_SPEED * 2,
      vy: (Math.random() - 0.5) * NODE_SPEED * 2,
    }));

    // 연결 풀 — { i, j, alpha, life, dying }
    const conns = [];

    function spawnConn() {
      // 이미 연결된 쌍 중복 방지
      const existing = new Set(conns.map(c => `${c.i}-${c.j}`));
      for (let attempt = 0; attempt < 10; attempt++) {
        let i = randInt(0, NODE_COUNT - 1);
        let j = randInt(0, NODE_COUNT - 1);
        if (i === j) continue;
        if (i > j) [i, j] = [j, i];
        if (existing.has(`${i}-${j}`)) continue;
        conns.push({ i, j, alpha: 0, life: randInt(LIFE_MIN, LIFE_MAX), dying: false });
        return;
      }
    }

    // 초기 연결 미리 채우기
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
