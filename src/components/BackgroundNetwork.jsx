import { useEffect, useRef } from 'react';

const NODE_COUNT   = 40;
const MOUSE_RADIUS = 260;   // 마우스 반응 반경
const AMBIENT_DIST = 140;   // 항상 연결되는 인접 노드 거리

function brand(alpha) {
  return `rgba(132,79,249,${alpha.toFixed(3)})`;
}

export default function BackgroundNetwork() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    // 마우스/터치 판별 — hover 미지원이면 모바일로 처리
    const isMobile = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    let w, h;
    const mouse = { x: -9999, y: -9999 };
    let raf;

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // 노드 초기화 (랜덤 위치 + 아주 느린 속도)
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
    }));

    function onMouseMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; }
    function onMouseLeave() { mouse.x = -9999;     mouse.y = -9999;     }

    if (!isMobile) {
      window.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseleave', onMouseLeave);
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      // 위치 업데이트 (벽 반사)
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0)  { n.x = 0; n.vx *= -1; }
        if (n.x > w)  { n.x = w; n.vx *= -1; }
        if (n.y < 0)  { n.y = 0; n.vy *= -1; }
        if (n.y > h)  { n.y = h; n.vy *= -1; }
      }

      // 항상 보이는 ambient 연결 (인접 노드끼리)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d > AMBIENT_DIST) continue;
          const alpha = (1 - d / AMBIENT_DIST) * 0.1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = brand(alpha);
          ctx.lineWidth   = 0.6;
          ctx.stroke();
        }
      }

      // 데스크톱: 마우스 반경 내 노드들끼리 강조 연결
      if (!isMobile) {
        for (let i = 0; i < nodes.length; i++) {
          const a   = nodes[i];
          const dxA = a.x - mouse.x;
          const dyA = a.y - mouse.y;
          const dA  = Math.sqrt(dxA * dxA + dyA * dyA);
          if (dA > MOUSE_RADIUS) continue;

          const ratioA = 1 - dA / MOUSE_RADIUS;

          for (let j = i + 1; j < nodes.length; j++) {
            const b   = nodes[j];
            const dxB = b.x - mouse.x;
            const dyB = b.y - mouse.y;
            const dB  = Math.sqrt(dxB * dxB + dyB * dyB);
            if (dB > MOUSE_RADIUS) continue;

            const ratioB = 1 - dB / MOUSE_RADIUS;
            const alpha  = ratioA * ratioB * 0.55;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = brand(alpha);
            ctx.lineWidth   = 1;
            ctx.stroke();
          }
        }
      }

      // 노드 점 렌더링
      ctx.fillStyle = brand(0.45);
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (!isMobile) {
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
      }
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
