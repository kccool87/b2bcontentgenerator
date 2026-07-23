import { useEffect, useRef } from 'react';

const NODE_COUNT = 50;
const MAX_CONN   = 10;
const MIN_DIST   = 60;
const MAX_DIST   = 260;
const FADE_IN    = 0.014;
const FADE_OUT   = 0.009;
const MAX_ALPHA  = 0.28;   // 투명도 낮춤
const NODE_ALPHA = 0.3;    // 노드 투명도 낮춤
const LIFE_MIN   = 160;
const LIFE_MAX   = 320;
const NODE_SPEED = 0.18;

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
    let exclusionZones = [];

    // 로고 영역 등 UI exclusion zone — DOM에서 실시간으로 읽음
    function updateExclusionZones() {
      exclusionZones = [];
      const titleArea = document.querySelector('.page-title-area');
      if (titleArea) {
        const r = titleArea.getBoundingClientRect();
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

    // 특정 좌표가 exclusion zone 안인지 확인
    function inExclusionZone(x, y) {
      return exclusionZones.some(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
    }

    // 선의 중점이 콘텐츠 영역 또는 exclusion zone 안인지 확인
    function isBadConnection(ax, ay, bx, by) {
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2;
      if (inExclusionZone(ax, ay) || inExclusionZone(bx, by)) return true;
      if (inExclusionZone(cx, cy)) return true;
      const zoneLeft   = w * 0.08;
      const zoneRight  = w * 0.72;
      const zoneTop    = h * 0.14;
      const zoneBottom = h * 0.88;
      return cx > zoneLeft && cx < zoneRight && cy > zoneTop && cy < zoneBottom;
    }

    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * NODE_SPEED,
      vy: (Math.random() - 0.5) * NODE_SPEED,
    }));

    const conns = [];

    function spawnConn() {
      const existing = new Set(conns.map(c => `${c.i}-${c.j}`));
      for (let attempt = 0; attempt < 30; attempt++) {
        let i = randInt(0, NODE_COUNT - 1);
        let j = randInt(0, NODE_COUNT - 1);
        if (i === j) continue;
        if (i > j) [i, j] = [j, i];
        if (existing.has(`${i}-${j}`)) continue;
        const ni = nodes[i], nj = nodes[j];
        const dx = ni.x - nj.x, dy = ni.y - nj.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MIN_DIST || d > MAX_DIST) continue;
        if (isBadConnection(ni.x, ni.y, nj.x, nj.y)) continue;
        conns.push({ i, j, alpha: 0, life: randInt(LIFE_MIN, LIFE_MAX), dying: false });
        return;
      }
    }

    for (let k = 0; k < MAX_CONN; k++) spawnConn();

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
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

      while (conns.length < MAX_CONN) spawnConn();

      // 노드 점 — exclusion zone 안에 있는 노드는 그리지 않음
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
