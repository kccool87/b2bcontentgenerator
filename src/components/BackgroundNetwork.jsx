import { useEffect, useRef } from 'react';

const NODE_COUNT  = 50;
const CHAIN_COUNT = 3;    // 동시에 이동하는 체인 수
const MIN_DIST    = 80;
const MAX_DIST    = 280;
const FADE_IN     = 0.03;
const FADE_OUT    = 0.03;  // 빠른 페이드 아웃
const MAX_ALPHA   = 0.32;
const NODE_ALPHA  = 0.28;
const LIFE_MIN    = 55;   // 짧은 수명 → 빠른 이동감
const LIFE_MAX    = 100;
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

    // 연결 풀: { i, j, alpha, life, dying }
    // dying 포함 모든 연결 → 더블링 방지
    const conns = [];

    function inExclusionZone(x, y) {
      return exclusionZones.some(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
    }

    function isBadMidpoint(ax, ay, bx, by) {
      const cx = (ax + bx) / 2, cy = (ay + by) / 2;
      if (inExclusionZone(ax, ay) || inExclusionZone(bx, by) || inExclusionZone(cx, cy)) return true;
      return cx > w * 0.08 && cx < w * 0.72 && cy > h * 0.14 && cy < h * 0.88;
    }

    // 현재 non-dying 연결에서 사용 중인 노드 집합
    function occupiedNodes() {
      return new Set(conns.filter(c => !c.dying).flatMap(c => [c.i, c.j]));
    }

    // fromNode 지정 시 체인 이어달리기, -1이면 신규 체인
    function spawnConn(fromNode = -1) {
      const occupied = occupiedNodes();
      for (let attempt = 0; attempt < 40; attempt++) {
        let i = fromNode >= 0 ? fromNode : randInt(0, NODE_COUNT - 1);
        let j = randInt(0, NODE_COUNT - 1);
        if (i === j) continue;
        // fromNode 지정 시 i는 고정, j만 체크 / 신규 체인은 둘 다 체크
        if (fromNode < 0 && occupied.has(i)) continue;
        if (occupied.has(j)) continue;
        const ni = nodes[i], nj = nodes[j];
        const dx = ni.x - nj.x, dy = ni.y - nj.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MIN_DIST || d > MAX_DIST) continue;
        if (isBadMidpoint(ni.x, ni.y, nj.x, nj.y)) continue;
        conns.push({ i, j, alpha: 0, life: randInt(LIFE_MIN, LIFE_MAX), dying: false });
        return true;
      }
      return false;
    }

    // 초기 체인 생성
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

      // 연결 업데이트 & 렌더
      for (let k = conns.length - 1; k >= 0; k--) {
        const c = conns[k];

        if (c.dying) {
          c.alpha -= FADE_OUT;
          if (c.alpha <= 0) { conns.splice(k, 1); continue; }
        } else {
          c.alpha = Math.min(c.alpha + FADE_IN, MAX_ALPHA);
          c.life--;
          if (c.life <= 0) {
            c.dying = true;
            // 체인 이어달리기: c.j에서 다음 노드로
            spawnConn(c.j);
          }
        }

        const a = nodes[c.i], b = nodes[c.j];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = brand(c.alpha);
        ctx.lineWidth   = 0.9;
        ctx.stroke();
      }

      // 죽은 체인이 생기면 신규 체인 보충 (총 CHAIN_COUNT 유지)
      const activeCount = conns.filter(c => !c.dying).length;
      if (activeCount < CHAIN_COUNT) spawnConn();

      // 노드 점 — exclusion zone 제외
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
