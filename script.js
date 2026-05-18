const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const navIndicator = document.querySelector(".nav-indicator");
const yearEl = document.getElementById("year");
const sections = document.querySelectorAll("section[id]");
const typewriterEl = document.getElementById("hero-typewriter");
const terminal = document.getElementById("profile-terminal");
const rippleButtons = document.querySelectorAll(".btn-ripple");
const projectCards = document.querySelectorAll(".project-card");

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

function closeNav() {
  if (!navToggle || !siteNav) return;
  navToggle.setAttribute("aria-expanded", "false");
  siteNav.classList.remove("is-open");
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", open ? "false" : "true");
    siteNav.classList.toggle("is-open", !open);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", closeNav);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeNav();
});

function smoothScrollTo(target) {
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 60;
  window.scrollTo({
    top,
    behavior: prefersReduced ? "auto" : "smooth",
  });
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const href = anchor.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    smoothScrollTo(target);
    history.pushState(null, "", href);
  });
});

function updateNavIndicator(activeLink) {
  if (!navIndicator || !activeLink || !siteNav) return;
  const navRect = siteNav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  navIndicator.style.width = `${linkRect.width}px`;
  navIndicator.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
  navIndicator.style.opacity = "1";
}

function setActiveNav(id) {
  let activeLink = null;
  navLinks.forEach((link) => {
    const match = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("is-active", match);
    if (match) activeLink = link;
  });
  updateNavIndicator(activeLink);
}

if (sections.length && navLinks.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        setActiveNav(entry.target.id);
      });
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
  window.addEventListener("resize", () => {
    const current = document.querySelector(".site-nav a.is-active");
    updateNavIndicator(current);
  });
}

function initTypewriter() {
  if (!typewriterEl) return;
  const textEl = typewriterEl.querySelector(".typewriter-text");
  const text = typewriterEl.dataset.text || "";
  if (!textEl || !text) return;

  if (prefersReduced) {
    textEl.textContent = text;
    typewriterEl.classList.add("is-done");
    return;
  }

  let index = 0;
  const speed = window.innerWidth < 768 ? 45 : 35;

  const startTyping = () => {
    const tick = () => {
      if (index <= text.length) {
        textEl.textContent = text.slice(0, index);
        index += 1;
        setTimeout(tick, speed);
      } else {
        typewriterEl.classList.add("is-done");
      }
    };
    tick();
  };

  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        startTyping();
        io.disconnect();
      }
    },
    { threshold: 0.5 }
  );

  io.observe(typewriterEl);
}

function initRipple() {
  rippleButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  });
}

function initTerminalWindow() {
  if (!terminal) return;
  const bodyWrap = terminal.querySelector(".terminal-body-wrap");
  const buttons = terminal.querySelectorAll(".window-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      terminal.classList.remove("is-minimized", "is-maximized", "is-closed");

      if (action === "minimize") {
        terminal.classList.add("is-minimized");
      } else if (action === "maximize") {
        terminal.classList.toggle("is-maximized");
      } else if (action === "close") {
        terminal.classList.add("is-closed");
        setTimeout(() => {
          terminal.classList.remove("is-closed");
        }, 1800);
      }

      btn.classList.add("is-pressed");
      setTimeout(() => btn.classList.remove("is-pressed"), 200);
    });
  });

  if (bodyWrap) {
    bodyWrap.addEventListener("transitionend", () => {
      if (terminal.classList.contains("is-minimized")) return;
    });
  }
}

function initProjectCards() {
  projectCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      const href = card.getAttribute("href");
      if (!href || href === "#") {
        e.preventDefault();
        return;
      }
      if (prefersReduced) return;
      e.preventDefault();
      card.classList.add("is-navigating");
      setTimeout(() => {
        if (card.target === "_blank") {
          window.open(href, "_blank", "noopener,noreferrer");
        } else {
          window.location.assign(href);
        }
        card.classList.remove("is-navigating");
      }, 280);
    });
  });
}

function initSkillProgress() {
  const items = document.querySelectorAll(".skill-progress-item");
  if (!items.length) return;

  const animateItem = (item) => {
    if (item.classList.contains("is-done")) return;

    const value = Number(item.dataset.value) || 0;
    const fill = item.querySelector(".progress-fill");
    const pctEl = item.querySelector(".skill-pct");
    const statusEl = item.querySelector(".skill-status");
    const track = item.querySelector(".progress-track");

    if (!fill || !pctEl) return;

    if (prefersReduced) {
      fill.style.width = `${value}%`;
      pctEl.textContent = `${value}%`;
      if (statusEl) statusEl.textContent = "done";
      if (track) track.setAttribute("aria-valuenow", String(value));
      item.classList.add("is-done");
      return;
    }

    item.classList.add("is-loading");
    if (statusEl) statusEl.textContent = "loading";

    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = Math.round(value * eased);
      fill.style.width = `${current}%`;
      pctEl.textContent = `${current}%`;
      if (track) track.setAttribute("aria-valuenow", String(current));

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        item.classList.remove("is-loading");
        item.classList.add("is-done");
        if (statusEl) statusEl.textContent = "done";
        fill.style.width = `${value}%`;
        pctEl.textContent = `${value}%`;
        if (track) track.setAttribute("aria-valuenow", String(value));
      }
    };

    requestAnimationFrame(tick);
  };

  let queue = 0;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = queue * 140;
        queue += 1;
        setTimeout(() => animateItem(entry.target), delay);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );

  items.forEach((item) => io.observe(item));
}

initTypewriter();
initRipple();
initTerminalWindow();
initProjectCards();
initSkillProgress();
