import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const CarRacingGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['car-racing'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    playerX: 0, // -150 to +150
    targetX: 0,
    speed: 7,
    maxSpeed: 16,
    isBoosting: false,
    nitroAmount: 100,
    roadOffset: 0,
    distance: 0,
    cars: [] as {
      x: number;
      y: number; // 0 (top) to 540 (bottom)
      speed: number;
      color: string;
      width: number;
      height: number;
    }[],
    coins: [] as { x: number; y: number; collected: boolean }[],
    fuels: [] as { x: number; y: number; collected: boolean }[],
    keys: { left: false, right: false, boost: false, brake: false },
    animId: 0,
  });

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.playerX = 0;
    st.targetX = 0;
    st.speed = 8;
    st.nitroAmount = 100;
    st.distance = 0;
    st.cars = [
      { x: -90, y: 100, speed: 4, color: '#e11d48', width: 44, height: 74 },
      { x: 90, y: -150, speed: 5, color: '#f59e0b', width: 44, height: 74 },
    ];
    st.coins = [];
    st.fuels = [];
    setScore(0);
    setNitro(100);
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (gameState !== 'PLAYING') {
        if (e.code === 'Space' || e.code === 'Enter') startGame();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') st.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') st.keys.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'Space') {
        st.keys.boost = true;
        Sound.playShoot();
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') st.keys.brake = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') st.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') st.keys.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'Space') st.keys.boost = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') st.keys.brake = false;
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

      // Handle input speed & steering
      if (st.keys.left) st.playerX -= 6.5;
      if (st.keys.right) st.playerX += 6.5;
      st.playerX = Math.max(-140, Math.min(140, st.playerX));

      if (st.keys.boost && st.nitroAmount > 0) {
        st.speed = Math.min(st.maxSpeed, st.speed + 0.35);
        st.nitroAmount = Math.max(0, st.nitroAmount - 0.4);
      } else if (st.keys.brake) {
        st.speed = Math.max(4, st.speed - 0.4);
      } else {
        if (st.speed > 8) st.speed -= 0.15;
        if (st.speed < 8) st.speed += 0.15;
        st.nitroAmount = Math.min(100, st.nitroAmount + 0.08);
      }
      setNitro(Math.floor(st.nitroAmount));

      st.distance += st.speed;
      st.roadOffset = (st.roadOffset + st.speed) % 80;

      const currentScore = Math.floor(st.distance / 5);
      setScore(currentScore);
      onScoreUpdate?.(currentScore);

      // Spawn traffic cars
      if (Math.random() < 0.025 && st.cars.length < 5) {
        const laneXs = [-105, -35, 35, 105];
        const chosenX = laneXs[Math.floor(Math.random() * laneXs.length)];
        const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
        st.cars.push({
          x: chosenX,
          y: -120,
          speed: 3 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          width: 44,
          height: 74,
        });
      }

      // Spawn fuel & coins
      if (Math.random() < 0.015 && st.fuels.length < 2) {
        st.fuels.push({ x: (Math.random() - 0.5) * 220, y: -80, collected: false });
      }
      if (Math.random() < 0.03 && st.coins.length < 6) {
        st.coins.push({ x: (Math.random() - 0.5) * 220, y: -80, collected: false });
      }

      // Move items
      for (const car of st.cars) {
        car.y += st.speed - car.speed;
      }
      st.cars = st.cars.filter((c) => c.y < 650 && c.y > -250);

      for (const fuel of st.fuels) fuel.y += st.speed;
      for (const coin of st.coins) coin.y += st.speed;

      // Fuel pickup
      for (const fuel of st.fuels) {
        if (!fuel.collected && Math.abs(fuel.y - 420) < 35 && Math.abs(st.playerX - fuel.x) < 40) {
          fuel.collected = true;
          st.nitroAmount = Math.min(100, st.nitroAmount + 35);
          Sound.playCoin();
        }
      }
      st.fuels = st.fuels.filter((f) => !f.collected && f.y < 600);

      // Coin pickup
      for (const coin of st.coins) {
        if (!coin.collected && Math.abs(coin.y - 420) < 30 && Math.abs(st.playerX - coin.x) < 36) {
          coin.collected = true;
          st.distance += 250;
          Sound.playCoin();
        }
      }
      st.coins = st.coins.filter((c) => !c.collected && c.y < 600);

      // Car Collision detection (Player is at y = 420, dimensions 44x76)
      const px = st.playerX;
      const py = 420;
      for (const car of st.cars) {
        if (
          Math.abs(px - car.x) < 36 &&
          Math.abs(py - car.y) < 65
        ) {
          Sound.playExplosion();
          setGameState('GAMEOVER');
          if (currentScore > highScore) {
            setHighScore(currentScore);
            confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
          }
          onGameOver?.(currentScore);
          isRunning = false;
          return;
        }
      }

      // RENDER
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;

      // Dark asphalt & roadside
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Neon road boundary
      const roadWidth = 320;
      ctx.fillStyle = '#111827';
      ctx.fillRect(cx - roadWidth / 2, 0, roadWidth, h);

      // Neon edge stripes
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx - roadWidth / 2, 0);
      ctx.lineTo(cx - roadWidth / 2, h);
      ctx.moveTo(cx + roadWidth / 2, 0);
      ctx.lineTo(cx + roadWidth / 2, h);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dashed lane lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.setLineDash([30, 30]);
      ctx.lineDashOffset = -st.roadOffset;

      const lanes = [-70, 0, 70];
      for (const lx of lanes) {
        ctx.beginPath();
        ctx.moveTo(cx + lx, 0);
        ctx.lineTo(cx + lx, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Speed lines during nitro
      if (st.keys.boost && st.nitroAmount > 0) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const rx = cx - 140 + Math.random() * 280;
          const ry = Math.random() * h;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx, ry + 60);
          ctx.stroke();
        }
      }

      // Draw Coins & Fuel pickups
      for (const coin of st.coins) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx + coin.x, coin.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      for (const fuel of st.fuels) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.roundRect(cx + fuel.x - 10, fuel.y - 12, 20, 24, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('N₂O', cx + fuel.x, fuel.y + 4);
      }

      // Draw Other Traffic Cars
      for (const car of st.cars) {
        ctx.save();
        ctx.translate(cx + car.x, car.y);

        // Car body
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.roundRect(-car.width / 2, -car.height / 2, car.width, car.height, 8);
        ctx.fill();

        // Windshield & roof
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-car.width / 2 + 5, -car.height / 2 + 18, car.width - 10, 36);

        // Wheels
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-car.width / 2 - 4, -car.height / 2 + 10, 5, 16);
        ctx.fillRect(car.width / 2 - 1, -car.height / 2 + 10, 5, 16);
        ctx.fillRect(-car.width / 2 - 4, car.height / 2 - 26, 5, 16);
        ctx.fillRect(car.width / 2 - 1, car.height / 2 - 26, 5, 16);

        // Taillights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-car.width / 2 + 6, car.height / 2 - 6, 8, 4);
        ctx.fillRect(car.width / 2 - 14, car.height / 2 - 6, 8, 4);

        ctx.restore();
      }

      // Draw Player Sports Car
      ctx.save();
      ctx.translate(cx + st.playerX, 420);

      // Nitro exhaust glow
      if (st.keys.boost && st.nitroAmount > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(-12, 38);
        ctx.lineTo(0, 58 + Math.random() * 12);
        ctx.lineTo(12, 38);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Car shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-24, -38, 48, 80, 10);
      ctx.fill();

      // Cyber Car body (Electric Purple & Cyan)
      const carGrad = ctx.createLinearGradient(-22, 0, 22, 0);
      carGrad.addColorStop(0, '#9333ea');
      carGrad.addColorStop(0.5, '#c084fc');
      carGrad.addColorStop(1, '#9333ea');
      ctx.fillStyle = carGrad;
      ctx.beginPath();
      ctx.roundRect(-22, -38, 44, 76, 9);
      ctx.fill();

      // Cyber decals & racing stripe
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-3, -38, 6, 76);

      // Cockpit / Tinted glass
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(-16, -20, 32, 36, 6);
      ctx.fill();

      // Headlights (high beam pointing up)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-18, -38, 7, 5);
      ctx.fillRect(11, -38, 7, 5);

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-26, -24, 5, 18);
      ctx.fillRect(21, -24, 5, 18);
      ctx.fillRect(-26, 10, 5, 18);
      ctx.fillRect(21, 10, 5, 18);

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-cyan-400 font-bold text-xs">NITRO</span>
            <div className="w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-75"
                style={{ width: `${nitro}%` }}
              />
            </div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">DISTANCE</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">{score}m</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          RECORD: <span className="text-cyan-400 font-bold tabular-nums">{highScore}m</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-purple-500/20"
      />

      {/* Touch mobile buttons */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4 z-10 md:hidden">
        <button
          onTouchStart={() => (stateRef.current.keys.left = true)}
          onTouchEnd={() => (stateRef.current.keys.left = false)}
          className="p-4 bg-slate-800/80 text-white rounded-2xl border border-white/10 font-bold"
        >
          ← Left
        </button>
        <button
          onTouchStart={() => (stateRef.current.keys.boost = true)}
          onTouchEnd={() => (stateRef.current.keys.boost = false)}
          className="p-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-bold shadow-lg"
        >
          🚀 Nitro
        </button>
        <button
          onTouchStart={() => (stateRef.current.keys.right = true)}
          onTouchEnd={() => (stateRef.current.keys.right = false)}
          className="p-4 bg-slate-800/80 text-white rounded-2xl border border-white/10 font-bold"
        >
          Right →
        </button>
      </div>

      {/* Start screen */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🏎️</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Car Racing: Cyber Drift</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Weave through neon rush-hour traffic, pick up N₂O canisters, and hit supersonic speeds!
          </p>
          <div className="flex gap-4 mb-6 text-xs text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-white/10">
            <span>← / →: Steer</span>
            <span>·</span>
            <span>↑ / Space: Nitro Boost</span>
            <span>·</span>
            <span>↓: Brake</span>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Start Engine
          </button>
        </div>
      )}

      {/* Game over screen */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Highway Crash!</h2>
          <p className="text-slate-400 text-sm mb-5">High speed collision on the neon expressway.</p>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Distance Traveled</span>
              <span className="font-bold text-white font-mono">{score}m</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Distance</span>
              <span className="font-bold text-cyan-400 font-mono">{highScore}m</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Race Again
          </button>
        </div>
      )}
    </div>
  );
};
