import { Track, Vector2D, Obstacle, TrackCheckPoint } from "./types";

// Generate outer and inner oval boundaries with variations
function generateOvalTrack(
  centerX: number,
  centerY: number,
  rxOut: number,
  ryOut: number,
  rxIn: number,
  ryIn: number,
  pointsCount = 60
): { outer: Vector2D[]; inner: Vector2D[]; checkpoints: TrackCheckPoint[] } {
  const outer: Vector2D[] = [];
  const inner: Vector2D[] = [];
  const checkpoints: TrackCheckPoint[] = [];

  for (let i = 0; i < pointsCount; i++) {
    const angle = (i * 2 * Math.PI) / pointsCount;
    
    // Add some organic bumps to the track roads
    const bumpOuter = 1 + Math.sin(angle * 6) * 0.04;
    const bumpInner = 1 + Math.sin(angle * 6) * 0.02;

    const ox = centerX + Math.cos(angle) * rxOut * bumpOuter;
    const oy = centerY + Math.sin(angle) * ryOut * bumpOuter;

    const ix = centerX + Math.cos(angle) * rxIn * bumpInner;
    const iy = centerY + Math.sin(angle) * ryIn * bumpInner;

    outer.push({ x: ox, y: oy });
    inner.push({ x: ix, y: iy });

    // Place checkpoints every few points
    if (i % 6 === 0) {
      // Direct gate in the middle of inner/outer
      const cx = (ox + ix) / 2;
      const cy = (oy + iy) / 2;
      const dx = ox - ix;
      const dy = oy - iy;
      const roadWidth = Math.sqrt(dx * dx + dy * dy);

      checkpoints.push({
        x: cx,
        y: cy,
        width: roadWidth + 10,
      });
    }
  }

  // Ensure loop closes cleanly by pushing first elements
  outer.push({ ...outer[0] });
  inner.push({ ...inner[0] });

  return { outer, inner, checkpoints };
}

// Generate an S-curve mountain pass track
function generateMountainPassTrack(): { outer: Vector2D[]; inner: Vector2D[]; checkpoints: TrackCheckPoint[] } {
  const outer: Vector2D[] = [];
  const inner: Vector2D[] = [];
  const checkpoints: TrackCheckPoint[] = [];
  const pointsCount = 100;
  
  // Create a beautiful, organic racetrack layout that looks like a mountainous hairpin pass (with S-curves and hairpin turns)
  const centerPoints: Vector2D[] = [];
  
  for (let i = 0; i < pointsCount; i++) {
    const angle = (i * 2 * Math.PI) / pointsCount;
    
    // Base radius
    let r = 260;
    
    // Add multiple harmonics to create hairpins and S-curves
    let rOffset = 0;
    if (angle > -0.2 && angle < Math.PI - 0.2) {
      // Top & Right section: complex mountain s-curves & sharp hairpins
      rOffset = Math.sin(angle * 4) * 65 + Math.cos(angle * 2) * 35;
    } else {
      // Bottom & Left section: wide sweeping turns and drifting straight
      rOffset = Math.cos(angle * 2) * 45;
    }
    
    r += rOffset;
    r = Math.max(150, Math.min(380, r)); // constrain to avoid going too narrow or off-bounds
    
    // Map with custom centers and aspect ratios to fit Canvas 1000 x 700
    const cx = 500 + Math.cos(angle) * r * 1.35;
    const cy = 345 + Math.sin(angle) * r * 0.85;
    
    centerPoints.push({ x: cx, y: cy });
  }
  
  // Close the loop perfectly
  centerPoints.push({ ...centerPoints[0] });
  
  // Spacious road width for Touge
  const roadWidth = 90; // generous road width to be very playable and enjoyable for drifting!
  
  for (let i = 0; i < pointsCount; i++) {
    const p0 = centerPoints[i === 0 ? pointsCount - 1 : i - 1];
    const p1 = centerPoints[i];
    const p2 = centerPoints[i === pointsCount - 1 ? 0 : i + 1];
    
    // Tangent vector
    const tx = p2.x - p0.x;
    const ty = p2.y - p0.y;
    const len = Math.sqrt(tx * tx + ty * ty);
    
    // Normal vector pointing outwards
    const nx = -ty / len;
    const ny = tx / len;
    
    const ox = p1.x + nx * (roadWidth / 2);
    const oy = p1.y + ny * (roadWidth / 2);
    const ix = p1.x - nx * (roadWidth / 2);
    const iy = p1.y - ny * (roadWidth / 2);
    
    outer.push({ x: ix, y: iy });
    inner.push({ x: ox, y: oy });
    
    // Distribute checkpoints evenly
    if (i % 8 === 0) {
      checkpoints.push({
        x: p1.x,
        y: p1.y,
        width: roadWidth + 15
      });
    }
  }
  
  outer.push({ ...outer[0] });
  inner.push({ ...inner[0] });
  
  return { outer, inner, checkpoints };
}

