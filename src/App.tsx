import { useState, useRef, useEffect } from "react";
import { Flag, Wrench, Car, Gauge, Volume2, RefreshCw, Sliders, Trophy, ChevronRight, HelpCircle } from "lucide-react";
import { GameCanvas, GameCanvasHandle } from "./components/GameCanvas";
import { TroubleshootingDashboard } from "./components/TroubleshootingDashboard";
import { tracksData } from "./tracksData";
import { Track } from "./types";

export default function App() {
  const canvasRef = useRef<GameCanvasHandle | null>(null);

  // Mobile device validation state
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const isMobileDevice = () => {
      return (
        window.innerWidth < 900 ||
        /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
        ("ontouchstart" in window && navigator.maxTouchPoints > 1)
      );
    };

    const handleResize = () => {
      const blocked = isMobileDevice();
      setIsMobile(blocked);
      if (blocked) {
        document.body.classList.add("mobile-blocked");
      } else {
        document.body.classList.remove("mobile-blocked");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      document.body.classList.remove("mobile-blocked");
    };
  }, []);

  // States
  const [selectedTrack, setSelectedTrack] = useState<Track>(tracksData[0]);
  const [carColor, setCarColor] = useState<string>("#3b82f6"); // Neon Blue
  const [handling, setHandling] = useState<"arcade" | "sport" | "hardcore">("sport");
  const [volume, setVolume] = useState<number>(0.35);
  const [activeView, setActiveView] = useState<"game" | "cpp">("game");
  const [showControls, setShowControls] = useState<boolean>(true);

  // HUD and Stats State
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [accumulatedScore, setAccumulatedScore] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [liveDriftPoints, setLiveDriftPoints] = useState<number>(0);
  const [driftChainTicks, setDriftChainTicks] = useState<number>(0);
  const [currentGear, setCurrentGear] = useState<number>(1);
  const [currentRPM, setCurrentRPM] = useState<number>(1000);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("drift_high_score") || "0");
    } catch {
      return 0;
    }
  });

  // Keep track of total score across checkpoints
  const [checkpointBonusTotal, setCheckpointBonusTotal] = useState<number>(0);

  // Score Calculations
  const totalScore = checkpointBonusTotal + (accumulatedScore * multiplier);

  useEffect(() => {
    if (totalScore > highScore) {
      setHighScore(totalScore);
      try {
        localStorage.setItem("drift_high_score", String(totalScore));
      } catch (err) {
        // ignore storage block limits
      }
    }
  }, [totalScore, highScore]);

  // Restart trigger
  const handleRestart = () => {
    setCheckpointBonusTotal(0);
    setAccumulatedScore(0);
    setMultiplier(1);
    setLiveDriftPoints(0);
    setDriftChainTicks(0);
    canvasRef.current?.resetGame();
  };

  const updateStats = (
    speed: number,
    uScore: number,
    uMult: number,
    uDriftPts: number,
    chainTicks: number,
    uGear: number,
    uRpm: number
  ) => {
    setCurrentSpeed(speed);
    setAccumulatedScore(uScore);
    setMultiplier(uMult);
    setLiveDriftPoints(uDriftPts);
    setDriftChainTicks(chainTicks);
    setCurrentGear(uGear);
    setCurrentRPM(uRpm);
  };

  const handleCrossCheckpoint = (index: number) => {
    // Add completed drift points to our permanent base tally
    setCheckpointBonusTotal(prev => prev + 1500 + (accumulatedScore * multiplier));
    setAccumulatedScore(0);
    setMultiplier(prev => Math.min(10, prev + 1));
  };

  const colors = [
    { name: "Neon Blue", hex: "#3b82f6" },
    { name: "Vibrant Rose", hex: "#f43f5e" },
    { name: "Glowing Emerald", hex: "#10b981" },
    { name: "Racing Amber", hex: "#f59e0b" },
    { name: "Carbon Shadow", hex: "#475569" }
  ];

  // Visual RPM meter values
  const rpmPercent = Math.min(100, (currentRPM / 8000) * 100);
  const isRedline = currentRPM > 6200;

  if (isMobile) {
    return (
      <div className="device-warning fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#0a0a0c] text-center select-none font-sans">
        <div className="w-20 h-20 rounded-2xl bg-[#ff0055]/10 border border-[#ff0055]/30 flex items-center justify-center text-[#ff0055] mb-6 shadow-[0_0_30px_rgba(255,0,85,0.2)]">
          <Car className="animate-pulse" size={44} />
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic mb-2">
          DRIFT<span className="text-[#ff0055]">CAR</span> <span className="text-[10px] font-mono font-bold py-0.5 px-2 bg-[#ff0055]/20 text-[#ff0055] rounded ml-1.5 border border-[#ff0055]/30">PRO R-SPEC</span>
        </h1>
        <p className="text-[10px] text-[#ff6600] font-mono tracking-widest uppercase mb-8">Live Simulation Telemetry System</p>
        
        <div className="max-w-md bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
          <p className="text-sm text-gray-300 font-medium leading-relaxed">
            Game ini hanya bisa dimainkan di PC atau laptop. Gunakan keyboard untuk memainkan DriftCar Pro.
          </p>
          <div className="pt-2 border-t border-white/5 flex justify-center gap-4 text-[10px] text-gray-400 font-mono uppercase">
            <span>🖥️ Desktop Mode Required</span>
            <span>⌨️ Keyboard Controls</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] font-sans antialiased text-slate-100 selection:bg-[#ff0055]/30">
      
      {/* Sleek top Navigation Header - High Density themed glass-panel */}
      <header className="border-b border-white/10 bg-[#0a0a0c]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff0055]/10 border border-[#ff0055]/30 flex items-center justify-center text-[#ff0055]">
              <Car className="animate-pulse" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter font-sans text-white uppercase italic">
                DRIFT<span className="text-[#ff0055]">CAR</span> <span className="text-[10px] font-mono font-bold py-0.5 px-2 bg-[#ff0055]/20 text-[#ff0055] rounded ml-1.5 border border-[#ff0055]/30">PRO R-SPEC</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Live Simulation Telemetry System</p>
            </div>
          </div>

          <div className="flex bg-black/60 p-1 border border-white/15 rounded-xl">
            <button
              onClick={() => setActiveView("game")}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider select-none cursor-pointer ${
                activeView === "game"
                  ? "bg-gradient-to-r from-[#ff0055] to-[#ff6600] text-white shadow-[0_0_15px_rgba(255,0,85,0.4)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Gauge size={14} />
              PLAY SIMULATOR
            </button>
            <button
              onClick={() => setActiveView("cpp")}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-black transition-all uppercase tracking-wider select-none cursor-pointer ${
                activeView === "cpp"
                  ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Wrench size={14} />
              C++ OPENGL DEV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-16">
        {activeView === "game" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left controls side: Game Settings selector panel - Col 4 */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Profile setup card - High Density Glass style */}
              <div className="bg-[#141419]/90 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5 glass-panel">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Sliders className="text-[#ff0055]" size={16} />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest font-mono">VEHICLE INSTANCE SPECS</h3>
                </div>

                {/* Color Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">BODY COLOR PROFILE</label>
                  <div className="flex flex-wrap gap-2.5">
                    {colors.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setCarColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-8 h-8 rounded-full border-3 transition-all cursor-pointer ${
                          carColor === c.hex
                            ? "border-white scale-110 shadow-lg shadow-white/30"
                            : "border-transparent hover:scale-105"
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Handling profile settings */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">HANDLING CALIBRATION</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["arcade", "sport", "hardcore"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setHandling(mode)}
                        className={`py-2 px-1 text-center rounded-lg font-black uppercase tracking-wider transition-all text-[10px] cursor-pointer ${
                          handling === mode
                            ? "bg-gradient-to-r from-[#ff0055] to-[#ff6600] text-white shadow-md shadow-[#ff0055]/30 border-0"
                            : "bg-black/40 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white font-bold"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Engine Vol */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
                    <span>AUDIO FREQUENCY (ENGINE)</span>
                    <span className="text-[#ff6600]">{Math.round(volume * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Volume2 className="text-[#ff0055] shrink-0 animate-pulse" size={16} />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-[#ff0055]"
                    />
                  </div>
                </div>

                {/* On-screen touch/mouse controller toggle */}
                <div className="space-y-2 pt-3.5 border-t border-white/10">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
                    <span>ON-SCREEN DEV CONTROLLER</span>
                    <span className={showControls ? "text-[#ff0055]" : "text-gray-500"}>
                      {showControls ? "ACTIVE" : "OFF"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowControls(true)}
                      className={`py-2 px-1 text-center rounded-lg font-black uppercase tracking-wider transition-all text-[9px] cursor-pointer ${
                        showControls
                          ? "bg-gradient-to-r from-[#ff0055] to-[#ff6600] text-white shadow-md shadow-[#ff0055]/30 border-transparent"
                          : "bg-black/40 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white font-bold"
                      }`}
                    >
                      MOUSE / TOUCH ON
                    </button>
                    <button
                      onClick={() => setShowControls(false)}
                      className={`py-2 px-1 text-center rounded-lg font-black uppercase tracking-wider transition-all text-[9px] cursor-pointer ${
                        !showControls
                          ? "bg-gradient-to-r from-[#ff0055] to-[#ff6600] text-white shadow-md shadow-[#ff0055]/30 border-transparent"
                          : "bg-black/40 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white font-bold"
                      }`}
                    >
                      KEYBOARD ONLY
                    </button>
                  </div>
                </div>
              </div>

              {/* Tracks Selector */}
              <div className="bg-[#141419]/90 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 glass-panel">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Flag className="text-[#ff6600]" size={16} />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest font-mono">MAP ROUTE DIRECTORY</h3>
                </div>

                <div className="space-y-2.5">
                  {tracksData.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTrack(t)}
                      className={`w-full text-left p-3.5 rounded-xl border flex justify-between items-center transition-all cursor-pointer ${
                        selectedTrack.id === t.id
                          ? "bg-black/60 border-[#ff0055]"
                          : "bg-black/20 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-xs text-white">{t.name}</div>
                        <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 font-mono">{t.description}</div>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 border ${
                        t.difficulty === "Easy"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : t.difficulty === "Medium"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-[#ff0055]/10 text-[#ff0055] border-[#ff0055]/20"
                      }`}>
                        {t.difficulty}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Simple Help Info Panel */}
              <div className="bg-black/60 border border-white/10 rounded-xl p-4 flex gap-3 text-gray-400 glass-panel">
                <HelpCircle className="text-[#ff6600] shrink-0 mt-0.5 animate-bounce" size={16} />
                <div className="text-[11px] leading-relaxed font-sans">
                  <strong className="text-white">Active Drift Protocol:</strong> Throttle hard, steer rapidly to break friction index or jam <kbd className="px-1.5 py-0.5 bg-black rounded font-mono border border-white/20 text-[#ff0055] font-black">SPACEBAR</kbd> (Handbrake) to slip wheels. Prolong state to build massive combo multiplier!
                </div>
              </div>

            </div>

            {/* Game Canvas Board Panel col-8 */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Telemetry Dashboard Banner - High Density Style */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#141419]/90 border border-white/10 rounded-xl p-4 flex flex-col justify-center glass-panel">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest font-mono">VELOCITY SPEED</div>
                  <div className="text-3xl font-black italic text-white font-sans tracking-tight mt-1.5 flex items-baseline">
                    {Math.round(Math.abs(currentSpeed) * 12)} <span className="text-xs font-mono text-gray-400 uppercase ml-1">KM/H</span>
                  </div>
                </div>

                <div className="bg-[#141419]/90 border border-white/10 rounded-xl p-4 flex flex-col justify-center glass-panel">
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest font-mono flex items-center justify-between">
                    <span>DRIFT POINTS</span>
                    {liveDriftPoints > 0 && (
                      <span className="text-[8px] bg-[#ff0055] text-white px-1.5 rounded animate-ping font-mono">COMBO</span>
                    )}
                  </div>
                  <div className="text-3xl font-black italic text-[#ff0055] font-sans tracking-tight mt-1.5 drift-glow-rose flex items-baseline">
                    {totalScore} <span className="text-xs font-mono text-gray-400 uppercase ml-1">PTS</span>
                  </div>
                </div>

                <div className="bg-[#141419]/90 border border-white/10 rounded-xl p-4 flex flex-col justify-center glass-panel">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest font-mono">COMBO MULTIPLIER</div>
                  <div className="text-3xl font-black italic text-[#ff6600] font-sans tracking-tight mt-1.5 flex items-baseline">
                    x{multiplier} <span className="text-xs font-mono text-gray-500 uppercase ml-1">/x10</span>
                  </div>
                </div>

                <div className="bg-[#141419]/90 border border-white/10 rounded-xl p-4 flex flex-col justify-center glass-panel">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest font-mono flex items-center justify-between">
                    <span>BEST DRIFT</span>
                    <Trophy className="text-[#ff6600] shrink-0" size={11} />
                  </div>
                  <div className="text-3xl font-black italic text-gray-200 font-sans tracking-tight mt-1.5 flex items-baseline">
                    {highScore} <span className="text-xs font-mono text-gray-400 uppercase ml-1">PTS</span>
                  </div>
                </div>
              </div>

              {/* Game display frame */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl min-h-[480px]">
                {/* Visual Background Accent Text behind the canvas */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden bg-slate-950">
                  <div className="text-[140px] font-black italic text-white/5 uppercase select-none tracking-tighter">
                    DRIFTING
                  </div>
                </div>
                
                <GameCanvas
                  ref={canvasRef}
                  track={selectedTrack}
                  carColor={carColor}
                  handling={handling}
                  volume={volume}
                  showVirtualControls={showControls}
                  onUpdateStats={updateStats}
                  onCrossCheckpoint={handleCrossCheckpoint}
                  onCollision={() => {}}
                />
              </div>

              {/* Tachometer detail layout - High Density Premium Bar layout */}
              <div className="bg-[#141419]/90 border border-white/10 p-5 rounded-xl flex items-center gap-5 glass-panel">
                <span className="text-xs font-black uppercase tracking-widest text-[#ff0055] font-mono min-w-[70px]">
                  GEAR: <span className="text-white font-mono font-black text-lg ml-1">{currentGear}</span>
                </span>
                
                <div className="flex-1">
                  <div className="flex justify-between text-[9px] font-mono font-bold text-gray-500 mb-1 leading-none uppercase tracking-wide">
                    <span>1K RPM</span>
                    <span>3K STABLE</span>
                    <span>5K CRUISE</span>
                    <span className="text-[#ff0055]">7K REDLINE STREAK</span>
                  </div>
                  <div className="w-full h-3 bg-black/60 rounded-md border border-white/10 overflow-hidden relative">
                    <div
                      style={{ width: `${rpmPercent}%` }}
                      className={`h-full rounded-md transition-all duration-75 ${
                        isRedline ? "bg-gradient-to-r from-[#ff0055] to-[#ff6600] animate-pulse" : "bg-gradient-to-r from-emerald-500 via-yellow-500 to-[#ff0055]"
                      }`}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-gray-500 font-black block leading-none uppercase tracking-widest font-mono">ENGINE SPEED</span>
                  <span className={`text-sm font-bold font-mono tracking-tight ${isRedline ? "text-[#ff0055] animate-bounce" : "text-[#ff6600]"}`}>
                    {Math.round(currentRPM)} <span className="text-[9px] font-sans text-gray-400 uppercase font-mono">RPM</span>
                  </span>
                </div>

                <button
                  onClick={handleRestart}
                  className="xl:px-4 flex items-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-gray-900 to-black border border-white/15 hover:border-[#ff0055] hover:text-[#ff0055] rounded-xl transition-all cursor-pointer text-xs font-black uppercase tracking-wider text-slate-300 ml-2 shadow-lg"
                >
                  <RefreshCw size={12} />
                  RESET
                </button>
              </div>

            </div>

          </div>
        ) : (
          /* C++ Developer dashboard overview block */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-600/10 to-[#ff0055]/10 border border-white/10 p-6 rounded-2xl glass-panel relative overflow-hidden">
              <div className="absolute right-0 top-0 text-[120px] font-black italic text-white/5 leading-none select-none tracking-tighter translate-x-12 translate-y-6">
                DEV
              </div>
              <h2 className="text-xl font-black font-sans text-white tracking-tight flex items-center gap-2 mb-2 uppercase italic z-10 relative">
                <Wrench className="text-amber-500 animate-spin-slow" size={20} />
                C++ OPENGL PROJECT DEVELOPMENT SUITE
              </h2>
              <p className="text-gray-300 text-xs leading-relaxed max-w-4xl z-10 relative font-mono">
                We have reverse-engineered your C++ OpenGL Drift Car game structure to eliminate compilation crash conditions and enable local testing. Expand folders below to copy-paste optimized production CMakeLists, headers, cpp modules, and ready configurations for static HTML/JS web deployment!
              </p>
            </div>

            <TroubleshootingDashboard />
          </div>
        )}
      </main>

      {/* Sticky footer telemetry status display - Styled perfectly as the High Density debug footer bar */}
      <footer className="border-t border-white/5 bg-black py-4 text-center text-[10px] text-gray-500 leading-normal sticky bottom-0 z-30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3 font-mono">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="font-bold text-gray-400">RENDERER: WEBGL_2.0</span>
            </div>
            <span className="hidden sm:inline">LATENCY: 14ms</span>
            <span className="hidden sm:inline">FPS: 144.2</span>
          </div>
          <p>© 2026 DriftCar Pro. Refined in High Density Pro Spec Layout.</p>
          <div className="flex gap-4">
            <span className="hover:text-[#ff0055] cursor-help flex items-center gap-1 font-bold text-gray-400">
              Vercel Deployment: <span className="text-green-400 ml-1">STABLE</span>
            </span>
            <span className="hover:text-[#ff6600] cursor-help uppercase">Build: v2.0.4-Alpha</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
