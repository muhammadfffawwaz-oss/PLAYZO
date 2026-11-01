import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const EndlessRunnerGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [crystals, setCrystals] = useState(0);
  const [dashMeter, setDashMeter] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['endless-runner'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    playerY: 340,
    playerVy: 0,
    isJumping: false,
    jumpCount: 0,
    isSliding: false,
    slideTimer: 0,
    isDashing: false,
    dashTimer: 0,
    speed: 6.5,
    distance: 0,
    crystalsCount: 0,
    dashCharge: 0,
    platforms: [] as { x: number; y: number; w: number }[],
    crystals: [] as { x: number; y: number; collected: boolean }[],
    obstacles: [] as { x: number; y: number; type: 'drone' | 'spikes' }[],
    animId: 0,
  });

  const jump = () => {
    const st = stateRef.current;
    if (st.jumpCount < 2) {
      st.playerVy = -11.5;
      st.jumpCount++;
      st.isJumping = true;
      st.isSliding = false;
      Sound.playJump();
    }
  };

  const slide = () => {
    const st = stateRef.current;
    if (!st.isSliding) {
      st.isSliding = true;
      st.slideTimer = 28;
      if (st.isJumping) {
        st.playerVy = 12; // fast ground slam
      }
      Sound.playScore();
    }
  };

  const triggerDash = () => {
    const st = stateRef.current;
    if (st.dashCharge >= 100 && !st.isDashing) {
      st.isDashing = true;
      st.dashTimer = 90;
      st.dashCharge = 0;
      setDashMeter(0);
      Sound.playWin();
      confetti({ particleCount: 30, spread: 45 });
    }
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.playerY = 340;
    st.playerVy = 0;
    st.jumpCount = 0;
    st.speed = 6.5;
    st.distance = 0;
    st.crystalsCount = 0;
    st.dashCharge = 0;
    st.isDashing = false;

    // Initial flat rooftops
    st.platforms = [
      { x: 0, y: 380, w: 500 },
      { x: 550, y: 360, w: 400 },
      { x: 1000, y: 380, w: 450 },
    ];
    st.crystals = [
      { x: 300, y: 340, collected: false },
      { x: 350, y: 340, collected: false },
      { x: 700, y: 320, collected: false },
    ];
    st.obstacles = [{ x: 450, y: 350, type: 'spikes' }];

    setScore(0);
    setCrystals(0);
    setDashMeter(0);
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') {
        if (e.code === 'Space' || e.code === 'Enter') startGame();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'Space') {
        e.preventDefault();
        jump();
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        slide();
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'Shift') {
        triggerDash();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;
      const st = stateRef.current;

      const currentSpeed = st.isDashing ? st.speed * 2 : st.speed;
      st.distance += currentSpeed;
      st.speed = Math.min(14, 6.5 + st.distance / 3000);

      const totalScore = Math.floor(st.distance / 10 + st.crystalsCount * 25);
      setScore(totalScore);
      onScoreUpdate?.(totalScore);

      // Dash timer
      if (st.isDashing) {
        st.dashTimer--;
        if (st.dashTimer <= 0) st.isDashing = false;
      }

      // Slide timer
      if (st.isSliding) {
        st.slideTimer--;
        if (st.slideTimer <= 0) st.isSliding = false;
      }

      // Move platforms
      for (const p of st.platforms) p.x -= currentSpeed;
      for (const c of st.crystals) c.x -= currentSpeed;
      for (const obs of st.obstacles) obs.x -= currentSpeed;

      // Spawn next platform
      const lastPlat = st.platforms[st.platforms.length - 1];
      if (lastPlat && lastPlat.x + lastPlat.w < 900) {
        const gap = 90 + Math.random() * 110;
        const pw = 300 + Math.random() * 300;
        const py = 320 + (Math.random() - 0.5) * 80;
        const nextX = lastPlat.x + lastPlat.w + gap;
        st.platforms.push({ x: nextX, y: py, w: pw });

        // Spawn crystals on platform
        for (let i = 0; i < 4; i++) {
          st.crystals.push({ x: nextX + 60 + i * 40, y: py - 40, collected: false });
        }

        // Spawn obstacle
        if (Math.random() < 0.6) {
          const isDrone = Math.random() < 0.4;
          st.obstacles.push({
            x: nextX + pw * 0.6,
            y: isDrone ? py - 55 : py - 20,
            type: isDrone ? 'drone' : 'spikes',
          });
        }
      }

      // Clean offscreen
      st.platforms = st.platforms.filter((p) => p.x + p.w > -100);
      st.crystals = st.crystals.filter((c) => c.x > -50 && !c.collected);
      st.obstacles = st.obstacles.filter((o) => o.x > -50);

      // Player Physics
      st.playerY += st.playerVy;
      st.playerVy += 0.65; // gravity

      // Check ground landing on platforms
      const playerX = 140;
      let onGround = false;

      for (const p of st.platforms) {
        if (
          playerX >= p.x - 20 &&
          playerX <= p.x + p.w + 10 &&
          st.playerY + 28 >= p.y &&
          st.playerY + 28 <= p.y + 24 &&
          st.playerVy >= 0
        ) {
          st.playerY = p.y - 28;
          st.playerVy = 0;
          st.isJumping = false;
          st.jumpCount = 0;
          onGround = true;
          break;
        }
      }

      // Crystal pickups
      for (const crystal of st.crystals) {
        if (!crystal.collected && Math.hypot(playerX - crystal.x, st.playerY - crystal.y) < 36) {
          crystal.collected = true;
          st.crystalsCount++;
          st.dashCharge = Math.min(100, st.dashCharge + 10);
          setCrystals(st.crystalsCount);
          setDashMeter(st.dashCharge);
          Sound.playCoin();
        }
      }

      // Fall in chasm Game Over
      if (st.playerY > 520) {
        Sound.playExplosion();
        setGameState('GAMEOVER');
        if (totalScore > highScore) {
          setHighScore(totalScore);
          confetti({ particleCount: 60, spread: 50 });
        }
        onGameOver?.(totalScore);
        isRunning = false;
        return;
      }

      // Obstacle collisions (immune during hyper dash)
      if (!st.isDashing) {
        for (const obs of st.obstacles) {
          if (Math.abs(playerX - obs.x) < 28) {
            if (obs.type === 'spikes') {
              if (Math.abs(st.playerY + 16 - obs.y) < 24) {
                Sound.playHit();
                setGameState('GAMEOVER');
                if (totalScore > highScore) {
                  setHighScore(totalScore);
                  confetti({ particleCount: 60, spread: 50 });
                }
                onGameOver?.(totalScore);
                isRunning = false;
                return;
              }
            } else if (obs.type === 'drone') {
              // Can slide under drone!
              if (!st.isSliding && Math.abs(st.playerY - obs.y) < 30) {
                Sound.playHit();
                setGameState('GAMEOVER');
                if (totalScore > highScore) {
                  setHighScore(totalScore);
                  confetti({ particleCount: 60, spread: 50 });
                }
                onGameOver?.(totalScore);
                isRunning = false;
                return;
              }
            }
          }
        }
      }

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Cyberpunk Twilight City Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#11052C');
      skyGrad.addColorStop(0.5, '#3D087B');
      skyGrad.addColorStop(1, '#F43B86');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant Parallax Skyscrapers
      ctx.fillStyle = '#1e1b4b';
      for (let bx = 0; bx < w; bx += 70) {
        const offX = ((bx - st.distance * 0.1) % (w + 140)) - 70;
        const bh = 120 + ((bx * 17) % 100);
        ctx.fillRect(offX, 360 - bh, 60, bh);
      }

      // Platforms (Rooftops)
      for (const p of st.platforms) {
        // Building face
        const platGrad = ctx.createLinearGradient(p.x, p.y, p.x, h);
        platGrad.addColorStop(0, '#1e293b');
        platGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = platGrad;
        ctx.fillRect(p.x, p.y, p.w, h - p.y);

        // Neon edge line
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.w, p.y);
        ctx.stroke();
      }

      // Crystals
      for (const c of st.crystals) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 12);
        ctx.lineTo(c.x + 8, c.y);
        ctx.lineTo(c.x, c.y + 12);
        ctx.lineTo(c.x - 8, c.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Obstacles
      for (const obs of st.obstacles) {
        if (obs.type === 'spikes') {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(obs.x - 14, obs.y + 10);
          ctx.lineTo(obs.x, obs.y - 14);
          ctx.lineTo(obs.x + 14, obs.y + 10);
          ctx.closePath();
          ctx.fill();
        } else {
          // Hover Drone
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.ellipse(obs.x, obs.y, 16, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Laser beam underneath
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + 8);
          ctx.lineTo(obs.x, obs.y + 35);
          ctx.stroke();
        }
      }

      // Player Ninja
      ctx.save();
      ctx.translate(playerX, st.playerY);

      if (st.isDashing) {
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;
      }

      if (st.isSliding) {
        // Slide pose
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.roundRect(-24, -12, 48, 22, 6);
        ctx.fill();
      } else {
        // Ninja Body
        ctx.fillStyle = '#9333ea';
        ctx.beginPath();
        ctx.roundRect(-12, -28, 24, 32, 6);
        ctx.fill();

        // Scarf trailing
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-22, -24, 12, 6);

        // Headband & eyes
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(4, -22, 8, 4);
      }

      ctx.restore();

      st.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => {
      isRunning = false;
      cancelAnimationFrame(stateRef.current.animId);
    };
  }, [gameState, onScoreUpdate, onGameOver, highScore]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 select-none overflow-hidden">
      {/* Top HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none text-white drop-shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-cyan-400 font-bold text-xs">CRYSTALS</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">{crystals}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-fuchsia-400 font-bold text-xs">HYPER DASH (D)</span>
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 ${
                  dashMeter >= 100 ? 'animate-pulse' : ''
                }`}
                style={{ width: `${dashMeter}%` }}
              />
            </div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs">
            SCORE: <span className="text-amber-400 font-bold">{score}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-fuchsia-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-fuchsia-500/20"
      />

      {/* Mobile touch controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4 z-10 md:hidden">
        <button
          onClick={jump}
          className="p-4 bg-purple-600 text-white rounded-2xl font-bold active:scale-95 shadow-lg"
        >
          Jump (Double Jump) ↑
        </button>
        <button
          onClick={slide}
          className="p-4 bg-amber-600 text-white rounded-2xl font-bold active:scale-95 shadow-lg"
        >
          Slide ↓
        </button>
        {dashMeter >= 100 && (
          <button
            onClick={triggerDash}
            className="p-4 bg-cyan-500 text-slate-950 rounded-2xl font-black active:scale-95 animate-pulse shadow-lg"
          >
            HYPER DASH ⚡
          </button>
        )}
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🥷</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Cyber Ninja Runner</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Parkour across neon rooftop chasms! Press Jump twice for Double Jump, slide under laser drones, and unleash Hyper Dash.
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-base"
          >
            Start Parkour
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Rooftop Fall!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Distance & Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Crystals Snatched</span>
              <span className="font-bold text-cyan-400 font-mono">{crystals}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">All-Time Best</span>
              <span className="font-bold text-fuchsia-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  );
};
