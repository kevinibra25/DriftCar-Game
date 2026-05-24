# 🏎️ DriftCar Pro: R-Spec Live Simulation Telemetry System

A responsive, high-fidelity Drift Car simulation game built with realistic vector momentum/friction physics, tire skid trails, collision particle systems, and beautiful track layouts. Accessible both as an immersive, highly polished **React + Tailwind HTML5 Web Simulator** and a **C++ OpenGL Desktop Suite**.

This project has been upgraded to the **R-SPEC Build** with critical updates for ultimate playability, precise rendering, and device safety.

---

## 🚀 Key Upgrades in R-Spec Build

### 1. 📂 Touge Mountain Pass Track Re-Engineered
The classic mountain pass road has been completely redesigned from scratch with a focus on optimal playability and fluid drifting:
- **Harmonic Hairpin & S-Curves**: Engineered utilizing multi-harmonic sine calculations to generate an organic mountain pass with wide, sweeping drift sectors and sharp hairpin challenges.
- **Enhanced Road Width (90px)**: The track boundaries are set to a generous 90px width. You have plenty of room to link drifts together without immediate wall collisions.
- **Flawless Boundary Alignment**: Fixed pathing and normal-vector alignment. The inner and outer track boundaries are correctly aligned so that gas acceleration works beautifully without spawning the vehicle out-of-bounds.
- **Interactive Obstacles**: Perfectly set path-bound cones and central barrels to drift around.

### 2. 🎨 Functional Body Color Profile State
- Fully resolved the issue where clicking the color buttons only highlighted the UI but failed to update the car's color in the simulation canvas.
- Integrated a fully synchronized `gameState.selectedCarColor` flow. The render canvas dynamically reads this active color, applying it to your drift car's body.
- Color persistence remains intact even when you reset the session, start/stop the simulator, or swap active tracks from the Directory.

### 3. 🛡️ Track-Bound Collision & Response
- Implemented high-performance polygon intersection calculations (`isPointInPolygon`) to evaluate whether the car is within bounds (inside the outer loop and outside the inner loop).
- If you hit the boundary walls, the game triggers a physics response: bounciness recoil feedback, speed reduction, and a decay indicator on drift combo scores.

### 4. 🕹️ Synchronized Input-UI Reactive Control
- Interactive on-screen UI buttons are bidirectional. Pressing `W`, `S`, `A`, `D`, or `SPACE` on your keyboard will instantly light up and squeeze the virtual on-screen pedals in real time with high-visibility neon glow animations.
- Touching/clicking virtual controls instantly triggers the Web Audio API engine, priming the high-pitch screeching and roaring synth engine.

### 5. 🖥️ PC/Laptop Responsive Target Locker
- To preserve the mechanical high-precision keyboard experience, the simulator now locks game resources on mobile/tablet screens.
- Screen resolutions less than `900px` or devices with primary touch indicators (Android, iOS, iPadOS) trigger a beautiful stylized **Live Telemetry Interface Block** asking the pilot to shift to a PC/laptop workspace.

---

## 🕹️ Controls (Desktop Mode)

- **Gas/Throttle**: `W` or `Arrow Up`
- **Brake/Reverse**: `S` or `Arrow Down`
- **Turn Left**: `A` or `Arrow Left`
- **Turn Right**: `D` or `Arrow Right`
- **Handbrake / Drift Slide Pull**: `SPACE`

---

## 📂 Project Structure

```
├── /src                    # React + Vite Workspace Source (Live Preview Engine)
│   ├── /components
│   │   ├── GameCanvas.tsx          # 2D canvas vector friction engine with active controls
│   │   ├── SoundEngine.ts          # Synthesized multi-oscillator browser audio engine
│   │   └── TroubleshootingDashboard.ts # Interactive C++ / Web compile copyboard helper
│   ├── App.tsx             # HUD layout, calibration panels, and tracking dashboard
│   ├── tracksData.ts       # Track math structures (Neon Stadium, Touge Pass, Gymkhana)
│   ├── types.ts            # Type structures and state specifications
│   ├── main.tsx            # Main Web App entry point
│   └── index.css           # Global typography definitions (Inter + JetBrains Mono) & Tailwind
│
├── /web                    # Standalone Static Web Engine 
│   ├── index.html          # Lightweight game entry point
│   ├── style.css           # Neon dashboard layout styling
│   └── script.js           # Independent lightweight drifting simulator
│
├── vercel.json             # Static Vercel pipeline rules
├── package.json            # Package script workspace
└── tsconfig.json           # Compiler rules
```

---

## ⚙️ Development & Quickstart

To run the React web environment locally:

1. Clone or integrate your repository workspace.
2. Install standard dependencies:
   ```bash
   npm install
   ```
3. Run the hot development server:
   ```bash
   npm run dev
   ```
4. Build static distribution assets:
   ```bash
   npm run build
   ```

---

## 🛠️ Diagnostics & Troubleshooting

- **No Engine Sound**: Modern browser safety sandboxing blocks procedural sound synthesizers from starting without prior user intent. Simply click anywhere inside the screen or tap any control key (`W` / `A` / `S` / `D` / `SPACE`) to immediately fire up the active drift audio pipeline!
- **Getting Stuck on Walls**: If you drift too aggressively and impact boundary walls, your momentum will damp, bouncing you backward. Tap the brake (`S`) or slide (`SPACE`) to pivot, then throttle forward safely.
