(() => {
    const pista = document.getElementById("pista");
    const cv = document.getElementById("gameCanvas");
    const g = cv.getContext("2d");
    const scoreEl = document.getElementById("gameScore");
    const bestEl = document.getElementById("gameBest");
    const msgEl = document.getElementById("gameMsg");
    const btnStart = document.getElementById("btnStart");
    const btnReset = document.getElementById("btnReset");

    const COLORS = {
        INK: "#dad6c7",
        SOFT: "#8fa89a",
        SECONDARY: "#5e7969",
        BG: "#354643"
    };

    let cw, ch, cx, cy, baseR, gdpr;
    let state = "idle"; // idle, run, over
    let lastT = 0;
    let time = 0;
    let score = 0;
    let bestScore = 0;

    // Player
    let player = {
        angle: 0,
        orbit: 0.4, // 0 to 1
        targetOrbit: 0.4,
        speed: 2,
        radius: 8
    };

    let obstacles = [];
    let particles = [];
    let sparks = [];
    let spawnTimer = 0;
    let difficulty = 1;

    try {
        bestScore = Number(localStorage.getItem("espaseta-vortex-best")) || 0;
    } catch (e) {}

    const sizeGame = () => {
        gdpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = pista.getBoundingClientRect();
        cw = rect.width;
        ch = rect.height;
        cx = cw / 2;
        cy = ch / 2;
        baseR = Math.min(cw, ch) * 0.45;
        cv.width = Math.round(cw * gdpr);
        cv.height = Math.round(ch * gdpr);
        g.setTransform(gdpr, 0, 0, gdpr, 0, 0);
    };

    const resetGame = () => {
        score = 0;
        difficulty = 1;
        player.angle = 0;
        player.orbit = 0.4;
        player.targetOrbit = 0.4;
        obstacles = [];
        sparks = [];
        particles = [];
        spawnTimer = 0;
        updateUI();
        msgEl.classList.add("hidden");
    };

    const updateUI = () => {
        scoreEl.textContent = `${Math.floor(score)} punts`;
        bestEl.textContent = `Rècord: ${Math.floor(bestScore)}`;
    };

    const spawnObstacle = () => {
        const type = Math.random() > 0.3 ? "shard" : "ring";
        if (type === "shard") {
            const angle = Math.random() * Math.PI * 2;
            obstacles.push({
                type: "shard",
                angle: angle,
                dist: 0,
                speed: 0.2 + Math.random() * 0.3 * difficulty,
                w: 0.1 + Math.random() * 0.2
            });
        } else {
            obstacles.push({
                type: "ring",
                dist: 0,
                speed: 0.15 * difficulty,
                gap: Math.random() * Math.PI * 2,
                gapW: 0.8
            });
        }
    };

    const spawnSpark = () => {
        sparks.push({
            angle: Math.random() * Math.PI * 2,
            orbit: 0.2 + Math.random() * 0.7,
            life: 5
        });
    };

    const endRun = () => {
        state = "over";
        if (score > bestScore) {
            bestScore = score;
            try {
                localStorage.setItem("espaseta-vortex-best", String(Math.floor(bestScore)));
            } catch (e) {}
        }
        msgEl.classList.remove("hidden");
        updateUI();
    };

    const update = (dt) => {
        if (state !== "run") return;

        time += dt;
        score += dt * 5;
        difficulty = 1 + score / 500;

        // Player movement
        player.angle += player.speed * dt;
        player.orbit += (player.targetOrbit - player.orbit) * 5 * dt;

        const pr = player.orbit * baseR;
        const px = cx + Math.cos(player.angle) * pr;
        const py = cy + Math.sin(player.angle) * pr;

        // Spawn logic
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            spawnObstacle();
            if (Math.random() > 0.5) spawnSpark();
            spawnTimer = Math.max(0.4, 1.5 - score / 200);
        }

        // Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            o.dist += o.speed * dt;

            const or = o.dist * baseR;
            
            // Collision
            if (Math.abs(o.dist - player.orbit) < 0.05) {
                if (o.type === "shard") {
                    const diff = Math.abs(((o.angle - player.angle + Math.PI) % (Math.PI * 2)) - Math.PI);
                    if (diff < o.w) endRun();
                } else if (o.type === "ring") {
                    const diff = Math.abs(((o.gap - player.angle + Math.PI) % (Math.PI * 2)) - Math.PI);
                    if (diff > o.gapW) endRun();
                }
            }

            if (o.dist > 1.2) obstacles.splice(i, 1);
        }

        // Sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.life -= dt;
            const sr = s.orbit * baseR;
            const sx = cx + Math.cos(s.angle) * sr;
            const sy = cy + Math.sin(s.angle) * sr;
            
            const d = Math.hypot(px - sx, py - sy);
            if (d < player.radius + 10) {
                score += 50;
                sparks.splice(i, 1);
                updateUI();
                for(let j=0; j<8; j++) particles.push({x:sx, y:sy, vx:(Math.random()-0.5)*100, vy:(Math.random()-0.5)*100, l:0.5});
            } else if (s.life <= 0) {
                sparks.splice(i, 1);
            }
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.l -= dt;
            if (p.l <= 0) particles.splice(i, 1);
        }

        updateUI();
    };

    const drawEspaseta = (x, y, angle, size) => {
        g.save();
        g.translate(x, y);
        g.rotate(angle + Math.PI / 2);
        
        // Blade
        g.strokeStyle = COLORS.INK;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, -size);
        g.lineTo(0, size * 0.5);
        g.stroke();
        
        // Guard
        g.beginPath();
        g.moveTo(-size * 0.4, 0);
        g.lineTo(size * 0.4, 0);
        g.stroke();
        
        g.restore();
    };

    const render = () => {
        g.clearRect(0, 0, cw, ch);

        // Vortex Background
        g.strokeStyle = COLORS.SECONDARY;
        g.lineWidth = 1;
        g.globalAlpha = 0.2;
        for (let i = 1; i <= 5; i++) {
            g.beginPath();
            g.arc(cx, cy, baseR * (i / 5), 0, Math.PI * 2);
            g.stroke();
        }
        g.globalAlpha = 1;

        // Center Pulsing
        const pulse = Math.sin(time * 5) * 5;
        g.fillStyle = COLORS.SECONDARY;
        g.beginPath();
        g.arc(cx, cy, 10 + pulse, 0, Math.PI * 2);
        g.fill();

        // Sparks
        sparks.forEach(s => {
            const r = s.orbit * baseR;
            g.fillStyle = COLORS.INK;
            g.beginPath();
            g.arc(cx + Math.cos(s.angle) * r, cy + Math.sin(s.angle) * r, 3, 0, Math.PI * 2);
            g.fill();
        });

        // Obstacles
        obstacles.forEach(o => {
            const r = o.dist * baseR;
            g.strokeStyle = COLORS.INK;
            g.lineWidth = 3;
            if (o.type === "shard") {
                g.beginPath();
                g.arc(cx, cy, r, o.angle - o.w, o.angle + o.w);
                g.stroke();
            } else {
                g.beginPath();
                g.arc(cx, cy, r, o.gap + o.gapW, o.gap - o.gapW);
                g.stroke();
            }
        });

        // Particles
        particles.forEach(p => {
            g.fillStyle = COLORS.INK;
            g.globalAlpha = p.l * 2;
            g.fillRect(p.x, p.y, 2, 2);
        });
        g.globalAlpha = 1;

        // Player
        const pr = player.orbit * baseR;
        const px = cx + Math.cos(player.angle) * pr;
        const py = cy + Math.sin(player.angle) * pr;
        drawEspaseta(px, py, player.angle, 12);
        
        // Orbit line preview
        g.setLineDash([5, 5]);
        g.strokeStyle = COLORS.SOFT;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx, cy, player.targetOrbit * baseR, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);

        if (state === "idle") {
            g.fillStyle = "rgba(53, 70, 67, 0.8)";
            g.fillRect(0, 0, cw, ch);
            g.fillStyle = COLORS.INK;
            g.textAlign = "center";
            g.font = "700 30px Oswald";
            g.fillText("ESPASETA VORTEX", cw / 2, ch / 2 - 40);
            g.font = "16px monospace";
            g.fillText("MANTÉN PREMUT PER EXPANDIR L'ÒRBITA", cw / 2, ch / 2 + 20);
            g.fillText("ESQUIVA ELS FRAGMENTS DEL VORTEX", cw / 2, ch / 2 + 45);
        }
    };

    const loop = (t) => {
        const dt = Math.min((t - lastT) / 1000, 0.1);
        lastT = t;
        update(dt);
        render();
        requestAnimationFrame(loop);
    };

    const startRun = () => {
        resetGame();
        state = "run";
    };

    const handleInput = (active) => {
        if (state === "run") {
            player.targetOrbit = active ? 0.9 : 0.2;
        } else if (active && state !== "run") {
            // Check if clicking buttons instead? 
            // Simple logic: if click was not on buttons
        }
    };

    // Events
    cv.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (state !== "run") startRun();
        handleInput(true);
    });
    cv.addEventListener("pointerup", () => handleInput(false));
    cv.addEventListener("pointerleave", () => handleInput(false));

    window.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
            if (state !== "run") startRun();
            handleInput(true);
        }
    });
    window.addEventListener("keyup", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") handleInput(false);
    });

    btnStart.addEventListener("click", (e) => {
        e.stopPropagation();
        startRun();
    });
    btnReset.addEventListener("click", (e) => {
        e.stopPropagation();
        state = "idle";
        resetGame();
    });

    window.addEventListener("resize", sizeGame);
    sizeGame();
    resetGame();
    requestAnimationFrame(loop);
})();
