import { useEffect, useRef } from 'react';

const NODE_COUNT  = 50;
const CHAIN_COUNT = 3;
const MIN_DIST    = 80;
const MAX_DIST    = 280;
const DRAW_SPEED  = 0.04;  // A→B 선 그리기 속도 (25프레임 ≈ 0.42s)
const HOLD_MIN    = 25;    // 완성 후 유지 최소 프레임 (≈ 0.42s)
const HOLD_MAX    = 50;    // 완성 후 유지 최대 프레임 (≈ 0.83s)
const FADE_OUT    = 0.009; // 느린 우아한 페이드 아웃
const MAX_ALPHA   = 0.32;
const NODE_ALPHA  = 0.28;
const NODE_SPEED  = 0.18;

function brand(a) { return `rgba(132,79,249,${a.toFixed(3)})`; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

export default function BackgroundNetwork() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let w, h, raf;
    let exclusionZones = [];

    function updateExclusionZones() {
      exclusionZones = [];
      const el = document.querySelector('.page-title-area');
      if (el) {
        const r = el.getBoundingClientRect();
        exclusionZones.push({ x: r.left - 16, y: r.top - 16, w: r.width + 32, h: r.height + 32 });
      }
    }

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      updateExclusionZones();
    }
    resize();
    window.addEventListener('resize', resize);

    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * NODE_SPEED,
      vy: (Math.random() - 0.5) * NODE_SPEED,
    }));

    // state: 'drawing' | 'holding' | 'dying'
    const conns = [];

    function inExclusionZone(x, y) {
      return exclusionZones.some(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
    }

    function isBadMidpoint(ax, ay, bx, by) {
      const cx = (ax + bx) / 2, cy = (ay + by) / 2;
      if (inExclusionZone(ax, ay) || inExclusionZone(bx, by) || inExclusionZone(cx, cy)) return true;
      return cx > w * 0.08 && cx < w * 0.72 && cy > h * 0.14 && cy < h * 0.88;
    }

    // drawing/holding 상태만 점유로 간주 (dying은 해제)
    function occupiedNodes() {
      return new Set(
        conns
          .filter(c => c.state !== 'dying')
          .flatMap(c => [c.i, c.j])
      );
    }

    function spawnConn(fromNode = -1) {
      const occupied = occupiedNodes();
      for (let attempt = 0; attempt < 40; attempt++) {
        let i = fromNode >= 0 ? fromNode : randInt(0, NODE_COUNT - 1);
        let j = randInt(0, NODE_COUNT - 1);
        if (i === j) continue;
        if (fromNode < 0 && occupied.has(i)) continue;
        if (occupied.has(j)) continue;
        const ni = nodes[i], nj = nodes[j];
        const dx = ni.x - nj.x, dy = ni.y - nj.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MIN_DIST || d > MAX_DIST) continue;
        if (isBadMidpoint(ni.x, ni.y, nj.x, nj.y)) continue;
        conns.push({
          i, j,
          state:        'drawing',
          drawProgress: 0,
          holdLife:     randInt(HOLD_MIN, HOLD_MAX),
          alpha:        MAX_ALPHA,
        });
        return true;
      }
      return false;
    }

    for (let k = 0; k < CHAIN_COUNT; k++) spawnConn();

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

      for (let k = conns.length - 1; k >= 0; k--) {
        const c = conns[k];
        const a = nodes[c.i], b = nodes[c.j];

        if (c.state === 'drawing') {
          // A→B 선을 직접 그리며 이동
          c.drawProgress = Math.min(c.drawProgress + DRAW_SPEED, 1);
          if (c.drawProgress >= 1) c.state = 'holding';

          const px = a.x + (b.x - a.x) * c.drawProgress;
          const py = a.y + (b.y - a.y) * c.drawProgress;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(px, py);
          ctx.strokeStyle = brand(MAX_ALPHA);
          ctx.lineWidth   = 0.9;
          ctx.stroke();

        } else if (c.state === 'holding') {
          c.holdLife--;
          if (c.holdLife <= 0) {
            c.state = 'dying';
            spawnConn(c.j); // 체인 이어달리기: B→C
          }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = brand(MAX_ALPHA);
          ctx.lineWidth   = 0.9;
          ctx.stroke();

        } else { // dying
          c.alpha -= FADE_OUT;
          if (c.alpha <= 0) { conns.splice(k, 1); continue; }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = brand(c.alpha);
          ctx.lineWidth   = 0.9;
          ctx.stroke();
        }
      }

      // 체인 수 유지
      const activeCount = conns.filter(c => c.state !== 'dying').length;
      if (activeCount < CHAIN_COUNT) spawnConn();

      // 노드 점
      ctx.fillStyle = brand(NODE_ALPHA);
      for (const n of nodes) {
        if (inExclusionZone(n.x, n.y)) continue;
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
