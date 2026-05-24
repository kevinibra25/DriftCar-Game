/**
 * Playable Drift Car Game - Standalone Vanillaware Web Engine
 * Fully compatible with Vercel deployment.
 */

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    // Game stats HUD elements
    const scoreVal = document.getElementById("score-val");
    const multiplierVal = document.getElementById("multiplier-val");
    const speedVal = document.getElementById("speed-val");
    const rpmVal = document.getElementById("rpm-val");
    const rpmBar = document.getElementById("rpm-bar");
    const gearVal = document.getElementById("gear-val");
    
    const menuScreen = document.getElementById("menu-screen");
    const gameOverScreen = document.getElementById("game-over-screen");
    const driftAlert = document.getElementById("drift-alert");
    const driftCount = document.getElementById("drift-count");
    const driftMultDisp = document.getElementById("drift-multiplier");

    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const finalScore = document.getElementById("final-score");

    // Handling profiles
    const handlingConfig = {
        arcade: { accel: 0.17, reverse: 0.08, steerRate: 0.06, maxSteer: 0.52, maxSpeed: 9.5, lateralGrip: 0.13, handbrakeGrip: 0.02, drag: 0.02 },
        sport: { accel: 0.15, reverse: 0.07, steerRate: 0.05, maxSteer: 0.48, maxSpeed: 10.5, lateralGrip: 0.08, handbrakeGrip: 0.015, drag: 0.025 },
        hardcore: { accel: 0.13, reverse: 0.06, steerRate: 0.045, maxSteer: 0.42, maxSpeed: 11.5, lateralGrip: 0.05, handbrakeGrip: 0.01, drag: 0.03 }
    };

    // Active Selection Configurations
    let activeColor = "#3b82f6"; // default blue
    let config = handlingConfig.sport;
    let isPlaying = false;

    // Track Configuration (Stadium Oval Loop)
    const track = {
        color: "#10b981",
        bgColor: "#090f14",
        spawn: { x: 260, y: 140, angle: 0 },
        outer: [
            { x: 80, y: 80 }, { x: 920, y: 80 }, { x: 950, y: 150 }, 
            { x: 950, y: 450 }, { x: 920, y: 520 }, { x: 80, y: 520 }, 
            { x: 50, y: 450 }, { x: 50, y: 150 }, { x: 80, y: 80 }
        ],
        inner: [
            { x: 260, y: 220 }, { x: 740, y: 220 }, { x: 790, y: 270 },
            { x: 790, y: 330 }, { x: 740, y: 380 }, { x: 260, y: 380 },
            { x: 210, y: 330 }, { x: 210, y: 270 }, { x: 260, y: 220 }
        ],
        checkpoints: [
            { x: 500, y: 150, width: 140 }, // Top straight
            { x: 870, y: 300, width: 160 }, // Right turn apex
            { x: 500, y: 450, width: 140 }, // Bottom straight
            { x: 130, y: 300, width: 160 }  // Left turn apex
        ]
    };

    // Game Arrays
    let skidmarks = [];
    let particles = [];
    let obstacles = [];
    let nextCheckpoint = 0;
    let cumulScore = 0;
    let screenShake = 0;

    // Cones obstacles deep clone
    const baseObstacles = [
        { id: "c1", x: 125, y: 300, vx: 0, vy: 0, radius: 10, type: "cone" },
        { id: "c2", x: 875, y: 300, vx: 0, vy: 0, radius: 10, type: "cone" },
        { id: "c3", x: 500, y: 130, vx: 0, vy: 0, radius: 10, type: "cone" },
        { id: "c4", x: 500, y: 470, vx: 0, vy: 0, radius: 10, type: "cone" }
    ];

    // Player State
    const car = {
        x: track.spawn.x,
        y: track.spawn.y,
        vx: 0,
        vy: 0,
        angle: track.spawn.angle,
        steerAngle: 0,
        speed: 0,
        isDrifting: false,
        driftPoints: 0,
        driftChain: 0,
        driftMultiplier: 1,
        maxSpeed: 10,
        gear: 1,
        rpm: 1000
    };

    // Keyboard handlers
    const keys = {};
    window.addEventListener("keydown", (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === " " && isPlaying) {
            e.preventDefault(); // Lock screen scroll down
        }
    });
    window.addEventListener("keyup", (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // Color Setup Click Picker
    const colorBtns = document.querySelectorAll(".color-btn");
    colorBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            colorBtns.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            activeColor = e.target.getAttribute("data-color");
        });
    });

    // Start Button Trigger
    startBtn.addEventListener("click", () => {
        menuScreen.classList.add("hidden");
        const selectMode = document.getElementById("handling-select").value;
        config = handlingConfig[selectMode];
        car.maxSpeed = config.maxSpeed;
        initGame();
    });

    // Try Again
    restartBtn.addEventListener("click", () => {
        gameOverScreen.classList.add("hidden");
        initGame();
    });

    function initGame() {
        car.x = track.spawn.x;
        car.y = track.spawn.y;
        car.vx = 0;
        car.vy = 0;
        car.angle = track.spawn.angle;
        car.steerAngle = 0;
        car.speed = 0;
        car.isDrifting = false;
        car.driftPoints = 0;
        car.driftChain = 0;
        car.driftMultiplier = 1;
        car.rpm = 1000;
        car.gear = 1;

        skidmarks = [];
        particles = [];
        obstacles = baseObstacles.map(o => ({ ...o, angle: 0, angularVelocity: 0 }));
        nextCheckpoint = 0;
        cumulScore = 0;
        screenShake = 0;

        scoreVal.innerText = "000000";
        isPlaying = true;
    }

    // Standard bounding boxes crash calculations
    function calculateCollisions() {
        const carRadius = 13;

        const checkBoundary = (boundary) => {
            for (let i = 0; i < boundary.length - 1; i++) {
                const p1 = boundary[i];
                const p2 = boundary[i+1];
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const l2 = dx * dx + dy * dy;
                if (l2 === 0) continue;

                let t = ((car.x - p1.x) * dx + (car.y - p1.y) * dy) / l2;
                t = Math.max(0, Math.min(1, t));

                const projX = p1.x + t * dx;
                const projY = p1.y + t * dy;

                const distSqr = (car.x - projX) * (car.x - projX) + (car.y - projY) * (car.y - projY);
                const rSqr = carRadius * carRadius;

                if (distSqr < rSqr) {
                    const dist = Math.sqrt(distSqr);
                    const nx = dist > 0 ? (car.x - projX) / dist : 0;
                    const ny = dist > 0 ? (car.y - projY) / dist : -1;

                    // Push car out
                    const overlap = carRadius - dist;
                    car.x += nx * overlap;
                    car.y += ny * overlap;

                    // Bounce car back
                    const dot = car.vx * nx + car.vy * ny;
                    car.vx = (car.vx - 2 * dot * nx) * 0.45;
                    car.vy = (car.vy - 2 * dot * ny) * 0.45;

                    // Reduce points slightly on wall scrape
                    if (car.driftPoints > 0) {
                        car.driftPoints = Math.round(car.driftPoints * 0.8);
                        car.driftMultiplier = 1;
                        car.driftChain = 0;
                    }

                    screenShake = 12;
                    spitSparks(projX, projY, nx, ny);

                    // End game if crashed extremely hard (e.g. going full speed)
                    if (Math.abs(car.speed) > 7.5) {
                        handleGameOver();
                    }
                }
            }
        };

        checkBoundary(track.outer);
        checkBoundary(track.inner);

        // Checkpoints loop
        const cp = track.checkpoints[nextCheckpoint];
        const distToCP = Math.sqrt((car.x - cp.x) ** 2 + (car.y - cp.y) ** 2);
        if (distToCP < cp.width / 2 + carRadius) {
            cumulScore += 1000 + car.driftPoints * car.driftMultiplier;
            car.driftPoints = 0;
            car.driftMultiplier = Math.min(10, car.driftMultiplier + 1);
            nextCheckpoint = (nextCheckpoint + 1) % track.checkpoints.length;
            scoreVal.innerText = String(cumulScore).padStart(6, "0");
        }

        // Cone obstacles
        obstacles.forEach(o => {
            const odx = car.x - o.x;
            const ody = car.y - o.y;
            const odist = Math.sqrt(odx * odx + ody * ody);
            const rSum = o.radius + carRadius;

            if (odist < rSum) {
                screenShake = 4;
                const onx = odx / odist;
                const ony = ody / odist;
                const overlap = rSum - odist;

                o.x -= onx * overlap * 0.7;
                o.y -= ony * overlap * 0.7;

                o.vx -= onx * Math.abs(car.vx * 0.8);
                o.vy -= ony * Math.abs(car.vy * 0.8);
                o.angularVelocity = (Math.random() - 0.5) * 0.4;

                car.vx *= 0.7;
                car.vy *= 0.7;
            }

            // Apply inertia update
            o.x += o.vx;
            o.y += o.vy;
            o.vx *= 0.9;
            o.vy *= 0.9;
        });
    }

    function spitSparks(x, y, nx, ny) {
        for (let s = 0; s < 8; s++) {
            particles.push({
                x, y,
                vx: (nx + (Math.random() - 0.5) * 1.5) * (Math.random() * 3 + 2),
                vy: (ny + (Math.random() - 0.5) * 1.5) * (Math.random() * 3 + 2),
                size: Math.random() * 2 + 1,
                opacity: 1.0,
                color: "#ff8c00",
                type: "spark",
                life: 0,
                maxLife: 20
            });
        }
    }

    function handleGameOver() {
        isPlaying = false;
        finalScore.innerText = cumulScore + car.driftPoints * car.driftMultiplier;
        gameOverScreen.classList.remove("hidden");
    }

    // Core physics tick updates
    function updatePhysics() {
        // Controls reading
        const moveUp = keys["arrowup"] || keys["w"];
        const moveDown = keys["arrowdown"] || keys["s"];
        const steerLeft = keys["arrowleft"] || keys["a"];
        const steerRight = keys["arrowright"] || keys["d"];
        const handbrake = keys[" "];

        const forwardX = Math.cos(car.angle);
        const forwardY = Math.sin(car.angle);
        const rightX = -Math.sin(car.angle);
        const rightY = Math.cos(car.angle);

        // Project velocity
        const forwardSpeed = car.vx * forwardX + car.vy * forwardY;
        const lateralSpeed = car.vx * rightX + car.vy * rightY;
        car.speed = forwardSpeed;

        let accelForce = 0;
        if (moveUp) accelForce = config.accel * (handbrake ? 0.25 : 1.0);
        else if (moveDown) accelForce = -config.reverse;

        let targetSteer = 0;
        if (steerLeft) targetSteer = -config.maxSteer;
        else if (steerRight) targetSteer = config.maxSteer;
        car.steerAngle += (targetSteer - car.steerAngle) * config.steerRate;

        // Turn angular calculations
        const speedRatio = Math.min(1.0, Math.abs(forwardSpeed) / 4.0);
        let yaw = car.steerAngle * speedRatio * 0.12;
        if (handbrake) yaw *= 1.6;
        car.angle += yaw;

        // Grip evaluation
        let grip = config.lateralGrip;
        if (handbrake) grip = config.handbrakeGrip;

        const isSliding = Math.abs(lateralSpeed) > 1.8 || handbrake;
        if (isSliding) {
            car.isDrifting = true;
            grip *= 0.35;
        } else {
            car.isDrifting = false;
        }

        const newForward = (forwardSpeed + accelForce) * (1 - config.drag);
        const newLateral = lateralSpeed * (1 - grip);

        car.vx = forwardX * newForward + rightX * newLateral;
        car.vy = forwardY * newForward + rightY * newLateral;

        car.x += car.vx;
        car.y += car.vy;

        // Engine and indicators stats calculations
        const speedKmh = Math.round(Math.abs(car.speed) * 12);
        speedVal.innerText = speedKmh;

        // RPM/Gears simulation
        if (speedKmh < 24) car.gear = 1;
        else if (speedKmh < 50) car.gear = 2;
        else if (speedKmh < 85) car.gear = 3;
        else car.gear = 4;
        gearVal.innerText = car.gear;

        const targetRPM = moveUp ? 2000 + (speedKmh * 55) : 1000 + (speedKmh * 20);
        car.rpm += (targetRPM - car.rpm) * 0.12;
        rpmVal.innerText = Math.round(car.rpm);
        
        const rpmCap = Math.min(100, (car.rpm / 8000) * 100);
        rpmBar.style.width = `${rpmCap}%`;
        if (car.rpm > 6500) {
            rpmBar.style.backgroundColor = "#ef4444"; // redline
        } else {
            rpmBar.style.backgroundColor = "#10b981"; // green standard
        }

        // Drifting Chains multiplier accumulate
        if (car.isDrifting && Math.abs(car.speed) > 1.5) {
            car.driftPoints += Math.round(Math.abs(lateralSpeed) * 3);
            car.driftChain++;
            if (car.driftChain % 200 === 0 && car.driftMultiplier < 10) {
                car.driftMultiplier++;
            }
            showDriftHUD();
        } else {
            hideDriftHUD();
        }
    }

    function showDriftHUD() {
        driftAlert.classList.remove("hidden");
        driftCount.innerText = `+${car.driftPoints} pts`;
        driftMultDisp.innerText = `Multiplier x${car.driftMultiplier}`;
        multiplierVal.innerText = `x${car.driftMultiplier}`;
    }

    function hideDriftHUD() {
        if (!driftAlert.classList.contains("hidden")) {
            driftAlert.classList.add("hidden");
            cumulScore += car.driftPoints * car.driftMultiplier;
            car.driftPoints = 0;
            car.driftMultiplier = 1;
            car.driftChain = 0;
            scoreVal.innerText = String(cumulScore).padStart(6, "0");
        }
    }

    function updateParticles() {
        const speed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
        const h = car.angle;
        
        // Spawn Skidmarks
        if (speed > 1.5 && (car.isDrifting || keys[" "])) {
            skidmarks.push({ x: car.x - Math.cos(h) * 10, y: car.y - Math.sin(h) * 10 });
            if (skidmarks.length > 500) skidmarks.shift();

            // Emit white exhaust smoke
            particles.push({
                x: car.x - Math.cos(h) * 12,
                y: car.y - Math.sin(h) * 12,
                vx: -car.vx * 0.2 + (Math.random() - 0.5),
                vy: -car.vy * 0.2 + (Math.random() - 0.5),
                size: Math.random() * 5 + 4,
                opacity: 0.6,
                color: "#cbd5e1",
                life: 0,
                maxLife: 25
            });
        }

        particles.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            p.opacity = 1 - p.life / p.maxLife;
            if (p.life >= p.maxLife) {
                particles.splice(idx, 1);
            }
        });
    }

    function render() {
        ctx.save();
        if (screenShake > 0.1) {
            ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
            screenShake *= 0.88;
        }

        // 1. Clear background
        ctx.fillStyle = track.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // 2. Draw Skidmarks
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        skidmarks.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Draw Track
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 10;
        ctx.shadowBlur = 8;
        ctx.shadowColor = track.color;
        
        ctx.beginPath();
        ctx.moveTo(track.outer[0].x, track.outer[0].y);
        track.outer.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Inner barrier
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(track.inner[0].x, track.inner[0].y);
        track.inner.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Checkpoint indicators
        const currentCP = track.checkpoints[nextCheckpoint];
        ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(currentCP.x, currentCP.y, currentCP.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4. Draw Cones
        obstacles.forEach(o => {
            ctx.fillStyle = "#f97316";
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
            ctx.fill();
            // Black cone base stripe
            ctx.fillStyle = "#020617";
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        });

        // 5. Draw particles
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 6. Draw player Sportscar
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);

        // Headlights glow
        const grad = ctx.createRadialGradient(20, 0, 5, 80, 0, 60);
        grad.addColorStop(0, "rgba(253, 224, 71, 0.3)");
        grad.addColorStop(1, "rgba(253, 224, 71, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(15, -5);
        ctx.lineTo(82, -45);
        ctx.lineTo(82, 45);
        ctx.lineTo(15, 5);
        ctx.closePath();
        ctx.fill();

        // Wheels
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(8, -12, 12, 6);
        ctx.fillRect(8, 6, 12, 6);
        ctx.fillRect(-16, -12, 12, 6);
        ctx.fillRect(-16, 6, 12, 6);

        // Chassis
        ctx.fillStyle = activeColor;
        ctx.fillRect(-18, -9, 36, 18);

        // Windshield canopy glass
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-4, -6, 14, 12);
        ctx.fillStyle = "#334155";
        ctx.fillRect(-2, -5, 10, 10);

        // Back spoilers wing carbon
        ctx.fillStyle = "#020617";
        ctx.fillRect(-20, -11, 4, 22);

        ctx.restore();
        ctx.restore();
    }

    function gameLoop() {
        if (isPlaying) {
            updatePhysics();
            calculateCollisions();
            updateParticles();
            render();
        }
        requestAnimationFrame(gameLoop);
    }

    // Load Loop
    gameLoop();
});
