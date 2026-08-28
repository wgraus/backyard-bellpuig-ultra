(() => {
  const pista = document.getElementById("pista");
  const cv = document.getElementById("gameCanvas");
  const g = cv.getContext("2d");
  const scoreEl = document.getElementById("gameScore");
  const lapEl = document.getElementById("gameLaps");
  const bestEl = document.getElementById("gameBest");
  const clockEl = document.getElementById("gameClock");
  const bellEl = document.getElementById("gameBell");
  const btnStart = document.getElementById("btnStart");
  const btnReset = document.getElementById("btnReset");

  const INK = "#dad6c7";
  const SOFT = "#8fa89a";
  const SECONDARY = "#5e7969";
  const LAP_TIME = 60;

  let cw, ch, cx, cy, R, gdpr;
  let state = "idle";
  let lastT = 0;
  let rafId = null;
  let time = 0;

  // Game vars
  let runnerAngle = 0; // 0 to 2*PI
  let currentTrack = 0; // 0: inner, 1: outer
  let speed = 2.5; // rad/s
  let laps = 0;
  let lapClock = 0;
  let obstacles = [];
  let spawnTimer = 0;
  let flash = 0;
  let bestLaps = 0;

  try {
    bestLaps = Number(localStorage.getItem("espaseta-circ-best")) || 0;
  } catch (e) {}

  const fmtClock = (s) => {
    const mm = Math.floor(Math.max(0, s) / 60);
    const ss = Math.floor(Math.max(0, s) % 60);
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const getR = (track) => R * (track === 0 ? 0.75 : 1.05);

  const sizeGame = () => {
    gdpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = pista.getBoundingClientRect();
    cw = rect.width;
    ch = rect.height;
    cx = cw / 2;
    cy = ch / 2;
    R = Math.min(cw, ch) * 0.35;
    cv.width = Math.round(cw * gdpr);
    cv.height = Math.round(ch * gdpr);
    g.setTransform(gdpr, 0, 0, gdpr, 0, 0);
  };

  const resetGame = () => {
    runnerAngle = -Math.PI / 2;
    currentTrack = 0;
    speed = 2.2;
    laps = 0;
    lapClock = 0;
    obstacles = [];
    spawnTimer = 0;
    flash = 0;
    updateUI();
  };

  const updateUI = () => {
    scoreEl.textContent = `${laps} voltes`;
    lapEl.textContent = `Volta ${laps + 1}`;
    clockEl.textContent = fmtClock(LAP_TIME - lapClock);
    bestEl.textContent = `Rècord: ${bestLaps} voltes`;
  };

  const spawnObstacle = () => {
    const track = Math.random() < 0.5 ? 0 : 1;
    const angle = runnerAngle + Math.PI * (0.8 + Math.random() * 0.5);
    obstacles.push({
      type: track === 0 ? "espaseta" : "rubinada",
      track,
      angle,
      w: 0.15 + Math.random() * 0.1,
    });
  };

  const endRun = () => {
    state = "over";
    if (laps > bestLaps) {
      bestLaps = laps;
      try {
        localStorage.setItem("espaseta-circ-best", String(bestLaps));
      } catch (e) {}
    }
  };

  const update = (dt) => {
    if (state !== "run") return;

    lapClock += dt;
    if (lapClock >= LAP_TIME) {
      endRun();
      return;
    }

    const oldAngle = runnerAngle;
    runnerAngle += speed * dt;

    // Check lap completion
    if (Math.floor((oldAngle + Math.PI / 2) / (Math.PI * 2)) < Math.floor((runnerAngle + Math.PI / 2) / (Math.PI * 2))) {
      laps++;
      lapClock = 0;
      speed += 0.15;
      flash = 60;
      updateUI();
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = 1.2 / (speed * 0.5) + Math.random() * 0.5;
    }

    // Collision & cleanup
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      // Simple angular collision
      const diff = Math.abs(((o.angle - runnerAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
      if (diff < o.w && o.track === currentTrack) {
        endRun();
      }
      if (runnerAngle > o.angle + Math.PI) {
        obstacles.splice(i, 1);
      }
    }

    if (flash > 0) {
      flash--;
      bellEl.style.opacity = flash % 20 < 10 ? "1" : "0.3";
    } else {
      bellEl.style.opacity = "1";
    }

    clockEl.textContent = fmtClock(LAP_TIME - lapClock);
  };

  const drawRunner = () => {
    const rad = getR(currentTrack);
    const px = cx + Math.cos(runnerAngle) * rad;
    const py = cy + Math.sin(runnerAngle) * rad;

    g.fillStyle = INK;
    g.beginPath();
    g.arc(px, py, 10, 0, Math.PI * 2);
    g.fill();

    // trail/glow
    g.strokeStyle = SOFT;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(px, py, 14, 0, Math.PI * 2);
    g.stroke();
  };

  const drawObstacle = (o) => {
    const rad = getR(o.track);
    const px = cx + Math.cos(o.angle) * rad;
    const py = cy + Math.sin(o.angle) * rad;

    if (o.type === "espaseta") {
      // Sword pointing from inner to outer
      const x1 = cx + Math.cos(o.angle) * (rad - 15);
      const y1 = cy + Math.sin(o.angle) * (rad - 15);
      const x2 = cx + Math.cos(o.angle) * (rad + 15);
      const y2 = cy + Math.sin(o.angle) * (rad + 15);
      
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      
      // Crossguard
      const s = Math.sin(o.angle);
      const c = Math.cos(o.angle);
      g.beginPath();
      g.moveTo(x1 - s * 8, y1 + c * 8);
      g.lineTo(x1 + s * 8, y1 - c * 8);
      g.stroke();
    } else {
      // Rubinada (puddle)
      g.strokeStyle = SOFT;
      g.lineWidth = 6;
      const half = o.w / 2;
      g.beginPath();
      for (let a = o.angle - half; a <= o.angle + half; a += 0.05) {
        const r = rad + Math.sin(time * 10 + a * 20) * 3;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (a === o.angle - half) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  };

  const render = () => {
    g.clearRect(0, 0, cw, ch);

    // Tracks
    g.strokeStyle = "rgba(218, 214, 199, 0.1)";
    g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, getR(0), 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, getR(1), 0, Math.PI * 2); g.stroke();

    // Start line / Bell
    const bx = cx + Math.cos(-Math.PI / 2) * R;
    const by = cy + Math.sin(-Math.PI / 2) * R;
    g.fillStyle = SECONDARY;
    g.beginPath(); g.arc(cx, cy - R, 6, 0, Math.PI * 2); g.fill();

    obstacles.forEach(drawObstacle);
    drawRunner();

    if (state === "idle" || state === "over") {
      g.fillStyle = "rgba(53, 70, 67, 0.7)";
      g.fillRect(0, 0, cw, ch);
      g.fillStyle = INK;
      g.textAlign = "center";
      g.font = "700 24px Oswald, sans-serif";
      
      if (state === "idle") {
        g.fillText("LA DARRERA VOLTA", cw / 2, ch / 2 - 20);
        g.font = "14px ui-monospace, monospace";
        g.fillText("TOCA PER CANVIAR DE CARRIL", cw / 2, ch / 2 + 20);
      } else {
        g.fillText("BACKYARD COMPLETAT", cw / 2, ch / 2 - 20);
        g.font = "16px ui-monospace, monospace";
        g.fillText(`${laps} voltes al bucle`, cw / 2, ch / 2 + 10);
        g.font = "12px ui-monospace, monospace";
        g.fillText("TOCA PER TORNAR A COMENÇAR", cw / 2, ch / 2 + 40);
      }
    }
  };

  const loop = (t) => {
    const dt = Math.min((t - lastT) / 1000, 0.1);
    lastT = t;
    time += dt;
    update(dt);
    render();
    rafId = requestAnimationFrame(loop);
  };

  const startRun = () => {
    resetGame();
    state = "run";
  };

  const toggleTrack = () => {
    if (state === "run") {
      currentTrack = 1 - currentTrack;
    } else {
      startRun();
    }
  };

  // Inputs
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") {
      e.preventDefault();
      toggleTrack();
    }
  });
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    toggleTrack();
  });
  btnStart.addEventListener("click", () => startRun());
  btnReset.addEventListener("click", () => {
    state = "idle";
    resetGame();
  });

  window.addEventListener("resize", () => {
    sizeGame();
    render();
  });

  sizeGame();
  resetGame();
  lastT = performance.now();
  rafId = requestAnimationFrame(loop);
})();
