(() => {
  const pista = document.getElementById("pista");
  const cv = document.getElementById("gameCanvas");
  const g = cv.getContext("2d");
  const scoreEl = document.getElementById("gameScore");
  const lapEl = document.getElementById("gameLaps");
  const bestEl = document.getElementById("gameBest");
  const btnStart = document.getElementById("btnStart");
  const btnReset = document.getElementById("btnReset");

  const INK = "#dad6c7";
  const SOFT = "#8fa89a";
  const BG_DEEP = "#354643";
  const LAPS_M = 6706;
  const N_LANES = 3;
  const LANE_PAD = 22;

  // canvas logical (CSS px) size
  let cw = 700;
  let ch = 560;
  let laneW = 0;
  let gdpr = 1;

  let state = "idle";
  let lastT = 0;
  let rafId = null;
  let running = false;
  let time2 = 0;

  let speed = 320;
  let meters = 0;
  let laps = 0;
  let playerLane = 1;
  let moveTarget = 1;
  let spawnIn = 60;
  let obstacles = [];
  let flash = 0;

  let bestM = 0;
  try {
    bestM = Number(localStorage.getItem("espaseta-race-best")) || 0;
  } catch (e) {
    bestM = 0;
  }

  const refreshBest = () => {
    bestEl.textContent = "Rècord: " + Math.floor(bestM) + " m";
  };

  const laneCenter = (lane) => {
    return laneW * (lane + 0.5);
  };

  const sizeGame = () => {
    gdpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = pista.getBoundingClientRect();
    cw = rect.width;
    ch = rect.height;
    laneW = cw / N_LANES;
    cv.width = Math.round(cw * gdpr);
    cv.height = Math.round(ch * gdpr);
    g.setTransform(gdpr, 0, 0, gdpr, 0, 0);
    render();
  };

  const resetGame = () => {
    speed = 380;
    meters = 0;
    laps = 0;
    playerLane = 1;
    moveTarget = 1;
    spawnIn = 60;
    obstacles = [];
    flash = 0;
    lapEl.textContent = "Volta 1";
    scoreEl.textContent = "00000 m";
  };

  const startRun = () => {
    resetGame();
    state = "run";
    startLoop();
  };

  const goLeft = () => {
    if (state === "idle" || state === "over") {
      startRun();
      return;
    }
    if (playerLane > 0) {
      playerLane--;
      moveTarget = playerLane;
    }
  };

  const goRight = () => {
    if (state === "idle" || state === "over") {
      startRun();
      return;
    }
    if (playerLane < N_LANES - 1) {
      playerLane++;
      moveTarget = playerLane;
    }
  };

  const endRun = () => {
    state = "over";
    const m = Math.floor(meters);
    if (m > bestM) {
      bestM = m;
      try {
        localStorage.setItem("espaseta-race-best", String(m));
      } catch (e) {}
      refreshBest();
    }
  };

  const spawnRow = () => {
    // up to 2 obstacles among 3 lanes, never blocking every lane at a given row
    const count = 1 + (Math.random() < 0.5 + Math.min(laps, 6) * 0.05 ? 1 : 0);
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, count);
    for (const l of lanes) {
      const type = Math.random() < 0.6 ? "sword" : "puddle";
      const cx = laneCenter(l);
      const big = Math.random() < Math.min(0.35, laps * 0.06);
      obstacles.push({
        type,
        x: cx,
        lane: l,
        y: -80 - Math.random() * 120,
        w: type === "sword" ? (big ? 46 : 34) : laneW * (big ? 0.85 : 0.72),
        h: type === "sword" ? 42 + Math.random() * 26 + Math.min(laps, 5) * 8 : 30,
      });
    }
    spawnIn = 42 + Math.random() * 80 - Math.min(laps, 8) * 7;
  };

  const update = (dt) => {
    if (state !== "run") return;

    const target = Math.min(900, 380 + laps * 85 + dt * 5);
    speed = Math.min(target, speed + dt * 14);
    meters += speed * dt * 0.28;
    if (meters >= (laps + 1) * LAPS_M) {
      laps++;
      flash = 110;
      lapEl.textContent = "Volta " + (laps + 1);
    }
    scoreEl.textContent = String(Math.floor(meters)).padStart(5, "0") + " m";

    spawnIn -= speed * dt * 0.03;
    if (spawnIn <= 0) spawnRow();

    const pB = 16; // runner hit radius
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += speed * dt;
      if (o.y > ch + 100) {
        obstacles.splice(i, 1);
        continue;
      }
      // collision: same lane + vertical/horizontal overlap with top-down runner
      if (o.lane === playerLane) {
        if (o.y + o.h / 2 > ch - 78 && o.y - o.h / 2 < ch - 26) {
          if (Math.abs(o.x - laneCenter(playerLane)) < o.w / 2 + pB) {
            endRun();
            break;
          }
        }
      }
    }

    if (flash > 0) flash--;
  };

  const drawRunner = () => {
    const cx = laneCenter(playerLane);
    // top-down view: head in the lead (up), body behind, arms pumping sideways
    const headY = ch - 58;
    const phase = time2 * 0.24;

    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.lineCap = "round";

    // shoulders tail (body)
    g.fillStyle = "rgba(218, 214, 199, 0.10)";
    g.beginPath();
    g.ellipse(cx - 2, headY + 15, 10, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = SOFT;
    g.stroke();

    // head
    g.strokeStyle = INK;
    g.beginPath();
    g.arc(cx, headY, 13, 0, Math.PI * 2);
    g.stroke();

    // arms pumping (swinging)
    const armA = Math.sin(phase) * 12;
    const armB = Math.sin(phase + Math.PI) * 12;
    g.strokeStyle = SOFT;
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(cx - 16, headY + 4);
    g.lineTo(cx - 16 - armA * 0.6, headY + 2 + armA * 0.5);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + 12, headY + 4);
    g.lineTo(cx + 12 + armB * 0.6, headY + 2 + armB * 0.5);
    g.stroke();

    // run path direction hint (feet/blur toward viewer)
    g.strokeStyle = "rgba(218, 214, 199, 0.25)";
    g.lineWidth = 3;
    for (let i = 0; i < 2; i++) {
      const a = Math.sin(phase + i * 0.6) * 8;
      g.beginPath();
      g.moveTo(cx - 6 + i * 4, headY + 24);
      g.lineTo(cx - 6 + i * 4 - a * 0.8, headY + 30 + Math.abs(a * 0.9));
      g.stroke();
    }
  };

  const drawObstacle = (o) => {
    if (o.type === "sword") {
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.lineCap = "round";
      const top = o.y - o.h / 2;
      g.beginPath();
      g.moveTo(o.x, o.y);
      g.lineTo(o.x, top);
      g.stroke();
      g.beginPath();
      g.moveTo(o.x - 12, top + 12);
      g.lineTo(o.x + 12, top + 12);
      g.stroke();
      g.beginPath();
      g.arc(o.x, top - 6, 4, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.strokeStyle = SOFT;
      g.lineWidth = 4;
      g.beginPath();
      for (let wx = -o.w / 2; wx <= o.w / 2; wx += 8) {
        const wy =
          o.y -
          Math.sin(((wx + o.w / 2) / o.w) * Math.PI) * (o.h / 2) -
          Math.sin(time2 * 0.2 + o.x + wx) * 2;
        if (wx === -o.w / 2) g.moveTo(o.x + wx, wy);
        else g.lineTo(o.x + wx, wy);
      }
      g.stroke();
    }
  };

  const render = () => {
    g.clearRect(0, 0, cw, ch);

    // lane dividers
    g.strokeStyle = "rgba(218, 214, 199, 0.12)";
    g.lineWidth = 2;
    for (let l = 1; l < N_LANES; l++) {
      const x = laneW * l;
      g.setLineDash([8, 14]);
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, ch);
      g.stroke();
    }
    g.setLineDash([]);

    // start line
    g.strokeStyle = SOFT;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(LANE_PAD, ch - 12);
    g.lineTo(cw - LANE_PAD, ch - 12);
    g.stroke();

    for (const o of obstacles) drawObstacle(o);
    drawRunner();

    g.font = "700 15px ui-monospace, Menlo, Consolas, monospace";
    g.textAlign = "center";

    if (flash > 0 && flash % 32 < 20) {
      g.fillStyle = INK;
      g.fillText("VOLTA " + laps + " SUPERADA", cw / 2, 50);
    }

    if (state === "idle") {
      g.fillStyle = "rgba(53, 70, 67, 0.78)";
      g.fillRect(0, 0, cw, ch);
      g.fillStyle = INK;
      g.font = "700 22px ui-monospace, Menlo, Consolas, monospace";
      g.fillText("ESPASETA RACE", cw / 2, ch / 2 - 24);
      g.font = "13px ui-monospace, Menlo, Consolas, monospace";
      g.fillStyle = SOFT;
      g.fillText("Tres carrils. Puja sense tocar res.", cw / 2, ch / 2 - 2);
      g.fillText("← → per canviar de carril · Espai per començar", cw / 2, ch / 2 + 20);
    } else if (state === "over") {
      g.fillStyle = "rgba(53, 70, 67, 0.78)";
      g.fillRect(0, 0, cw, ch);
      g.fillStyle = INK;
      g.font = "700 18px ui-monospace, Menlo, Consolas, monospace";
      g.fillText("Aturat a " + Math.floor(meters) + " m", cw / 2, ch / 2 - 8);
      g.font = "13px ui-monospace, Menlo, Consolas, monospace";
      g.fillStyle = SOFT;
      g.fillText("Espai o toc per reintentar", cw / 2, ch / 2 + 16);
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
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (state === "idle" || state === "over") startRun();
    } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
      e.preventDefault();
      goLeft();
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      e.preventDefault();
      goRight();
    }
  });

  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const rect = cv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < cw / 2) goLeft();
    else goRight();
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
