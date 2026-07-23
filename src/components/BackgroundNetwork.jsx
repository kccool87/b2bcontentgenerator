import { useEffect, useRef } from 'react';

const NODE_COUNT   = 45;
const TRACER_COUNT = 3;
const SPEED        = 0.01;   // 느린 우아한 이동 — 약 1.7초에 노드 하나
const TAIL_LEN     = 70;     // 꼬리 길이 (프레임 수)
const NODE_SPEED   = 0.18;   // 배경 노드 부유 속도

// ease-in-out — 시작/끝에서 부드럽게 감속
function ease(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

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

    // 배경 노드
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * NODE_SPEED,
      vy: (Math.random() - 0.5) * NODE_SPEED,
    }));

    function randNode(exclude = -1) {
      let n;
      do { n = Math.floor(Math.random() * NODE_COUNT); } while (n === exclude);
      return n;
    }

    // 트레이서 — 실제 x,y 히스토리 버퍼로 끊김 없는 꼬리 구현
    const tracers = Array.from({ length: TRACER_COUNT }, (_, k) => {
      const from = randNode();
      const { x, y } = nodes[from];
      return {
        from,
        to:       randNode(from),
        progress: (k / TRACER_COUNT), // 3개 위상 분산
        history:  Array.from({ length: TAIL_LEN }, () => ({ x, y })),
      };
    });

    function frame() {
      ctx.clearRect(0, 0, w, h);

      // 노드 부유
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > w) { n.x = w; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > h) { n.y = h; n.vy *= -1; }
      }

      // 배경 노드 점
      ctx.fillStyle = brand(0.28);
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 트레이서
      for (const t of tracers) {
        // 이동 진행
        t.progress += SPEED;
        if (t.progress >= 1) {
          t.from     = t.to;
          t.to       = randNode(t.from);
          t.progress = 0;
        }

        // ease 적용한 현재 헤드 위치
        const p  = ease(t.progress);
        const fa = nodes[t.from], fb = nodes[t.to];
        const hx = fa.x + (fb.x - fa.x) * p;
        const hy = fa.y + (fb.y - fa.y) * p;

        // 히스토리 업데이트 (shift + push)
        t.history.shift();
        t.history.push({ x: hx, y: hy });

        // 꼬리 렌더 — 세그먼트별 알파로 자연스러운 페이드
        const len = t.history.length;
        for (let i = 1; i < len; i++) {
          const ratio = i / len;            // 0(꼬리) → 1(헤드)
          const alpha = ratio * ratio * 0.55; // 헤드 쪽으로 급격히 밝아짐
          const prev  = t.history[i - 1];
          const curr  = t.history[i];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = brand(alpha);
          ctx.lineWidth   = 0.9 + ratio * 0.6; // 헤드로 갈수록 약간 두껍게
          ctx.stroke();
        }

        // 헤드 글로우
        ctx.beginPath();
        ctx.arc(hx, hy, 3, 0, Math.PI * 2);
        ctx.fillStyle = brand(0.95);
        ctx.fill();

        // 헤드 외곽 은은한 링
        ctx.beginPath();
        ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = brand(0.2);
        ctx.lineWidth   = 1;
        ctx.stroke();
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
