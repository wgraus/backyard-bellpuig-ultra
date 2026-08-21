(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Navigation ---------- */

  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const navLinks = Array.from(document.querySelectorAll(".nav__link"));

  const closeMenu = () => {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Obre el menú");
    navMenu.classList.remove("is-open");
  };

  navToggle.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    if (open) {
      closeMenu();
    } else {
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Tanca el menú");
      navMenu.classList.add("is-open");
    }
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      navToggle.focus();
    }
  });

  const sectionIds = navLinks
    .map((l) => l.getAttribute("href"))
    .filter((h) => h && h.startsWith("#"))
    .map((h) => h.slice(1));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) =>
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id)
        );
      });
    },
    { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
  );
  sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  /* ---------- Reveal on scroll ---------- */

  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Constellation ---------- */

  const canvas = document.getElementById("constellation");
  const hero = document.getElementById("inici");

  if (canvas && hero) {
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let running = false;
    let rafId = null;
    const mouse = { x: -9999, y: -9999 };
    const LINK_DIST = 120;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.min(110, Math.round((width * height) / 16000));
      particles = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.7
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        const dxm = mouse.x - p.x;
        const dym = mouse.y - p.y;
        const dm = Math.hypot(dxm, dym);
        if (dm < 140 && dm > 0.001) {
          p.x += (dxm / dm) * 0.25;
          p.y += (dym / dm) * 0.25;
        }
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.28;
            ctx.strokeStyle = "rgba(218, 214, 199," + alpha.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.fillStyle = "rgba(218, 214, 199, 0.75)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      draw();
      rafId = running ? requestAnimationFrame(loop) : null;
    };

    const start = () => {
      if (running || prefersReducedMotion) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    resize();
    if (prefersReducedMotion) {
      draw();
    } else {
      start();

      const heroObserver = new IntersectionObserver(
        (entries) => entries[0].isIntersecting ? start() : stop(),
        { threshold: 0 }
      );
      heroObserver.observe(hero);

      document.addEventListener("visibilitychange", () => {
        document.hidden ? stop() : start();
      });

      hero.addEventListener("pointermove", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });

      hero.addEventListener("pointerleave", () => {
        mouse.x = -9999;
        mouse.y = -9999;
      });
    }

    let resizeTimer = null;
    window.addEventListener(
      "resize",
      () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          resize();
          draw();
        }, 150);
      },
      { passive: true }
    );
  }

  /* ---------- Parallax ---------- */

  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  const heroContent = document.getElementById("heroContent");

  const applyParallax = () => {
    const vh = window.innerHeight;

    if (heroContent) {
      const y = window.scrollY;
      if (y < vh * 1.2) {
        heroContent.style.transform = "translate3d(0," + (y * 0.28).toFixed(1) + "px,0)";
        heroContent.style.opacity = clamp(1 - y / (vh * 0.72), 0, 1).toFixed(3);
      }
    }

    for (const el of parallaxEls) {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const rect = el.getBoundingClientRect();
      const delta = rect.top + rect.height / 2 - vh / 2;
      el.style.transform = "translate3d(0," + (-delta * speed).toFixed(1) + "px,0)";
    }
  };

  if (!prefersReducedMotion && (parallaxEls.length || heroContent)) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        applyParallax();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    applyParallax();
  }

  /* ---------- Track progressive draw ---------- */

  const trackSvg = document.getElementById("trackSvg");
  const trackPath = document.getElementById("trackPath");
  const trackMarker = document.getElementById("trackMarker");
  const trackWrap = document.getElementById("trackWrap");

  if (trackSvg && trackPath && Array.isArray(window.TRACK_COORDS) && window.TRACK_COORDS.length > 1) {
    const pts = window.TRACK_COORDS;
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const [lon, lat] of pts) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
    const kx = Math.cos(midLatRad);
    const rawW = (maxLon - minLon) * kx;
    const rawH = maxLat - minLat;

    const VB_W = 1000;
    const PAD = 46;
    const innerW = VB_W - PAD * 2;
    const scale = innerW / rawW;
    const VB_H = Math.round(rawH * scale + PAD * 2);

    trackSvg.setAttribute("viewBox", "0 0 " + VB_W + " " + VB_H);

    const project = ([lon, lat]) => [
      PAD + (lon - minLon) * kx * scale,
      VB_H - PAD - (lat - minLat) * scale
    ];

    let d = "";
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = project(pts[i]);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    d += "Z";
    trackPath.setAttribute("d", d);

    const [sx, sy] = project(pts[0]);
    trackMarker.setAttribute("transform", "translate(" + sx.toFixed(1) + " " + sy.toFixed(1) + ")");

    const len = trackPath.getTotalLength();
    trackPath.style.strokeDasharray = String(len);

    if (prefersReducedMotion) {
      trackPath.style.strokeDashoffset = "0";
    } else {
      trackPath.style.strokeDashoffset = String(len);

      let trackTicking = false;
      const updateTrack = () => {
        const rect = trackWrap.getBoundingClientRect();
        const vh = window.innerHeight;
        const startPoint = vh * 0.88;
        const endPoint = vh * 0.38;
        const progress = clamp(
          (startPoint - rect.top) / (startPoint - endPoint + rect.height * 0.55),
          0,
          1
        );
        trackPath.style.strokeDashoffset = String(len * (1 - progress));
        trackTicking = false;
      };

      window.addEventListener(
        "scroll",
        () => {
          if (trackTicking) return;
          trackTicking = true;
          requestAnimationFrame(updateTrack);
        },
        { passive: true }
      );

      window.addEventListener("resize", updateTrack, { passive: true });
      updateTrack();
    }
  }

  /* ---------- Footer year ---------- */

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Nav scrolled state ---------- */

  const onNavScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onNavScroll, { passive: true });
  onNavScroll();
})();
