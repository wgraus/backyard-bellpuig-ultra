(() => {
  const gameWrap = document.getElementById("game");
  const cv = document.getElementById("gameCanvas");
  const g = cv.getContext("2d");
  const scoreEl = document.getElementById("gameScore");
  const lapEl = document.getElementById("gameLaps");
  const bestEl = document.getElementById("gameBest");
  const bellEl = document.getElementById("gameBell");
  const clockEl = document.getElementById("gameClock");
  const hintEl = document.querySelector(".hint");
  const btnStart = document.getElementById("btnStart");
  const btnReset = document.getElementById("btnReset");

  const INK = "#dad6c7";
  const SOFT = "#8fa89a";
  const BG_DEEP = "#354643";
  const LAP_M = 6706;
  const LAP_TIME = 45; // seconds of game time = the "one hour" deadline per lap
  const GAME_H = 170;
  const GROUND = GAME_H - 24;
  const PX2M = 0.45;
  const GRAVITY = 2000;
  const JUMP_V = -640;

  let W = cv.clientWidth || 1200;
  let gdpr = 1;
  let state = "idle";
  let lastT = 0;
  let rafId = null;
  let speed = 360;
  let distPx = 0;
  let meters = 0;
  let laps = 0;
  let lapClock = 0; // seconds into current lap
  let lapM = 0; // meters into current lap
  let flash = 0;
  let spawnIn = 420;
  let obstacles = [];
  let player = { y: GROUND, vy: 0, airborne: false };
  let bestM = 0;
  let bestVoltes = 0;
  let time2 = 0;
  let running = false;

  try {
    bestM = Number(localStorage.getItem("espaseta-best")) || 0;
    bestVoltes = Number(localStorage.getItem("espaseta-voltes")) || 0;
  } catch (e) {
    bestM = 0;
    bestVoltes = 0;
  }

  const tickerRef = { t: 0, lastBell: 0 };

  const fmtClock = (s) => {
    const mm = Math.max(0, Math.floor(s / 60));
    const ss = Math.max(0, Math.floor(s % 60));
    return String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
  };

  const sizeGame = () => {
    gdpr = Math.min(window.devicePixelRatio || 1, 2);
    W = gameWrap.clientWidth;
    cv.width = Math.round(W * gdpr);
    cv.height = Math.round(GAME_H * gdpr);
    g.setTransform(gdpr, 0, 0, gdpr, 0, 0);
    render();
  };

  const lapSpeed = () => Math.min(1180, 360 + laps * 60 + 9);

  const resetGame = () => {
    speed = 360;
    distPx = 0;
    meters = 0;
    laps = 0;
    lapClock = 0;
    lapM = 0;
    flash = 0;
    spawnIn = 420;
    obstacles = [];
    player = { y: GROUND, vy: 0, airborne: false };
    tickerRef.t = 0;
    tickerRef.lastBell = 0;
    lapEl.textContent = "Volta 1";
    scoreEl.textContent = "00000 m";
    clockEl.textContent = "00:" + String(LAP_TIME).padStart(2, "0");
    bellEl.textContent = "🔔";
  };

  const refreshBest = () => {
    bestEl.textContent = "Rècord: " + Math.floor(bestM) + " m · " + Math.floor(bestVoltes) + " voltes";
  };

  const startRun = () => {
    resetGame();
    state = "run";
    startLoop();
  };

  const doJump = () => {
    if (state === "idle" || state === "over") {
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
    const m = Math.floor(meters);
    if (m > bestM) bestM = m;
    if (laps > bestVoltes) bestVoltes = laps;
    try {
      localStorage.setItem("espaseta-best", String(bestM));
      localStorage.setItem("espaseta-voltes", String(bestVoltes));
    } catch (e) {}
    refreshBest();
  };

  const spawnObstacle = () => {
    const r = Math.random();
    if (r < 0.5) {
      obstacles.push({ type: "sword", x: W + 40, w: 12, h: 44 + Math.random() * 8 + Math.min(laps, 4) * 4 });
    } else if (r < 0.85) {
      obstacles.push({ type: "puddle", x: W + 40, w: 48 + Math.random() * 40 + Math.min(laps, 5) * 10, h: 24 });
    } else {
      obstacles.push({ type: "wall", x: W + 40, w: 14, h: 46 + Math.random() * 6 });
    }
    spawnIn = 300 + Math.random() * 320 + speed * 0.3 - Math.min(laps, 6) * 26;
  };

  const update = (dt) => {
    if (state !== "run") return;
    const target = lapSpeed();
    speed = Math.min(target, speed + dt * 12);
    distPx += speed * dt;
    meters += speed * dt * PX2M;
    lapClock += dt;
    lapM += speed * dt * PX2M;

    const lapLeft = LAP_M - lapM;

    if (lapLeft > 0) {
      scoreEl.textContent = String(Math.max(0, Math.floor(lapLeft))).padStart(5, "0") + " m";
      clockEl.textContent = fmtClock(Math.max(0, LAP_TIME - lapClock));
    } else {
      scoreEl.textContent = "VOLTA OK";
      clockEl.textContent = "00:00";
    }

    if (lapLeft <= 0) {
      laps++;
      lapClock = 0;
      lapM = 0;
      flash = 110;
      tickerRef.t = perfNow();
      lapEl.textContent = "Volta " + (laps + 1);
      if (laps > bestVoltes) {
        try {
          bestVoltes = laps;
          localStorage.setItem("espaseta-voltes", String(bestVoltes));
        } catch (e) {}
        refreshBest();
      }
    } else if (lapClock >= LAP_TIME) {
      endRun();
    }

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

  const perfNow = () => performance.now();
  const bellActive = () => {
    if (flash <= 0) return false;
    if (tickerRef.t === 0) return true;
    // two distinct bell rings: immediately and shortly after
    const e = perfNow() - tickerRef.t;
    return (e < 160) || (e > 420 && e < 580);
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
      } else if (o.type === "wall") {
        g.strokeStyle = INK;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(o.x + o.w / 2, GROUND);
        g.lineTo(o.x + o.w / 2, GROUND - o.h);
        g.stroke();
        g.beginPath();
        g.moveTo(o.x, GROUND - o.h + 4);
        g.lineTo(o.x + o.w, GROUND - o.h + 4);
        g.moveTo(o.x, GROUND - o.h + 12);
        g.lineTo(o.x + o.w, GROUND - o.h + 12);
        g.stroke();
      } else {
        g.strokeStyle = SOFT;
        g.lineWidth = 3;
        g.beginPath();
        for (let wx = 0; wx <= o.w; wx += 8) {
          const wy =
            GROUND - o.h / 2 -
            Math.sin((wx / o.w) * Math.PI) * (o.h / 2) -
            Math.sin(time2 * 0.15 + wx) * 2;
          if (wx === 0) g.moveTo(o.x + wx, wy);
          else g.lineTo(o.x + wx, wy);
        }
        g.stroke();
      }
    }
  };

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

    // lap progress bar at the very bottom
    const p = Math.min(1, lapClock / LAP_TIME);
    g.fillStyle = "rgba(218, 214, 199, 0.18)";
    g.fillRect(0, GAME_H - 6, W, 3);
    g.fillStyle = INK;
    g.fillRect(0, GAME_H - 6, W * p, 3);

    g.font = "700 15px ui-monospace, Menlo, Consolas, monospace";
    g.textAlign = "center";

    if (bellActive()) {
      g.fillStyle = INK;
      g.font = "700 22px ui-monospace, Menlo, Consolas, monospace";
      g.fillText("🔔 VOLTA " + laps + " SUPERADA", W / 2, 52);
    }

    if (state === "idle") {
      g.fillStyle = "rgba(53, 70, 67, 0.78)";
      g.fillRect(0, 0, W, GAME_H);
      g.fillStyle = INK;
      g.font = "700 20px ui-monospace, Menlo, Consolas, monospace";
      g.fillText("L'ESPASETA RUN GAME", W / 2, GAME_H / 2 - 24);
      g.font = "13px ui-monospace, Menlo, Consolas, monospace";
      g.fillStyle = SOFT;
      g.fillText("Una hora. Una volta més. Fins que només en quedi un.", W / 2, GAME_H / 2 - 2);
      g.fillText("Espai o toc per començar a córrer", W / 2, GAME_H / 2 + 18);
    } else if (state === "over") {
      g.fillStyle = "rgba(53, 70, 67, 0.78)";
      g.fillRect(0, 0, W, GAME_H);
      g.fillStyle = INK;
      g.font = "700 18px ui-monospace, Menlo, Consolas, monospace";
      g.fillText("Aturat a " + Math.floor(meters) + " m · " + laps + " voltes", W / 2, GAME_H / 2 - 8);
      g.font = "13px ui-monospace, Menlo, Consolas, monospace";
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
    running = true;
    lastT = performance.now();
    rafId = requestAnimationFrame(step);
  };

  const stopLoop = () => {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stopLoop() : running && startLoop();
  });

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
      e.preventDefault();
      doJump();
    }
  });

  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    doJump();
  });

  btnStart.addEventListener("click", () => startRun());
  btnReset.addEventListener("click", () => {
    stopLoop();
    resetGame();
    refreshBest();
    state = "idle";
    render();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeGame, 150);
  });

  refreshBest();
  sizeGame();
})();
