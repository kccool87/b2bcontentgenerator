import { useEffect, useRef } from 'react';

const NODE_COUNT     = 50;
const TRACER_COUNT   = 3;
const TRAVEL_SPEED   = 0.06;  // 프레임당 이동 — 약 0.27초에 노드 하나 통과
const TRAIL_FADE     = 0.025; // 꼬리 페이드 속도
const TRAIL_ALPHA    = 0.55;  // 꼬리 초기 알파

function brand(alpha) {
  return `rgba(132,79,249,${alpha.toFixed(3)})`;
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

    // 배경 떠다니는 노드
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
    }));

    function randNode(exclude = -1) {
      let n;
      do { n = Math.floor(Math.random() * NODE_COUNT); } while (n === exclude);
      return n;
    }

    // 3개 트레이서 — 각각 노드 사이를 빠르게 이동
    const tracers = Array.from({ length: TRACER_COUNT }, (_, k) => ({
      from:     randNode(),
      to:       randNode(),
      progress: k / TRACER_COUNT, // 위상 분산
      trail:    [],               // [{ fromX, fromY, toX, toY, alpha }]
    }));

    function frame() {
      ctx.clearRect(0, 0, w, h);

      // 노드 이동
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0)  { n.x = 0; n.vx *= -1; }
        if (n.x > w)  { n.x = w; n.vx *= -1; }
        if (n.y < 0)  { n.y = 0; n.vy *= -1; }
        if (n.y > h)  { n.y = h; n.vy *= -1; }
      }

      // 배경 노드 점
      ctx.fillStyle = brand(0.35);
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 트레이서 업데이트 & 렌더
      for (const t of tracers) {
        const fa = nodes[t.from];
        const fb = nodes[t.to];

        // 진행
        t.progress += TRAVEL_SPEED;

        if (t.progress >= 1) {
          // 도착 — 꼬리에 완성된 선분 추가
          t.trail.push({ fromX: fa.x, fromY: fa.y, toX: fb.x, toY: fb.y, alpha: TRAIL_ALPHA });
          t.from     = t.to;
          t.to       = randNode(t.from);
          t.progress = 0;
        }

        // 꼬리 페이드 & 렌더
        for (let i = t.trail.length - 1; i >= 0; i--) {
          const s = t.trail[i];
          s.alpha -= TRAIL_FADE;
          if (s.alpha <= 0) { t.trail.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.moveTo(s.fromX, s.fromY);
          ctx.lineTo(s.toX,   s.toY);
          ctx.strokeStyle = brand(s.alpha);
          ctx.lineWidth   = 1.2;
          ctx.stroke();
        }

        // 현재 이동 중인 선 (헤드 → 목표 방향으로 성장)
        const p  = t.progress;
        const cx = fa.x + (fb.x - fa.x) * p;
        const cy = fa.y + (fb.y - fa.y) * p;

        ctx.beginPath();
        ctx.moveTo(fa.x, fa.y);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = brand(0.8);
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        // 헤드 글로우 점
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = brand(1);
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
