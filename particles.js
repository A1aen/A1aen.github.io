(function () {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  const isMobile = () => window.innerWidth < 768;

  let width = 0;
  let height = 0;
  let particles = [];
  let animationId = 0;
  let pointer = { x: null, y: null, active: false };
  let dpr = 1;

  let scrollProgress = 0;
  let densitySmooth = 0.5;
  let activeParticleCount = 0;
  let lastBuiltCount = 0;

  function getScrollProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / maxScroll));
  }

  function getDensityBounds() {
    if (isMobile()) {
      return { min: 0.42, max: 1.15, capMin: 48, capMax: 125 };
    }
    return { min: 0.38, max: 1.28, capMin: 62, capMax: 200 };
  }

  function getTargetDensity() {
    const { min, max } = getDensityBounds();
    return min + (max - min) * scrollProgress;
  }

  function getParticleCap(density) {
    const { capMin, capMax, min, max } = getDensityBounds();
    const t = (density - min) / (max - min);
    return Math.floor(capMin + (capMax - capMin) * Math.min(1, Math.max(0, t)));
  }

  function getSpacing() {
    const w = window.innerWidth;
    const densityBonus = (densitySmooth - 0.4) * 6;
    if (w < 480) return Math.max(32, 44 - densityBonus);
    if (w < 768) return Math.max(28, 38 - densityBonus);
    return Math.max(22, 30 - densityBonus);
  }

  function getConnectDistance() {
    const w = window.innerWidth;
    const extra = (densitySmooth - 0.4) * 25;
    if (w < 480) return 90 + extra;
    if (w < 768) return 110 + extra;
    return 130 + extra;
  }

  function createParticles(cap) {
    const spacing = getSpacing();
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;
    const list = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (list.length >= cap) break;
        const jitter = (Math.random() - 0.5) * spacing * 0.35;
        const bx = col * spacing + jitter;
        const by = row * spacing + jitter;
        list.push({
          x: bx,
          y: by,
          baseX: bx,
          baseY: by,
          vx: 0,
          vy: 0,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.6,
          depth: row / rows,
        });
      }
      if (list.length >= cap) break;
    }

    particles = list;
    activeParticleCount = list.length;
    lastBuiltCount = cap;
  }

  function syncParticleCount() {
    const cap = getParticleCap(densitySmooth);
    if (Math.abs(cap - lastBuiltCount) >= 4 || particles.length === 0) {
      createParticles(cap);
    } else {
      activeParticleCount = Math.min(cap, particles.length);
    }
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
    scrollProgress = getScrollProgress();
    densitySmooth = getTargetDensity();
    createParticles(getParticleCap(densitySmooth));
  }

  function onScroll() {
    scrollProgress = getScrollProgress();
    document.documentElement.style.setProperty(
      "--scroll-depth",
      scrollProgress.toFixed(3)
    );
  }

  function setPointer(x, y, active) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = active;
  }

  function onPointerMove(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setPointer(x, y, true);
  }

  function onPointerLeave() {
    pointer.active = false;
    pointer.x = null;
    pointer.y = null;
  }

  function draw() {
    const targetDensity = getTargetDensity();
    densitySmooth += (targetDensity - densitySmooth) * (prefersReduced ? 1 : 0.06);
    syncParticleCount();

    ctx.clearRect(0, 0, width, height);
    const connectDist = getConnectDistance();
    const mouseRadius = isMobile() ? 120 : 160;
    const pullStrength = prefersReduced ? 0 : isMobile() ? 0.018 : 0.028;
    const time = Date.now() * 0.001;
    const depthBoost = 0.35 + scrollProgress * 0.45;
    const count = activeParticleCount;

    for (let i = 0; i < count; i += 1) {
      const p = particles[i];

      if (!prefersReduced) {
        const driftX = Math.sin(time * p.speed + p.phase) * 0.35;
        const driftY = Math.cos(time * p.speed * 0.9 + p.phase) * 0.35;
        p.x = p.baseX + driftX;
        p.y = p.baseY + driftY;

        if (pointer.active && pointer.x != null) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < mouseRadius) {
            const force = (1 - dist / mouseRadius) * pullStrength;
            p.vx += dx * force;
            p.vy += dy * force;
          }
        }

        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx * 8;
        p.y += p.vy * 8;
      }

      const fadeBase = prefersReduced
        ? 0.35
        : 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(time * 1.2 + p.phase));
      const depthAlpha = fadeBase * (0.65 + p.depth * depthBoost);
      const nearMouse =
        pointer.active &&
        pointer.x != null &&
        Math.hypot(pointer.x - p.x, pointer.y - p.y) < mouseRadius;
      const alpha = nearMouse ? Math.min(depthAlpha + 0.35, 0.92) : depthAlpha;

      ctx.beginPath();
      ctx.fillStyle = nearMouse
        ? `rgba(126, 231, 135, ${alpha})`
        : `rgba(126, 231, 135, ${alpha * 0.55})`;
      const size = (nearMouse ? 1.8 : 1.2) + scrollProgress * 0.4;
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const drawLines = !prefersReduced && count < 160;
    if (drawLines) {
      const step = count > 100 ? 2 : 1;
      for (let i = 0; i < count; i += step) {
        for (let j = i + step; j < count; j += step) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > connectDist) continue;

          const lineAlpha = (1 - dist / connectDist) * (0.25 + scrollProgress * 0.2);
          const boosted =
            pointer.active &&
            pointer.x != null &&
            (Math.hypot(pointer.x - a.x, pointer.y - a.y) < mouseRadius ||
              Math.hypot(pointer.x - b.x, pointer.y - b.y) < mouseRadius);

          ctx.beginPath();
          ctx.strokeStyle = boosted
            ? `rgba(121, 192, 255, ${lineAlpha + 0.1})`
            : `rgba(48, 54, 61, ${lineAlpha * 0.65})`;
          ctx.lineWidth = boosted ? 0.8 : 0.5;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    animationId = requestAnimationFrame(draw);
  }

  resize();
  onScroll();
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("mousemove", onPointerMove, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });
  window.addEventListener("touchstart", onPointerMove, { passive: true });
  window.addEventListener("mouseleave", onPointerLeave);
  window.addEventListener("touchend", onPointerLeave);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      cancelAnimationFrame(animationId);
      draw();
    }
  });

  draw();
})();
