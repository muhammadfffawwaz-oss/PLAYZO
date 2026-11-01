import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const MotoRacingGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [flips, setFlips] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['moto-racing'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    totalRotation: 0,
    cameraX: 0,
    inAir: false,
    flipsCount: 0,
    keys: { gas: false, brake: false, leanLeft: false, leanRight: false },
    coins: [] as { x: number; y: number; collected: boolean }[],
    animId: 0,
  });

  // Terrain height function
  const getGroundY = (worldX: number) => {
    return 360 + Math.sin(worldX * 0.005) * 60 + Math.sin(worldX * 0.015) * 35;
  };

  const getGroundSlope = (worldX: number) => {
    const dx = 5;
    const y1 = getGroundY(worldX - dx);
    const y2 = getGroundY(worldX + dx);
    return Math.atan2(y2 - y1, dx * 2);
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.x = 100;
    st.y = getGroundY(100) - 25;
    st.vx = 4;
    st.vy = 0;
    st.angle = 0;
    st.angularVelocity = 0;
    st.totalRotation = 0;
    st.flipsCount = 0;
    st.cameraX = 0;
    st.inAir = false;

    // Generate coins along terrain
    st.coins = [];
    for (let cx = 300; cx < 8000; cx += 250 + Math.random() * 200) {
      st.coins.push({ x: cx, y: getGroundY(cx) - 60 - Math.random() * 40, collected: false });
    }

    setScore(0);
    setFlips(0);
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (gameState !== 'PLAYING') {
        if (e.code === 'Space' || e.code === 'Enter') startGame();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') st.keys.gas = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') st.keys.brake = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') st.keys.leanLeft = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') st.keys.leanRight = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') st.keys.gas = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') st.keys.brake = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') st.keys.leanLeft = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') st.keys.leanRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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

      const groundY = getGroundY(st.x);
      const groundSlope = getGroundSlope(st.x);

      // Bike physics
      if (st.keys.gas) {
        st.vx += 0.22;
      } else if (st.keys.brake) {
        st.vx = Math.max(1, st.vx - 0.25);
      } else {
        st.vx = Math.max(2, st.vx - 0.04); // drag
      }
      st.vx = Math.min(16, st.vx);

      // Rotation controls
      if (st.keys.leanLeft) st.angularVelocity -= 0.008;
      if (st.keys.leanRight) st.angularVelocity += 0.008;

      st.angle += st.angularVelocity;
      st.angularVelocity *= 0.94; // damping

      // Check ground contact
      const bikeHeight = 24;
      if (st.y + bikeHeight >= groundY) {
        // On Ground
        if (st.inAir) {
          // Landing check: angle relative to slope
          const diff = Math.abs(st.angle - groundSlope);
          const normalizedDiff = diff % (Math.PI * 2);
          if (normalizedDiff > 1.2 && normalizedDiff < Math.PI * 2 - 1.2) {
            // Wiped out / crashed on head!
            Sound.playExplosion();
            setGameState('GAMEOVER');
            const finalScore = Math.floor(st.x / 10 + st.flipsCount * 200);
            if (finalScore > highScore) {
              setHighScore(finalScore);
              confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
            }
            onGameOver?.(finalScore);
            isRunning = false;
            return;
          }
          st.inAir = false;
        }

        st.y = groundY - bikeHeight;
        st.vy = 0;
        // Align smoothly to ground slope
        st.angle += (groundSlope - st.angle) * 0.15;
      } else {
        // Airborne
        st.inAir = true;
        st.vy += 0.42; // gravity
        st.totalRotation += st.angularVelocity;
        if (Math.abs(st.totalRotation) >= Math.PI * 2) {
          st.flipsCount++;
          setFlips(st.flipsCount);
          st.totalRotation = 0;
          Sound.playWin();
        }
      }

      st.x += st.vx;
      st.y += st.vy;
      st.cameraX = st.x - 200;

      // Coin pickups
      for (const coin of st.coins) {
        if (!coin.collected && Math.hypot(st.x - coin.x, st.y - coin.y) < 40) {
          coin.collected = true;
          Sound.playCoin();
        }
      }

      const currentScore = Math.floor(st.x / 10 + st.flipsCount * 200);
      setScore(currentScore);
      onScoreUpdate?.(currentScore);

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(1, '#fed7aa');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Parallax Mountains
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let px = 0; px <= w; px += 40) {
        const mx = px + st.cameraX * 0.2;
        const my = 260 + Math.sin(mx * 0.003) * 80;
        ctx.lineTo(px, my);
      }
      ctx.lineTo(w, h);
      ctx.fill();

      // Foreground Hills & Track
      ctx.save();
      ctx.translate(-st.cameraX, 0);

      // Terrain body
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(st.cameraX - 50, h);
      for (let wx = st.cameraX - 50; wx <= st.cameraX + w + 50; wx += 20) {
        ctx.lineTo(wx, getGroundY(wx));
      }
      ctx.lineTo(st.cameraX + w + 50, h);
      ctx.fill();

      // Grass top layer
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let wx = st.cameraX - 50; wx <= st.cameraX + w + 50; wx += 20) {
        ctx.lineTo(wx, getGroundY(wx));
      }
      ctx.stroke();

      // Render Coins
      for (const coin of st.coins) {
        if (coin.collected || coin.x < st.cameraX - 50 || coin.x > st.cameraX + w + 50) continue;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw Stunt Motorbike
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(st.angle);

      // Wheels
      const wheelR = 14;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-26, 12, wheelR, 0, Math.PI * 2);
      ctx.arc(26, 12, wheelR, 0, Math.PI * 2);
      ctx.fill();
      // Wheel rims
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Bike chassis / frame
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-26, 12);
      ctx.lineTo(0, -2);
      ctx.lineTo(26, 12);
      ctx.moveTo(0, -2);
      ctx.lineTo(16, -14); // handlebars
      ctx.stroke();

      // Rider body
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.roundRect(-8, -26, 16, 20, 4);
      ctx.fill();

      // Helmet
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(4, -36, 10, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, -38, 7, 5);

      ctx.restore();
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
      {/* HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none text-white drop-shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-cyan-400 font-bold text-xs mr-2">DISTANCE</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">{score}m</span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-amber-400 font-bold text-xs mr-2">FLIPS</span>
            <span className="font-mono text-base font-bold tabular-nums text-yellow-300">{flips}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-cyan-400 font-bold tabular-nums">{highScore}m</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-cyan-500/20"
      />

      {/* Touch mobile controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4 z-10 md:hidden">
        <button
          onTouchStart={() => (stateRef.current.keys.leanLeft = true)}
          onTouchEnd={() => (stateRef.current.keys.leanLeft = false)}
          className="p-3 bg-slate-800/80 text-white rounded-xl border border-white/10 text-xs font-bold"
        >
          Tilt Back
        </button>
        <button
          onTouchStart={() => (stateRef.current.keys.brake = true)}
          onTouchEnd={() => (stateRef.current.keys.brake = false)}
          className="p-3 bg-red-600/80 text-white rounded-xl text-xs font-bold"
        >
          Brake
        </button>
        <button
          onTouchStart={() => (stateRef.current.keys.gas = true)}
          onTouchEnd={() => (stateRef.current.keys.gas = false)}
          className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          Gas ⚡
        </button>
        <button
          onTouchStart={() => (stateRef.current.keys.leanRight = true)}
          onTouchEnd={() => (stateRef.current.keys.leanRight = false)}
          className="p-3 bg-slate-800/80 text-white rounded-xl border border-white/10 text-xs font-bold"
        >
          Tilt Fwd
        </button>
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🏍️</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Moto Racing: Stunt Trials</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Throttle over hills, perform mid-air backflips for bonus score, and stick the landing without wiping out!
          </p>
          <div className="flex gap-4 mb-6 text-xs text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-white/10">
            <span>↑ / W: Gas</span>
            <span>·</span>
            <span>↓ / S: Brake</span>
            <span>·</span>
            <span>← / →: Tilt & Flips</span>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Ride Now
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Wiped Out!</h2>
          <p className="text-slate-400 text-sm mb-5">Landed upside down on the hill!</p>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Distance</span>
              <span className="font-bold text-white font-mono">{score}m</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Stunt Flips Completed</span>
              <span className="font-bold text-amber-400 font-mono">{flips}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Record</span>
              <span className="font-bold text-cyan-400 font-mono">{highScore}m</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Retry Stunt
          </button>
        </div>
      )}
    </div>
  );
};
