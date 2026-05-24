import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { CarState, Particle, Obstacle, Track, Vector2D } from "../types";
import { audioEngine } from "./SoundEngine";

interface GameCanvasProps {
  track: Track;
  carColor: string;
  handling: "arcade" | "sport" | "hardcore";
  volume: number;
  showVirtualControls?: boolean;
  onUpdateStats: (speed: number, score: number, multiplier: number, driftPts: number, chain: number, gear: number, rpm: number) => void;
  onCrossCheckpoint: (index: number) => void;
  onCollision: () => void;
}

export interface GameCanvasHandle {
  resetGame: () => void;
}

function isPointInPolygon(x: number, y: number, polygon: Vector2D[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({
  track,
  carColor,
  handling,
  volume,
  showVirtualControls = true,
  onUpdateStats,
  onCrossCheckpoint,
  onCollision
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Physics config depending on handling
  const config = {
    arcade: { accel: 0.16, reverse: 0.08, steerRate: 0.05, maxSteer: 0.52, maxSpeed: 10, lateralGrip: 0.12, handbrakeGrip: 0.02, drag: 0.02 },
    sport: { accel: 0.14, reverse: 0.07, steerRate: 0.045, maxSteer: 0.48, maxSpeed: 11, lateralGrip: 0.08, handbrakeGrip: 0.015, drag: 0.025 },
    hardcore: { accel: 0.12, reverse: 0.06, steerRate: 0.038, maxSteer: 0.42, maxSpeed: 12, lateralGrip: 0.05, handbrakeGrip: 0.01, drag: 0.03 },
  }[handling];

  // Particle tracking
  const particlesRef = useRef<Particle[]>([]);
  const skidmarksRef = useRef<{ x1: number; y1: number; x2: number; y2: number; opacity: number }[]>([]);
  
  // Game state
  const carRef = useRef<CarState>({
    x: track.spawnPoint.x,
    y: track.spawnPoint.y,
    vx: 0, vy: 0,
    angle: track.spawnPoint.angle,
    steerAngle: 0,
    speed: 0,
    driftAngle: 0,
    isDrifting: false,
    driftPoints: 0,
    driftChain: 0,
    driftMultiplier: 1,
    maxSpeed: config.maxSpeed,
    handling,
    color: carColor,
    rpm: 1000,
    gear: 1
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const currentCheckpointRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);

  // Keyboard state
  const keys = useRef<{ [key: string]: boolean }>({});

  // Mobile virtual joystick state
  const [isMobile, setIsMobile] = useState(false);
  const activeLeft = useRef(false);
  const activeRight = useRef(false);
  const activeGas = useRef(false);
  const activeBrake = useRef(false);
  const activeHandbrake = useRef(false);

  // Synchronized visual state for buttons (tracks both mouse/touch and keyboard)
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);
  const [slidePressed, setSlidePressed] = useState(false);

  // Helper setters that keep both ref and state updated
  const setLeftInput = (val: boolean) => {
    activeLeft.current = val;
    setLeftPressed(val);
  };
  const setRightInput = (val: boolean) => {
    activeRight.current = val;
    setRightPressed(val);
  };
  const setGasInput = (val: boolean) => {
    activeGas.current = val;
    setGasPressed(val);
  };
  const setBrakeInput = (val: boolean) => {
    activeBrake.current = val;
    setBrakePressed(val);
  };
  const setHandbrakeInput = (val: boolean) => {
    activeHandbrake.current = val;
    setSlidePressed(val);
  };

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sync settings/prop edits
  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    resetGame();
  }, [track, handling, carColor]);

  const resetGame = () => {
    const car = carRef.current;
    car.x = track.spawnPoint.x;
    car.y = track.spawnPoint.y;
    car.vx = 0;
    car.vy = 0;
    car.angle = track.spawnPoint.angle;
    car.steerAngle = 0;
    car.speed = 0;
    car.driftAngle = 0;
    car.isDrifting = false;
    car.driftPoints = 0;
    car.driftChain = 0;
    car.driftMultiplier = 1;
    car.maxSpeed = config.maxSpeed;
    car.rpm = 1000;
    car.gear = 1;
    car.color = carColor;

    // Reset components
    particlesRef.current = [];
    skidmarksRef.current = [];
    currentCheckpointRef.current = 0;
    screenShakeRef.current = 0;
    
    // Setup deep-copy obstacles of the selected track
    obstaclesRef.current = track.obstacles.map(o => ({ ...o }));

    onUpdateStats(0, 0, 1, 0, 0, 1, 1000);
  };

  useImperativeHandle(ref, () => ({
    resetGame
  }));

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      audioEngine.init(); // User gesture trigger

      // Prevent space scrolling the browser window while gaming
      if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
        e.preventDefault();
      }

      if (k === "w" || k === "arrowup") {
        setGasPressed(true);
      }
      if (k === "s" || k === "arrowdown") {
        setBrakePressed(true);
      }
      if (k === "a" || k === "arrowleft") {
        setLeftPressed(true);
      }
      if (k === "d" || k === "arrowright") {
        setRightPressed(true);
      }
      if (k === " " || k === "spacebar") {
        setSlidePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = false;

      if (k === "w" || k === "arrowup") {
        setGasPressed(activeGas.current);
      }
      if (k === "s" || k === "arrowdown") {
        setBrakePressed(activeBrake.current);
      }
      if (k === "a" || k === "arrowleft") {
        setLeftPressed(activeLeft.current);
      }
      if (k === "d" || k === "arrowright") {
        setRightPressed(activeRight.current);
      }
      if (k === " " || k === "spacebar") {
        setSlidePressed(activeHandbrake.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Main Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updatePhysics = () => {
      const car = carRef.current;
      
      // Determine input states (merge keyboard and virtual screen controls)
      const input = {
        gas: keys.current["arrowup"] || keys.current["w"] || activeGas.current,
        brake: keys.current["arrowdown"] || keys.current["s"] || activeBrake.current,
        left: keys.current["arrowleft"] || keys.current["a"] || activeLeft.current,
        right: keys.current["arrowright"] || keys.current["d"] || activeRight.current,
        slide: keys.current[" "] || keys.current["spacebar"] || activeHandbrake.current,
      };

      const moveUp = input.gas;
      const moveDown = input.brake;
      const steerLeft = input.left;
      const steerRight = input.right;
      const handbrake = input.slide;

      const forwardX = Math.cos(car.angle);
      const forwardY = Math.sin(car.angle);
      const rightX = -Math.sin(car.angle);
      const rightY = Math.cos(car.angle);

      // Project current speed onto coordinate axis
      const speedX = car.vx;
      const speedY = car.vy;
      const forwardSpeed = speedX * forwardX + speedY * forwardY;
      const lateralSpeed = speedX * rightX + speedY * rightY;

      car.speed = forwardSpeed;

      // Handle Acceleration & Braming
      let accelForce = 0;
      if (moveUp) {
        accelForce = config.accel * (handbrake ? 0.2 : 1.0);
      } else if (moveDown) {
        // Active reverse or hard engine brake
        accelForce = -config.reverse;
      }

      // Dynamic Steering Input
      let targetSteer = 0;
      if (steerLeft) {
        targetSteer = -config.maxSteer;
      } else if (steerRight) {
        targetSteer = config.maxSteer;
      }
      
      // Interpolate steering for premium smooth corner entry
      car.steerAngle += (targetSteer - car.steerAngle) * config.steerRate;

      // Handle cornering rotatary speed based on steer angle and velocity
      const corneringRatio = Math.min(1.0, Math.abs(forwardSpeed) / 4.0);
      let turnInput = car.steerAngle * corneringRatio * 0.11;
      
      // Boost snap-turn angular motion when handbrake pulled
      if (handbrake) {
        turnInput *= 1.65;
      }
      
      car.angle += turnInput;

      // Drifting detection & traction grip breaking
      let gripCoeff = config.lateralGrip;
      if (handbrake) {
        gripCoeff = config.handbrakeGrip;
      }

      // Break grip if sideways slip force is enormous
      const slipFactor = Math.abs(lateralSpeed);
      const isSlipping = slipFactor > 1.85 || handbrake;
      
      if (isSlipping) {
        car.isDrifting = true;
        // Slide sliding traction decays drastically
        gripCoeff *= 0.35;
      } else {
        car.isDrifting = false;
      }

      // Calculate new speeds
      const newForwardSpeed = (forwardSpeed + accelForce) * (1 - config.drag);
      const newLateralSpeed = lateralSpeed * (1 - gripCoeff);

      // Convert back to workspace coordinate speeds
      car.vx = forwardX * newForwardSpeed + rightX * newLateralSpeed;
      car.vy = forwardY * newForwardSpeed + rightY * newLateralSpeed;

      // Save previous position in case we need to roll back
      const prevX = car.x;
      const prevY = car.y;

      // Integrate positions
      car.x += car.vx;
      car.y += car.vy;

      // Out of bounds check
      const isInsideOuter = isPointInPolygon(car.x, car.y, track.boundaryOuter);
      const isInsideInner = track.boundaryInner && track.boundaryInner.length > 0
        ? isPointInPolygon(car.x, car.y, track.boundaryInner)
        : false;

      // The car is out of bounds if it's NOT inside outer, or IS inside inner
      const oob = !isInsideOuter || isInsideInner;

      if (oob) {
        // Roll back position to previous valid one
        car.x = prevX;
        car.y = prevY;
        
        // Bounce the momentum slightly to simulate hitting a soft wall
        car.vx *= -0.3;
        car.vy *= -0.3;
        car.speed *= -0.3;
        
        // Decay score/drift points when hitting the boundaries
        if (car.driftPoints > 0) {
          car.driftPoints = Math.round(car.driftPoints * 0.95);
        }
      }

      // Keep car bound inside screen arena
      if (car.x < 15) { car.x = 15; car.vx *= -0.4; }
      if (car.x > 985) { car.x = 985; car.vx *= -0.4; }
      if (car.y < 15) { car.y = 15; car.vy *= -0.4; }
      if (car.y > 685) { car.y = 685; car.vy *= -0.4; }

      // Calculate RPM & Gear simulation
      const absoluteSpeed = Math.abs(car.speed);
      const maxSpd = config.maxSpeed;
      
      // Speed thresholds for gears
      if (absoluteSpeed < 2.5) car.gear = 1;
      else if (absoluteSpeed < 5) car.gear = 2;
      else if (absoluteSpeed < 8) car.gear = 3;
      else car.gear = 4;

      let targetRpm = 1000;
      if (absoluteSpeed > 0.1) {
        const gearSpeedMin = (car.gear - 1) * (maxSpd / 4);
        const gearSpeedMax = car.gear * (maxSpd / 4);
        const gearProgress = (absoluteSpeed - gearSpeedMin) / (gearSpeedMax - gearSpeedMin);
        targetRpm = 1500 + Math.min(7500, gearProgress * 6500) + (moveUp ? Math.random() * 200 : 0);
      } else if (moveUp) {
        targetRpm = 3500 + Math.random() * 500;
      }
      car.rpm += (targetRpm - car.rpm) * 0.15;

      // Accumulating Drift Chains & Multipliers
      if (car.isDrifting && absoluteSpeed > 1.5 && Math.abs(lateralSpeed) > 0.6) {
        const framePts = Math.round(Number(Math.abs(lateralSpeed) * 35));
        car.driftPoints += framePts;
        
        // Boost chain progress
        car.driftChain += 1;
        if (car.driftChain % 180 === 0 && car.driftMultiplier < 10) {
          car.driftMultiplier = Math.min(10, car.driftMultiplier + 1);
          audioEngine.playCheckPoint();
        }
      } else if (!car.isDrifting && car.driftPoints > 0) {
        // Let drift decay slowly or settle if no slip for 1 second
        car.driftChain = 0;
        // We persist accumulated high score but reset frame values
      }

      // Handle Sound Updates
      audioEngine.update(car.speed, maxSpd, car.isDrifting, car.driftPoints, moveUp);
    };

    const handleCollisions = () => {
      const car = carRef.current;
      const carRadius = 14;

      // Outer barrier bounce check
      const checkBoundaryCollision = (boundary: Vector2D[]) => {
        for (let i = 0; i < boundary.length - 1; i++) {
          const p1 = boundary[i];
          const p2 = boundary[i+1];
          
          // Distance from point to line segment
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
            const bouncePower = 0.55;

            // Collision normal vector pointing away from barrier
            const nx = dist > 0 ? (car.x - projX) / dist : 0;
            const ny = dist > 0 ? (car.y - projY) / dist : -1;

            // Push car out of boundary overlap
            const overlap = carRadius - dist;
            car.x += nx * overlap;
            car.y += ny * overlap;

            // Calculate outgoing recoil velocity
            const dot = car.vx * nx + car.vy * ny;
            car.vx = (car.vx - 2 * dot * nx) * bouncePower;
            car.vy = (car.vy - 2 * dot * ny) * bouncePower;

            // Reset current drift multiplier as penalty for hitting the barriers!
            if (car.driftPoints > 0) {
              car.driftPoints = Math.round(car.driftPoints * 0.7); // 30% penalty
              car.driftMultiplier = 1;
              car.driftChain = 0;
            }

            // Trigger visual feedback
            screenShakeRef.current = 15;
            audioEngine.playCollision();
            onCollision();

            // Spawn sparks particles
            for (let s = 0; s < 12; s++) {
              particlesRef.current.push({
                id: Math.random().toString(),
                x: projX,
                y: projY,
                vx: (nx + (Math.random() - 0.5) * 1.5) * (Math.random() * 4 + 2),
                vy: (ny + (Math.random() - 0.5) * 1.5) * (Math.random() * 4 + 2),
                size: Math.random() * 2.5 + 1.5,
                opacity: 1.0,
                color: "#ff8c00", // Bright sparks
                type: "spark",
                life: 0,
                maxLife: 20 + Math.random() * 15
              });
            }
          }
        }
      };

      checkBoundaryCollision(track.boundaryOuter);
      checkBoundaryCollision(track.boundaryInner);

      // Checkpoint Crossing Collision
      const nextCheckpointIdx = currentCheckpointRef.current;
      const cp = track.checkpoints[nextCheckpointIdx];
      if (cp) {
        const dx = car.x - cp.x;
        const dy = car.y - cp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < cp.width / 2 + carRadius) {
          // Crossed checkpoint!
          audioEngine.playCheckPoint();
          onCrossCheckpoint(nextCheckpointIdx);
          currentCheckpointRef.current = (nextCheckpointIdx + 1) % track.checkpoints.length;
          
          // Award checkpoint drift multiplier check
          car.driftPoints += 500;
          
          // Pulse green visual particles around checkpoint pylon
          for (let pIdx = 0; pIdx < 15; pIdx++) {
            particlesRef.current.push({
              id: Math.random().toString(),
              x: cp.x + (Math.random() - 0.5) * cp.width,
              y: cp.y + (Math.random() - 0.5) * 30,
              vx: (Math.random() - 0.5) * 2,
              vy: -Math.random() * 3 - 1,
              size: Math.random() * 4 + 2,
              opacity: 0.9,
              color: "#10b981", // Emerald success particles
              type: "smoke",
              life: 0,
              maxLife: 35 + Math.random() * 20
            });
          }
        }
      }

      // Obstacles collisions & cross obstacle scatter
      const obstacles = obstaclesRef.current;
      for (let o of obstacles) {
        const dx = car.x - o.x;
        const dy = car.y - o.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const contactDist = o.radius + carRadius;

        if (dist < contactDist) {
          audioEngine.playCollision();
          screenShakeRef.current = 5;

          // Push barrier obstacle away
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = contactDist - dist;

          // Offset obstacle position
          o.x -= nx * overlap * 0.7;
          o.y -= ny * overlap * 0.7;

          // Transfer momentum to obstacle
          const impulseX = car.vx * 0.8;
          const impulseY = car.vy * 0.8;
          o.vx -= nx * Math.abs(impulseX);
          o.vy -= ny * Math.abs(impulseY);
          
          // Rotation friction
          o.angularVelocity = (Math.random() - 0.5) * 0.45;

          // Decelerate car slightly
          car.vx *= 0.65;
          car.vy *= 0.65;
        }

        // Apply friction & boundary limits to moving obstacles
        o.x += o.vx;
        o.y += o.vy;
        o.angle += o.angularVelocity;

        o.vx *= 0.92; // high friction
         o.vy *= 0.92;
        o.angularVelocity *= 0.90;

        // Keep obstacles bound inside screen arena
        if (o.x < 15) { o.x = 15; o.vx *= -0.5; }
        if (o.x > 985) { o.x = 985; o.vx *= -0.5; }
        if (o.y < 15) { o.y = 15; o.vy *= -0.5; }
        if (o.y > 685) { o.y = 685; o.vy *= -0.5; }
      }
    };

    const updateParticles = () => {
      const car = carRef.current;
      const particles = particlesRef.current;
      const skidmarks = skidmarksRef.current;

      // Spawn real-time tire exhaust smoke and tire skidmarks
      const isBraking = keys.current["arrowdown"] || keys.current["s"] || activeBrake.current;
      const handbrake = keys.current[" "] || keys.current["spacebar"] || activeHandbrake.current;
      const speed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
      
      const radHeading = car.angle;
      const leftWheelOffset = { x: -Math.sin(radHeading) * 10 - Math.cos(radHeading) * 12, y: Math.cos(radHeading) * 10 - Math.sin(radHeading) * 12 };
      const rightWheelOffset = { x: Math.sin(radHeading) * 10 - Math.cos(radHeading) * 12, y: -Math.cos(radHeading) * 10 - Math.sin(radHeading) * 12 };

      // Skidmarks creation
      if (speed > 1.2 && (car.isDrifting || isBraking || handbrake)) {
        // Spawn skidmarks line paths
        const lx1 = car.x + leftWheelOffset.x;
        const ly1 = car.y + leftWheelOffset.y;
        const rx1 = car.x + rightWheelOffset.x;
        const ry1 = car.y + rightWheelOffset.y;

        // We register segments connecting last wheel coords
        if (skidmarks.length > 600) {
          skidmarks.shift(); // clean up memory bounds
          skidmarks.shift();
        }

        const skidAlpha = car.isDrifting ? 0.35 : 0.45;

        // Append skid lines
        skidmarks.push({ x1: lx1, y1: ly1, x2: lx1 - car.vx * 0.8, y2: ly1 - car.vy * 0.8, opacity: skidAlpha });
        skidmarks.push({ x1: rx1, y1: ry1, x2: rx1 - car.vx * 0.8, y2: ry1 - car.vy * 0.8, opacity: skidAlpha });

        // Spawn drift tire smoke
        for (let i = 0; i < 2; i++) {
          particles.push({
            id: Math.random().toString(),
            x: lx1 + (Math.random() - 0.5) * 4,
            y: ly1 + (Math.random() - 0.5) * 4,
            vx: -car.vx * 0.2 + (Math.random() - 0.5) * 1.0,
            vy: -car.vy * 0.2 + (Math.random() - 0.5) * 1.0,
            size: Math.random() * 4 + 5,
            opacity: 0.55,
            color: "#e2e8f0", // tire chalky white smoke
            type: "smoke",
            life: 0,
            maxLife: 35 + Math.random() * 20
          });
          particles.push({
            id: Math.random().toString(),
            x: rx1 + (Math.random() - 0.5) * 4,
            y: ry1 + (Math.random() - 0.5) * 4,
            vx: -car.vx * 0.2 + (Math.random() - 0.5) * 1.0,
            vy: -car.vy * 0.2 + (Math.random() - 0.5) * 1.0,
            size: Math.random() * 4 + 5,
            opacity: 0.55,
            color: "#e2e8f0",
            type: "smoke",
            life: 0,
            maxLife: 35 + Math.random() * 20
          });
        }
      }

      // Spit exhaust flame or smoke randomly when speeding
      const moveUp = keys.current["arrowup"] || keys.current["w"] || activeGas.current;
      if (moveUp && Math.random() < 0.35) {
        const exhaustOffset = { x: -Math.cos(radHeading) * 20 - Math.sin(radHeading) * 7, y: -Math.sin(radHeading) * 20 + Math.cos(radHeading) * 7 };
        const extX = car.x + exhaustOffset.x;
        const extY = car.y + exhaustOffset.y;

        const isFlameTick = Math.random() < 0.1 && car.rpm > 5500;

        particles.push({
          id: Math.random().toString(),
          x: extX,
          y: extY,
          vx: -car.vx * 0.3 + (Math.random() - 0.5) * 0.5,
          vy: -car.vy * 0.3 + (Math.random() - 0.5) * 0.5,
          size: isFlameTick ? Math.random() * 3 + 4 : Math.random() * 1.5 + 2,
          opacity: 0.8,
          color: isFlameTick ? "#f43f5e" : "#64748b", // orange exhaust flame bursts!
          type: isFlameTick ? "fire" : "smoke",
          life: 0,
          maxLife: isFlameTick ? 8 : 15
        });
      }

      // Update active particles array
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.opacity = 1 - p.life / p.maxLife;

        if (p.type === "smoke") {
          p.size += 0.25; // Smoke expands
          p.vx *= 0.96;
          p.vy *= 0.96;
        }

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }
    };

    const drawGame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const car = carRef.current;

      // Handle screen-shake decay
      ctx.save();
      if (screenShakeRef.current > 0.1) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current *= 0.88;
      }

      // 1. Draw Asphalt background Grid & Tracks style
      ctx.fillStyle = track.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Simple structural background styling grid lines
      ctx.strokeStyle = "rgba(100, 116, 139, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let px = 0; px < canvas.width; px += gridSize) {
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();
      }
      for (let py = 0; py < canvas.height; py += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
      }

      // 2. Draw Permanent tire Skidmarks
      ctx.lineWidth = 3.5;
      for (let sk of skidmarksRef.current) {
        ctx.strokeStyle = `rgba(15, 23, 42, ${sk.opacity})`;
        ctx.beginPath();
        ctx.moveTo(sk.x1, sk.y1);
        ctx.lineTo(sk.x2, sk.y2);
        ctx.stroke();
      }

      // 3. Draw Track Lane Borders Outlines & Kerbs
      // Draw outer boundary line
      ctx.strokeStyle = track.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = track.color;
      ctx.lineWidth = 12;
      ctx.lineJoin = "round";
      ctx.beginPath();
      if (track.boundaryOuter.length > 0) {
        ctx.moveTo(track.boundaryOuter[0].x, track.boundaryOuter[0].y);
        for (let pt of track.boundaryOuter) {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();

      // Reset shadow blur
      ctx.shadowBlur = 0;

      // Draw inner core boundary line
      ctx.fillStyle = "#1e293b"; // Central barrier fill
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (track.boundaryInner.length > 0) {
        ctx.moveTo(track.boundaryInner[0].x, track.boundaryInner[0].y);
        for (let pt of track.boundaryInner) {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4. Draw Checkpoint Gates (Highlight active targeted checkpoint)
      const nextCPIdx = currentCheckpointRef.current;
      track.checkpoints.forEach((cp, index) => {
        const isActive = index === nextCPIdx;
        ctx.save();
        ctx.strokeStyle = isActive ? "#10b981" : "rgba(100, 116, 139, 0.3)";
        ctx.lineWidth = isActive ? 5 : 2;
        if (isActive) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = "#10b981";
        }

        // Draw checkpoint gate dashed line representing check line
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        // Drawing an orthogonal pylon gate line across road
        ctx.arc(cp.x, cp.y, cp.width / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Draw glowing structural poles in both ends of the checkpoint
        ctx.fillStyle = isActive ? "#10b981" : "#475569";
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 5. Draw interactive dynamic obstacles (Cones, barrels, tires)
      for (let o of obstaclesRef.current) {
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.angle);

        if (o.type === "cone") {
          // Classic bright orange safety cone with black bottom plate
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-8, 5, 16, 3); // base plate
          ctx.fillStyle = "#f97316"; // Safety orange cone tip
          ctx.beginPath();
          ctx.moveTo(0, -9);
          ctx.lineTo(-6, 5);
          ctx.lineTo(6, 5);
          ctx.closePath();
          ctx.fill();
          
          // White warning stripe in center of cone
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath();
          ctx.moveTo(0, -2);
          ctx.lineTo(-3, 2);
          ctx.lineTo(3, 2);
          ctx.closePath();
          ctx.fill();
        } 
        else if (o.type === "tire") {
          // Solid rubber tire barrier
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Central hollow
          ctx.fillStyle = track.bgColor;
          ctx.beginPath();
          ctx.arc(0, 0, o.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (o.type === "barrel") {
          // Yellow toxic hazard/racing containment drum
          ctx.fillStyle = "#eab308";
          ctx.beginPath();
          ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ca8a04";
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Top lid details
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(0, 0, o.radius * 0.75, 0, Math.PI * 2);
          ctx.fill();
          
          // Outer black stripes
          ctx.strokeStyle = "#eab308";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.restore();
      }

      // 6. Draw active physical particles (smoke, sparks, flame bursts)
      for (let p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        
        if (p.type === "smoke" || p.type === "fire") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === "spark") {
          // Draw small fast sparks
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }

        ctx.restore();
      }

      // 7. Draw Player's Vehicle (Highly detailed, glowing headlights)
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      // HEADLIGHT BEAMS: Radiating front yellow volumetric gradient beams!
      ctx.save();
      const beamGrad = ctx.createRadialGradient(25, 0, 10, 160, 0, 140);
      beamGrad.addColorStop(0, "rgba(253, 224, 71, 0.35)"); // warm yellow headlamp
      beamGrad.addColorStop(1, "rgba(253, 224, 71, 0.0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(18, -6);
      ctx.lineTo(165, -80);
      ctx.lineTo(165, 80);
      ctx.lineTo(18, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Back red flame brake lights if reversing or deceleration
      const isSlowing = keys.current["arrowdown"] || keys.current["s"] || activeBrake.current;
      if (isSlowing) {
        ctx.save();
        ctx.fillStyle = "rgba(ef4444, 0.3)";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ef4444";
        ctx.beginPath();
        ctx.arc(-22, -8, 12, 0, Math.PI, true);
        ctx.arc(-22, 8, 12, 0, Math.PI, true);
        ctx.fill();
        ctx.restore();
      }

      // Draw standard four wheels
      const drawWheel = (wx: number, wy: number, isFront: boolean) => {
        ctx.save();
        ctx.translate(wx, wy);
        if (isFront) {
          ctx.rotate(car.steerAngle);
        }
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-8, -4, 16, 8);
        ctx.fillStyle = "#64748b";
        ctx.fillRect(-6, -3, 12, 6); // rim detail
        ctx.restore();
      };

      // 4 points on the wheel hub base
      drawWheel(12, -13, true);  // front-left
      drawWheel(12, 13, true);   // front-right
      drawWheel(-12, -13, false); // rear-left
      drawWheel(-12, 13, false);  // rear-right

      // Car main chassis body
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-22, -11, 44, 22);

      // Distinct body color panel
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.moveTo(-20, -10);
      ctx.lineTo(16, -10);
      ctx.bezierCurveTo(22, -7, 22, 7, 16, 10);
      ctx.lineTo(-20, 10);
      ctx.closePath();
      ctx.fill();

      // Top carbon canopy window windshield
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, -7);
      ctx.lineTo(6, -7);
      ctx.lineTo(13, -4);
      ctx.lineTo(13, 4);
      ctx.lineTo(6, 7);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shiny glare effects on windshield
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.moveTo(-2, -5);
      ctx.lineTo(8, -5);
      ctx.lineTo(5, 5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();

      // Two dual white racing stripe wraps down center
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-18, -4, 30, 1);
      ctx.fillRect(-18, 3, 30, 1);

      // Carbon rear spoiler wing
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-24, -13, 6, 26);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-23, -13, 4, 3);
      ctx.fillRect(-23, 10, 4, 3);

      // Restoring canvas transform layout matrix
      ctx.restore();
      ctx.restore(); // screen-shake restore
    };

    const run = (time: number) => {
      // Delta-time limits
      const delta = Math.min(25, time - lastTime);
      lastTime = time;

      updatePhysics();
      handleCollisions();
      updateParticles();
      drawGame();

      // Callback dashboard metrics up to Parent Component
      const car = carRef.current;
      onUpdateStats(
        car.speed,
        car.driftPoints,
        car.driftMultiplier,
        car.isDrifting ? Math.round(Math.abs(car.speed * 8)) : 0, // Frame live score
        car.driftChain,
        car.gear,
        car.rpm
      );

      animId = requestAnimationFrame(run);
    };

    animId = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [track, handling, carColor]);

  return (
    <div className="relative w-full overflow-hidden select-none bg-slate-950 rounded-2xl glow-card border border-slate-800">
      {/* Dynamic Screen Size adaptive wrapper */}
      <div className="relative flex justify-center items-center w-full aspect-[4/3] md:aspect-[16/10] lg:aspect-[16/11]">
        <canvas
          ref={canvasRef}
          width={1000}
          height={700}
          className="w-full h-full max-h-[70vh] block object-contain"
        />

        {/* Drift score chain animation overlay HUD inside the canvas corners */}
        {carRef.current.isDrifting && carRef.current.driftPoints > 0 && (
          <div className="absolute top-1/2 left-1/2 p-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center select-none animate-pulse">
            <div className="text-sm font-semibold tracking-wider text-rose-400 drop-shadow-md font-sans">
              DRIFT ANGLE DETECTED
            </div>
            <div className="text-4xl font-extrabold tracking-tight text-amber-400 font-display drift-glow-amber">
              +{carRef.current.driftPoints} pts
            </div>
            {carRef.current.driftChain > 20 && (
              <div className="mt-1 text-md font-bold text-emerald-400 font-mono">
                Multiplier x{carRef.current.driftMultiplier}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Responsive touch/click on-screen visual console */}
      {showVirtualControls && (
        <div className="absolute bottom-4 left-0 right-0 p-4 flex justify-between items-center pointer-events-auto select-none gap-4">
          {/* Steering Wheel Left-Right Directional D-pad */}
          <div className="flex gap-3">
            <button
              onTouchStart={() => { setLeftInput(true); audioEngine.init(); }}
              onTouchEnd={() => { setLeftInput(false); }}
              onMouseDown={() => { setLeftInput(true); audioEngine.init(); }}
              onMouseUp={() => { setLeftInput(false); }}
              onMouseLeave={() => { setLeftInput(false); }}
              className={`w-16 h-16 rounded-xl flex items-center justify-center border text-2xl font-bold select-none cursor-pointer transition-all ${
                leftPressed
                  ? "bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-95"
                  : "bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-100"
              }`}
            >
              ←
            </button>
            <button
              onTouchStart={() => { setRightInput(true); audioEngine.init(); }}
              onTouchEnd={() => { setRightInput(false); }}
              onMouseDown={() => { setRightInput(true); audioEngine.init(); }}
              onMouseUp={() => { setRightInput(false); }}
              onMouseLeave={() => { setRightInput(false); }}
              className={`w-16 h-16 rounded-xl flex items-center justify-center border text-2xl font-bold select-none cursor-pointer transition-all ${
                rightPressed
                  ? "bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-95"
                  : "bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-100"
              }`}
            >
              →
            </button>
          </div>

          {/* Action Pedals: Throttle, brake & pull space handbrake */}
          <div className="flex gap-3">
            <button
              onTouchStart={() => { setHandbrakeInput(true); audioEngine.init(); }}
              onTouchEnd={() => { setHandbrakeInput(false); }}
              onMouseDown={() => { setHandbrakeInput(true); audioEngine.init(); }}
              onMouseUp={() => { setHandbrakeInput(false); }}
              onMouseLeave={() => { setHandbrakeInput(false); }}
              className={`px-5 h-16 rounded-xl flex items-center justify-center border text-sm font-black uppercase tracking-wider font-display select-none cursor-pointer transition-all ${
                slidePressed
                  ? "bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.6)] scale-95"
                  : "bg-rose-950/85 hover:bg-rose-900 border-rose-800 text-rose-300"
              }`}
            >
              SLIDE
            </button>
            <button
              onTouchStart={() => { setBrakeInput(true); audioEngine.init(); }}
              onTouchEnd={() => { setBrakeInput(false); }}
              onMouseDown={() => { setBrakeInput(true); audioEngine.init(); }}
              onMouseUp={() => { setBrakeInput(false); }}
              onMouseLeave={() => { setBrakeInput(false); }}
              className={`w-16 h-16 rounded-xl flex items-center justify-center border text-xs font-bold font-sans uppercase select-none cursor-pointer transition-all ${
                brakePressed
                  ? "bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-95"
                  : "bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-rose-400"
              }`}
            >
              Brake
            </button>
            <button
              onTouchStart={() => { setGasInput(true); audioEngine.init(); }}
              onTouchEnd={() => { setGasInput(false); }}
              onMouseDown={() => { setGasInput(true); audioEngine.init(); }}
              onMouseUp={() => { setGasInput(false); }}
              onMouseLeave={() => { setGasInput(false); }}
              className={`w-18 h-18 -mt-2 rounded-xl flex items-center justify-center border text-base font-black font-sans uppercase select-none cursor-pointer transition-all ${
                gasPressed
                  ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-95"
                  : "bg-emerald-950 hover:bg-emerald-900 border-emerald-800 text-emerald-300"
              }`}
            >
              GAS
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

GameCanvas.displayName = "GameCanvas";