// Initialize Track Data
export const tracksData: Track[] = [
  {
    id: "neon_stadium",
    name: "Neon Drift Stadium",
    description: "Wide high-grip racing arena with neon-bright energy barriers and sweeping apex turns. Perfect for linking endless massive drifts.",
    difficulty: "Easy",
    color: "#10b981", // Emerald
    bgColor: "#091218",
    spawnPoint: { x: 300, y: 150, angle: 0 },
    ...(() => {
      const g = generateOvalTrack(500, 350, 420, 250, 230, 110, 60);
      return {
        boundaryOuter: g.outer,
        boundaryInner: g.inner,
        checkpoints: g.checkpoints,
        obstacles: [
          // Cones in convenient non-blocking apex drift zones
          { id: "c1", x: 130, y: 350, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
          { id: "c2", x: 870, y: 350, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
          { id: "c3", x: 500, y: 110, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
          { id: "c4", x: 500, y: 590, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
          
          { id: "t1", x: 120, y: 310, vx: 0, vy: 0, radius: 14, type: "tire", angle: 0, angularVelocity: 0 },
          { id: "t2", x: 120, y: 390, vx: 0, vy: 0, radius: 14, type: "tire", angle: 0, angularVelocity: 0 },
          { id: "t3", x: 880, y: 310, vx: 0, vy: 0, radius: 14, type: "tire", angle: 0, angularVelocity: 0 },
          { id: "t4", x: 880, y: 390, vx: 0, vy: 0, radius: 14, type: "tire", angle: 0, angularVelocity: 0 },
        ],
      };
    })(),
  },
  {
    id: "touge_pass",
    name: "Touge Mountain Pass",
    description: "Challenging narrow mountain roads based on Japanese street racing. Watch out for rapid S-curve transitions and guard walls.",
    difficulty: "Hard",
    color: "#f59e0b", // Amber
    bgColor: "#090c0a",
    spawnPoint: { x: 500, y: 528, angle: Math.PI },
    ...(() => {
      const g = generateMountainPassTrack();
      return {
        boundaryOuter: g.outer,
        boundaryInner: g.inner,
        checkpoints: g.checkpoints,
        obstacles: [
          { id: "c_m1", x: 380, y: 240, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
          { id: "c_m2", x: 620, y: 240, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
          { id: "c_m3", x: 500, y: 200, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
          { id: "c_m4", x: 300, y: 528, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
          { id: "b_m1", x: 500, y: 345, vx: 0, vy: 0, radius: 16, type: "barrel", angle: 0, angularVelocity: 0 },
        ],
      };
    })(),
  },
  {
    id: "sandbox_field",
    name: "Gymkhana Sandbox Field",
    description: "Huge open warehouse yard dotted with circle pylons, obstacle courses, concrete barrels, and scattered drift cones.",
    difficulty: "Medium",
    color: "#f43f5e", // Rose
    bgColor: "#0f1115",
    spawnPoint: { x: 150, y: 150, angle: Math.PI / 4 },
    boundaryOuter: [
      { x: 50, y: 50 },
      { x: 950, y: 50 },
      { x: 950, y: 650 },
      { x: 50, y: 650 },
      { x: 50, y: 50 },
    ],
    boundaryInner: [
      // Double separate pylons as small islands in the middle
      { x: 300, y: 350 },
      { x: 330, y: 350 },
      { x: 330, y: 380 },
      { x: 300, y: 380 },
      { x: 300, y: 350 },
    ],
    checkpoints: [
      { x: 150, y: 250, width: 200 },
      { x: 500, y: 150, width: 200 },
      { x: 800, y: 250, width: 200 },
      { x: 800, y: 500, width: 200 },
      { x: 500, y: 550, width: 200 },
      { x: 200, y: 500, width: 200 },
    ],
    obstacles: [
      // Dynamic cluster of cones, tires, and drums
      { id: "ob_sb1", x: 500, y: 350, vx: 0, vy: 0, radius: 15, type: "barrel", angle: 0, angularVelocity: 0 },
      { id: "ob_sb2", x: 315, y: 365, vx: 0, vy: 0, radius: 15, type: "barrel", angle: 0, angularVelocity: 0 },
      { id: "ob_sb3", x: 685, y: 350, vx: 0, vy: 0, radius: 15, type: "barrel", angle: 0, angularVelocity: 0 },

      { id: "ob_cn1", x: 500, y: 200, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
      { id: "ob_cn2", x: 500, y: 500, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
      { id: "ob_cn3", x: 250, y: 200, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },
      { id: "ob_cn4", x: 750, y: 500, vx: 0, vy: 0, radius: 10, type: "cone", angle: 0, angularVelocity: 0 },

      { id: "ob_tr1", x: 240, y: 480, vx: 0, vy: 0, radius: 14, type: "tire", angle: 0, angularVelocity: 0 },
      { id: "ob_tr2", x: 270, y: 480, vx: 0, vy: 0, radius: 14, type: "tire", angle: 0, angularVelocity: 0 },
      { id: "ob_tr3", x: 730, y: 200, vx: 0, vy: 0, radius: 14, type: "tire", angle: 0, angularVelocity: 0 },
      { id: "ob_tr4", x: 760, y: 200, vx: 0, vy: 0, radius: 14, type: "tire", angle: 0, angularVelocity: 0 },
    ],
  },
];
