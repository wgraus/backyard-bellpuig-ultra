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

  /* ---------- Rural dust ---------- */

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
    let time = 0;
    let gustCooldown = 180 + Math.random() * 300;
    let gustTime = 0;
    let gustTotal = 1;
    let gustPower = 0;
    const mouse = { x: -9999, y: -9999 };

    const sprite = document.createElement("canvas");
    sprite.width = 64;
    sprite.height = 64;
    const spriteCtx = sprite.getContext("2d");
    const grad = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(218, 214, 199, 1)");
    grad.addColorStop(0.35, "rgba(218, 214, 199, 0.5)");
    grad.addColorStop(1, "rgba(218, 214, 199, 0)");
    spriteCtx.fillStyle = grad;
    spriteCtx.fillRect(0, 0, 64, 64);

    const makeParticle = (near) => ({
      near,
      x: Math.random() * width,
      y: Math.random() * height,
      r: near ? Math.random() * 0.9 + 0.7 : Math.random() * 0.5 + 0.25,
      alpha: near ? Math.random() * 0.3 + 0.3 : Math.random() * 0.22 + 0.08,
      vx: near ? Math.random() * 0.6 + 0.45 : Math.random() * 0.3 + 0.15,
      vy: (Math.random() - 0.5) * 0.09,
      phase: Math.random() * Math.PI * 2,
      wobbleAmp: Math.random() * 16 + 6,
      wobbleSpeed: Math.random() * 0.012 + 0.005,
      twinkleSpeed: Math.random() * 0.02 + 0.008,
      glow: 0
    });

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.min(650, Math.round((width * height) / 2400));
      particles = [];
      for (let i = 0; i < target; i++) {
        particles.push(makeParticle(Math.random() < 0.25));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += 1;

      if (gustTime > 0) {
        gustTime--;
        gustPower = Math.sin((1 - gustTime / gustTotal) * Math.PI);
      } else if (--gustCooldown <= 0) {
        gustTotal = 90 + Math.random() * 90;
        gustTime = gustTotal;
        gustCooldown = 300 + Math.random() * 480;
      }

      for (const p of particles) {
        p.phase += p.wobbleSpeed * (1 + gustPower * 1.5);
        p.x += p.vx * (1 + gustPower * (p.near ? 2.4 : 1.7));
        p.y += p.vy + (Math.random() - 0.5) * gustPower * 0.5;

        const dxm = p.x - mouse.x;
        const dym = p.y - mouse.y;
        const dm2 = dxm * dxm + dym * dym;
        let litTarget = 0;
        if (dm2 < 19600 && dm2 > 0.01) {
          const t = 1 - Math.sqrt(dm2) / 140;
          litTarget = t * t * (3 - 2 * t);
        }
        p.glow += (litTarget - p.glow) * 0.06;

        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;
        if (p.y < -30) p.y = height + 30;
        if (p.y > height + 30) p.y = -30;

        const wx = Math.cos(p.phase * 1.3) * p.wobbleAmp;
        const wy = Math.sin(p.phase) * p.wobbleAmp * 0.5;
        const twinkle = 0.72 + 0.28 * Math.sin(time * p.twinkleSpeed + p.phase);
        const size = p.r * 6 * (1 + p.glow * 0.9);

        ctx.globalAlpha = Math.min(1, p.alpha * twinkle * (1 + p.glow * 4));
        ctx.drawImage(sprite, p.x + wx - size / 2, p.y + wy - size / 2, size, size);
      }

      ctx.globalAlpha = 1;
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

    const Y_SQUASH = 0.7;
    const VB_W = 1000;
    const PAD = 46;
    const innerW = VB_W - PAD * 2;
    const scale = innerW / rawW;
    const VB_H = Math.round((maxLat - minLat) * scale * Y_SQUASH + PAD * 2);

    trackSvg.setAttribute("viewBox", "0 0 " + VB_W + " " + VB_H);

    const project = ([lon, lat]) => [
      PAD + (lon - minLon) * kx * scale,
      VB_H - PAD - (lat - minLat) * scale * Y_SQUASH
    ];

    let d = "";
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = project(pts[i]);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    d += "Z";
    trackPath.setAttribute("d", d);

    const heroTrackPath = document.getElementById("heroTrackPath");
    if (heroTrackPath) heroTrackPath.setAttribute("d", d);

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

  /* ---------- Gallery lightbox ---------- */

  const lightbox = document.getElementById("lightbox");
  const gallery = document.getElementById("gallery");

  if (lightbox && gallery) {
    const items = Array.from(gallery.querySelectorAll(".gallery__item"));
    const lbImg = document.getElementById("lightboxImg");
    const lbCaption = document.getElementById("lightboxCaption");
    const lbClose = document.getElementById("lightboxClose");
    const lbPrev = document.getElementById("lightboxPrev");
    const lbNext = document.getElementById("lightboxNext");
    let current = 0;
    let lastFocus = null;

    const show = (i) => {
      current = (i + items.length) % items.length;
      const img = items[current].querySelector("img");
      if (!img) return;
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = img.alt;
      lbCaption.textContent = img.alt;
    };

    const openLightbox = (i) => {
      lastFocus = document.activeElement;
      show(i);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      lbClose.focus();
    };

    const closeLightbox = () => {
      lightbox.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    };

    items.forEach((item, i) => item.addEventListener("click", () => openLightbox(i)));
    lbClose.addEventListener("click", closeLightbox);
    lbPrev.addEventListener("click", () => show(current - 1));
    lbNext.addEventListener("click", () => show(current + 1));

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
    });
  }

  /* ---------- Espaseta run game ---------- */

  const gameWrap = document.getElementById("game");
  if (gameWrap) {
    const cv = document.getElementById("gameCanvas");
    const g = cv.getContext("2d");
    const scoreEl = document.getElementById("gameScore");
    const lapEl = document.getElementById("gameLaps");
    const bestEl = document.getElementById("gameBest");
    const hintEl = document.getElementById("gameHint");

    const INK = "#dad6c7";
    const SOFT = "#8fa89a";
    const LAP_M = 6706;
    const GAME_H = 170;
    const GROUND = GAME_H - 24;
    const PX2M = 0.14;
    const GRAVITY = 2000;
    const JUMP_V = -640;

    let W = cv.clientWidth || 800;
    let gdpr = 1;
    let state = "idle";
    let lastT = 0;
    let rafId = null;
    let speed = 360;
    let distPx = 0;
    let meters = 0;
    let laps = 0;
    let flash = 0;
    let spawnIn = 420;
    let obstacles = [];
    let player = { y: GROUND, vy: 0, airborne: false };
    let bestM = 0;
    try {
      bestM = Number(localStorage.getItem("espaseta-best")) || 0;
    } catch (e) {
      bestM = 0;
    }
    bestEl.textContent = "Rècord: " + Math.floor(bestM) + " m";

    const sizeGame = () => {
      gdpr = Math.min(window.devicePixelRatio || 1, 2);
      W = gameWrap.clientWidth - 20;
      cv.width = Math.round(W * gdpr);
      cv.height = Math.round(GAME_H * gdpr);
      g.setTransform(gdpr, 0, 0, gdpr, 0, 0);
    };

    const resetGame = () => {
      speed = 360;
      distPx = 0;
      meters = 0;
      laps = 0;
      flash = 0;
      spawnIn = 420;
      obstacles = [];
      player = { y: GROUND, vy: 0, airborne: false };
      lapEl.textContent = "Volta 1";
      scoreEl.textContent = "00000 m";
    };

    const startRun = () => {
      resetGame();
      state = "run";
      gameWrap.classList.add("is-playing");
    };

    const doJump = () => {
      if (state === "idle") {
        startRun();
        return;
      }
      if (state === "over") {
        startRun();
        return;
      }
      if (!player.airborne) {
        player.vy = JUMP_V;
        player.airborne = true;
      }
    };

    const endRun = () => {
      state = "over";
      gameWrap.classList.remove("is-playing");
      const m = Math.floor(meters);
      if (m > bestM) {
        bestM = m;
        try {
          localStorage.setItem("espaseta-best", String(m));
        } catch (e) {}
        bestEl.textContent = "Rècord: " + m + " m";
      }
    };

    const spawnObstacle = () => {
      if (Math.random() < 0.55) {
        obstacles.push({ type: "sword", x: W + 40, w: 12, h: 44 + Math.random() * 8 });
      } else {
        obstacles.push({ type: "puddle", x: W + 40, w: 48 + Math.random() * 40, h: 24 });
      }
      spawnIn = 300 + Math.random() * 320 + speed * 0.3;
    };

    const update = (dt) => {
      if (state !== "run") return;
      speed = Math.min(860, speed + dt * 9);
      distPx += speed * dt;
      meters += speed * dt * PX2M;

      if (meters >= (laps + 1) * LAP_M) {
        laps++;
        flash = 110;
        lapEl.textContent = "Volta " + (laps + 1);
      }

      scoreEl.textContent = String(Math.floor(meters)).padStart(5, "0") + " m";

      if (player.airborne) {
        player.vy += GRAVITY * dt;
        player.y += player.vy * dt;
        if (player.y >= GROUND) {
          player.y = GROUND;
          player.vy = 0;
          player.airborne = false;
        }
      }

      spawnIn -= speed * dt;
      if (spawnIn <= 0) spawnObstacle();

      for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= speed * dt;
        if (obstacles[i].x < -100) obstacles.splice(i, 1);
      }

      const px1 = 66;
      const px2 = 92;
      const py1 = player.y - 46;
      const py2 = player.y;
      for (const o of obstacles) {
        const ox1 = o.x + 4;
        const ox2 = o.x + o.w - 4;
        const oy1 = GROUND - o.h + 4;
        if (px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < GROUND) {
          endRun();
          break;
        }
      }

      if (flash > 0) flash--;
    };

    const drawRunner = () => {
      const x = 78;
      const fy = player.y;
      const phase = distPx * 0.045;
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.lineCap = "round";

      let a1, a2;
      if (player.airborne) {
        a1 = 1.05;
        a2 = -0.45;
      } else {
        a1 = Math.sin(phase) * 0.95;
        a2 = Math.sin(phase + Math.PI) * 0.95;
      }
      const hipX = x;
      const hipY = fy - 21;
      for (const a of [a1, a2]) {
        const fx = hipX + Math.sin(a) * 13;
        const fy2 = fy - Math.max(0, Math.cos(a)) * 9;
        g.beginPath();
        g.moveTo(hipX, hipY);
        g.lineTo(fx, fy2);
        g.stroke();
      }

      g.beginPath();
      g.moveTo(hipX, hipY);
      g.lineTo(x + 5, fy - 39);
      g.stroke();

      const armA = player.airborne ? -0.9 : Math.sin(phase + Math.PI) * 0.85;
      const armB = player.airborne ? 0.7 : Math.sin(phase) * 0.85;
      for (const a of [armA, armB]) {
        g.beginPath();
        g.moveTo(x + 5, fy - 36);
        g.lineTo(x + 5 + Math.sin(a) * 11, fy - 36 + Math.abs(Math.cos(a)) * 7 + 3);
        g.stroke();
      }

      g.beginPath();
      g.arc(x + 7, fy - 47, 6.5, 0, Math.PI * 2);
      g.stroke();
    };

    const drawObstacles = () => {
      for (const o of obstacles) {
        if (o.type === "sword") {
          const cx = o.x + o.w / 2;
          g.strokeStyle = INK;
          g.lineWidth = 3;
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(cx, GROUND);
          g.lineTo(cx, GROUND - o.h);
          g.stroke();
          g.beginPath();
          g.moveTo(cx - 8, GROUND - o.h + 10);
          g.lineTo(cx + 8, GROUND - o.h + 10);
          g.stroke();
          g.beginPath();
          g.arc(cx, GROUND - o.h - 5, 3, 0, Math.PI * 2);
          g.stroke();
        } else {
          g.strokeStyle = SOFT;
          g.lineWidth = 3;
          g.beginPath();
          for (let wx = 0; wx <= o.w; wx += 8) {
            const wy = GROUND - o.h / 2 - Math.sin(wx / o.w * Math.PI) * (o.h / 2) - Math.sin(time2 * 0.15 + wx) * 2;
            if (wx === 0) g.moveTo(o.x + wx, wy);
            else g.lineTo(o.x + wx, wy);
          }
          g.stroke();
        }
      }
    };

    let time2 = 0;

    const render = () => {
      g.clearRect(0, 0, W, GAME_H);

      g.strokeStyle = SOFT;
      g.lineWidth = 2;
      const dash = 22;
      const off = distPx % (dash * 2);
      g.beginPath();
      for (let dx = -off; dx < W; dx += dash * 2) {
        g.moveTo(dx, GROUND + 1);
        g.lineTo(dx + dash, GROUND + 1);
      }
      g.stroke();

      drawObstacles();
      drawRunner();

      g.font = '700 15px ui-monospace, Menlo, Consolas, monospace';
      g.textAlign = "center";

      if (flash > 0 && flash % 32 < 20) {
        g.fillStyle = INK;
        g.fillText("VOLTA " + laps + " SUPERADA", W / 2, 52);
      }

      if (state === "over") {
        g.fillStyle = "rgba(53, 70, 67, 0.78)";
        g.fillRect(0, 0, W, GAME_H);
        g.fillStyle = INK;
        g.font = '700 18px ui-monospace, Menlo, Consolas, monospace';
        g.fillText("Aturat a " + Math.floor(meters) + " m", W / 2, GAME_H / 2 - 8);
        g.font = '13px ui-monospace, Menlo, Consolas, monospace';
        g.fillStyle = SOFT;
        g.fillText("Espai o toc per reintentar", W / 2, GAME_H / 2 + 16);
      }
    };

    const step = (t) => {
      const dt = Math.min((t - lastT) / 1000, 0.05);
      lastT = t;
      time2 += dt * 60;
      update(dt);
      render();
      rafId = requestAnimationFrame(step);
    };

    const startLoop = () => {
      if (rafId !== null) return;
      lastT = performance.now();
      rafId = requestAnimationFrame(step);
    };
    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    let gameVisible = false;
    new IntersectionObserver((entries) => {
      gameVisible = entries[0].isIntersecting;
      gameVisible ? startLoop() : stopLoop();
    }, { threshold: 0.1 }).observe(gameWrap);

    document.addEventListener("visibilitychange", () => {
      document.hidden ? stopLoop() : (gameVisible && startLoop());
    });

    window.addEventListener(
      "keydown",
      (e) => {
        if (!gameVisible || e.repeat) return;
        if (e.code === "Space" || e.code === "ArrowUp") {
          e.preventDefault();
          doJump();
        }
      },
      { passive: false }
    );

    cv.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      doJump();
    });

    let gameResizeTimer = null;
    window.addEventListener(
      "resize",
      () => {
        clearTimeout(gameResizeTimer);
        gameResizeTimer = setTimeout(() => {
          sizeGame();
          render();
        }, 150);
      },
      { passive: true }
    );

    sizeGame();
    render();
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
