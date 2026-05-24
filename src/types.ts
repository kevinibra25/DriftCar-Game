export interface Vector2D {
  x: number;
  y: number;
}

export interface CarState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;       // Heading direction in radians
  steerAngle: number;  // Current steering orientation in radians
  speed: number;       // Forward speed
  driftAngle: number;  // Angle of drift/side slipping
  isDrifting: boolean;
  driftPoints: number;
  driftChain: number;
  driftMultiplier: number;
  maxSpeed: number;
  handling: "arcade" | "sport" | "hardcore";
  color: string;
  rpm: number;
  gear: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  type: "smoke" | "skid" | "spark" | "fire";
  life: number;
  maxLife: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: "cone" | "tire" | "barrel";
  angle: number;
  angularVelocity: number;
}

export interface TrackCheckPoint {
  x: number;
  y: number;
  width: number;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  color: string;
  bgColor: string;
  spawnPoint: { x: number; y: number; angle: number };
  boundaryOuter: Vector2D[];
  boundaryInner: Vector2D[];
  checkpoints: TrackCheckPoint[];
  obstacles: Obstacle[];
}

export interface GameSettings {
  carColor: string;
  difficulty: "arcade" | "sport" | "hardcore";
  soundVolume: number;
  showDevGuides: boolean;
}
