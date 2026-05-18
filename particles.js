/**
 * GitHub Dark 风格粒子网格背景
 * - 粒子数 ≤ 100，连线跟随鼠标高亮
 * - 滚动视差，与 #30363d 网格色系统一
 */
(function initParticleBackground() {
  const canvas = document.getElementById("particle-canvas");
  const bgLayer = document.getElementById("bg-layer");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MAX_PARTICLES = 100;
  const CONNECT_DIST = 118;
  const MOUSE_RADIUS = prefersReduced ? 0 : 150;

  const COLORS = {
    dot: "48, 54, 61",
    dotBright: "88, 166, 255",
    line: "48, 54, 61",
    lineBright: "88, 166, 255",
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let rafId = 0;
  let pointer = { x: null, y: null, active: false };
  let parallaxTarget = 0;
  let parallaxCurrent = 0;
  let scrollProgress = 0;

  function particleCount() {
    if (prefersReduced) return 40;
    return window.innerWidth < 480 ? 55 : window.innerWidth < 768 ? 75 : MAX_PARTICLES;
  }

  function getScrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / max));
  }

  function createParticles() {
    const count = particleCount();
    const list = [];
    for (let i = 0; i < count; i += 1) {
      list.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        phase: Math.random() * Math.PI * 2,
        radius: 1 + Math.random() * 0.6,
      });
    }
    particles = list;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createParticles();
  }

  function onScroll() {
    scrollProgress = getScrollProgress();
    parallaxTarget = window.scrollY * 0.12;
    document.documentElement.style.setProperty("--scroll-depth", scrollProgress.toFixed(3));
    document.documentElement.style.setProperty("--parallax-y", `${parallaxTarget.toFixed(1)}px`);
  }

  function onPointerMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    pointer.x = clientX;
    pointer.y = clientY;
    pointer.active = true;
  }

  function onPointerEnd() {
    pointer.active = false;
    pointer.x = null;
    pointer.y = null;
  }

  function distToMouse(x, y) {
    if (!pointer.active || pointer.x == null) return Infinity;
    return Math.hypot(pointer.x - x, pointer.y - y);
  }

  function drawLines() {
    const grid = new Map();
    const cell = CONNECT_DIST;

    particles.forEach((p, idx) => {
      const cx = (p.x / cell) | 0;
      const cy = (p.drawY / cell) | 0;
      const key = `${cx},${cy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(idx);
    });

    const drawn = new Set();

    particles.forEach((a, i) => {
      const cx = (a.x / cell) | 0;
      const cy = (a.drawY / cell) | 0;

      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const bucket = grid.get(`${cx + ox},${cy + oy}`);
          if (!bucket) continue;

          bucket.forEach((j) => {
            if (j <= i) return;
            const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (drawn.has(pairKey)) return;

            const b = particles[j];
            const dist = Math.hypot(a.x - b.x, a.drawY - b.drawY);
            if (dist > CONNECT_DIST) return;

            drawn.add(pairKey);
            const dm = Math.min(distToMouse(a.x, a.drawY), distToMouse(b.x, b.drawY));
            const near = dm < MOUSE_RADIUS;
            const alpha = (1 - dist / CONNECT_DIST) * (near ? 0.55 : 0.22);

            ctx.beginPath();
            ctx.strokeStyle = near
              ? `rgba(${COLORS.lineBright}, ${alpha})`
              : `rgba(${COLORS.line}, ${alpha})`;
            ctx.lineWidth = near ? 1 : 0.6;
            ctx.moveTo(a.x, a.drawY);
            ctx.lineTo(b.x, b.drawY);
            ctx.stroke();
          });
        }
      }
    });
  }

  function draw() {
    parallaxCurrent += (parallaxTarget - parallaxCurrent) * (prefersReduced ? 1 : 0.08);
    if (bgLayer) {
      bgLayer.style.transform = `translate3d(0, ${(-parallaxCurrent * 0.4).toFixed(2)}px, 0)`;
    }

    ctx.clearRect(0, 0, width, height);
    const time = Date.now() * 0.001;
    const parallaxShift = parallaxCurrent * 0.15;

    particles.forEach((p) => {
      if (!prefersReduced) {
        p.x += p.vx;
        p.y += p.vy;
        p.x += Math.sin(time + p.phase) * 0.15;
        p.y += Math.cos(time * 0.9 + p.phase) * 0.15;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        if (pointer.active && pointer.x != null) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < MOUSE_RADIUS) {
            const f = (1 - dist / MOUSE_RADIUS) * 0.02;
            p.x += dx * f;
            p.y += dy * f;
          }
        }
      }

      p.drawY = p.y - parallaxShift;
    });

    if (!prefersReduced) drawLines();

    particles.forEach((p) => {
      const dm = distToMouse(p.x, p.drawY);
      const near = dm < MOUSE_RADIUS;
      const pulse = prefersReduced ? 0.35 : 0.28 + 0.12 * Math.sin(time * 1.1 + p.phase);
      const alpha = near ? Math.min(pulse + 0.45, 0.9) : pulse;

      ctx.beginPath();
      ctx.fillStyle = near
        ? `rgba(${COLORS.dotBright}, ${alpha})`
        : `rgba(${COLORS.dot}, ${alpha})`;
      ctx.arc(p.x, p.drawY, near ? p.radius + 0.5 : p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    rafId = requestAnimationFrame(draw);
  }

  resize();
  onScroll();
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("mousemove", onPointerMove, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });
  window.addEventListener("touchstart", onPointerMove, { passive: true });
  window.addEventListener("mouseleave", onPointerEnd);
  window.addEventListener("touchend", onPointerEnd);

  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(rafId);
    if (!document.hidden) draw();
  });

  draw();
})();
