import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

interface Fruit {
  id: number;
  type: 'watermelon' | 'orange' | 'apple' | 'pineapple' | 'bomb';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  sliced: boolean;
  sliceAngle: number;
  color: string;
}

export const FruitNinjaGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [comboText, setComboText] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['fruit-ninja'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    fruits: [] as Fruit[],
    bladeTrail: [] as { x: number; y: number; time: number }[],
    isMouseDown: false,
    score: 0,
    lives: 3,
    nextId: 1,
    lastSpawn: 0,
    splatters: [] as { x: number; y: number; r: number; color: string; alpha: number }[],
    animId: 0,
    currentComboCount: 0,
    comboResetTimer: 0,
  });

  const FRUIT_TYPES = [
    { type: 'watermelon', color: '#16a34a', innerColor: '#ef4444', radius: 30 },
    { type: 'orange', color: '#ea580c', innerColor: '#fed7aa', radius: 24 },
    { type: 'apple', color: '#dc2626', innerColor: '#fef08a', radius: 22 },
    { type: 'pineapple', color: '#ca8a04', innerColor: '#fef08a', radius: 28 },
  ] as const;

  const spawnWave = () => {
    const st = stateRef.current;
    const count = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < 0.22;
      const x = 120 + Math.random() * 480;
      const vx = (360 - x) * 0.015 + (Math.random() - 0.5) * 3;
      const vy = -13 - Math.random() * 4;

      if (isBomb) {
        st.fruits.push({
          id: st.nextId++,
          type: 'bomb',
          x,
          y: 540,
          vx,
          vy,
          radius: 24,
          sliced: false,
          sliceAngle: 0,
          color: '#1e293b',
        });
      } else {
        const ft = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
        st.fruits.push({
          id: st.nextId++,
          type: ft.type,
          x,
          y: 540,
          vx,
          vy,
          radius: ft.radius,
          sliced: false,
          sliceAngle: 0,
          color: ft.innerColor,
        });
      }
    }
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.fruits = [];
    st.bladeTrail = [];
    st.score = 0;
    st.lives = 3;
    st.splatters = [];
    setScore(0);
    setLives(3);
    setGameState('PLAYING');
    spawnWave();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    stateRef.current.isMouseDown = true;
    stateRef.current.bladeTrail = [
      { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, time: Date.now() },
    ];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (!st.isMouseDown || gameState !== 'PLAYING') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    const curX = (e.clientX - rect.left) * scaleX;
    const curY = (e.clientY - rect.top) * scaleY;

    st.bladeTrail.push({ x: curX, y: curY, time: Date.now() });

    // Check intersection with unsliced fruits
    for (const fruit of st.fruits) {
      if (!fruit.sliced) {
        const dist = Math.hypot(fruit.x - curX, fruit.y - curY);
        if (dist < fruit.radius + 15) {
          fruit.sliced = true;
          fruit.sliceAngle = Math.atan2(
            st.bladeTrail[st.bladeTrail.length - 1].y - (st.bladeTrail[st.bladeTrail.length - 2]?.y || curY),
            st.bladeTrail[st.bladeTrail.length - 1].x - (st.bladeTrail[st.bladeTrail.length - 2]?.x || curX)
          );

          if (fruit.type === 'bomb') {
            Sound.playExplosion();
            st.lives = 0;
            setLives(0);
            setGameState('GAMEOVER');
            if (st.score > highScore) {
              setHighScore(st.score);
              confetti({ particleCount: 60, spread: 50 });
            }
            onGameOver?.(st.score);
            return;
          } else {
            Sound.playSlice();
            st.score += 10;
            st.currentComboCount++;
            setScore(st.score);
            onScoreUpdate?.(st.score);

            // Splatter mark on wood
            st.splatters.push({
              x: fruit.x,
              y: fruit.y,
              r: fruit.radius * 1.5,
              color: fruit.color,
              alpha: 0.6,
            });

            // Combo notification
            if (st.currentComboCount >= 3) {
              const comboBonus = st.currentComboCount * 10;
              st.score += comboBonus;
              setScore(st.score);
              setComboText(`${st.currentComboCount}x COMBO! +${comboBonus}pts`);
              setTimeout(() => setComboText(null), 1000);
            }
          }
        }
      }
    }
  };

  const handlePointerUp = () => {
    stateRef.current.isMouseDown = false;
    stateRef.current.currentComboCount = 0;
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const loop = (timestamp: number) => {
      if (!isRunning) return;
      const st = stateRef.current;

      // Spawn timer
      if (timestamp - st.lastSpawn > 2200) {
        st.lastSpawn = timestamp;
        spawnWave();
      }

      // Fruit physics
      for (const f of st.fruits) {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.38; // gravity

        // Missed fruit check
        if (!f.sliced && f.y > 560 && f.vy > 0 && f.type !== 'bomb') {
          f.sliced = true; // prevent double count
          st.lives--;
          setLives(st.lives);
          Sound.playLose();

          if (st.lives <= 0) {
            setGameState('GAMEOVER');
            if (st.score > highScore) {
              setHighScore(st.score);
              confetti({ particleCount: 60, spread: 50 });
            }
            onGameOver?.(st.score);
            isRunning = false;
            return;
          }
        }
      }

      st.fruits = st.fruits.filter((f) => f.y < 650);

      // Clean blade trail
      const now = Date.now();
      st.bladeTrail = st.bladeTrail.filter((pt) => now - pt.time < 180);

      // Fade splatters
      for (const s of st.splatters) s.alpha -= 0.002;
      st.splatters = st.splatters.filter((s) => s.alpha > 0);

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Wooden dojo board background
      const woodGrad = ctx.createLinearGradient(0, 0, 0, h);
      woodGrad.addColorStop(0, '#451a03');
      woodGrad.addColorStop(0.5, '#78350f');
      woodGrad.addColorStop(1, '#291102');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(0, 0, w, h);

      // Wood plank lines
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 3;
      for (let y = 60; y < h; y += 70) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Juice splatters on wood
      for (const s of st.splatters) {
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Render Fruits
      for (const f of st.fruits) {
        ctx.save();
        ctx.translate(f.x, f.y);

        if (f.type === 'bomb') {
          // Black ticking bomb
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
          ctx.fill();

          // Spark fuse
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -f.radius);
          ctx.lineTo(8, -f.radius - 12);
          ctx.stroke();

          // Spark sparkler
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(8, -f.radius - 12, 5 + Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (f.sliced) {
          // Two halves flying apart
          ctx.rotate(f.sliceAngle);

          // Top half
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(-8, -8, f.radius, Math.PI, Math.PI * 2);
          ctx.fill();

          // Bottom half
          ctx.beginPath();
          ctx.arc(8, 8, f.radius, 0, Math.PI);
          ctx.fill();
        } else {
          // Whole fruit
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
          ctx.fill();

          // Outer rind/peel
          ctx.strokeStyle = f.type === 'watermelon' ? '#15803d' : '#f59e0b';
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        ctx.restore();
      }

      // Render Blade Slash Trail
      if (st.bladeTrail.length > 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(st.bladeTrail[0].x, st.bladeTrail[0].y);
        for (let i = 1; i < st.bladeTrail.length; i++) {
          ctx.lineWidth = (i / st.bladeTrail.length) * 8;
          ctx.lineTo(st.bladeTrail[i].x, st.bladeTrail[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

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
            <span className="text-rose-400 font-bold text-xs">LIVES</span>
            <span className="font-mono text-base font-bold text-red-400">
              {'❤️'.repeat(Math.max(0, lives))}
            </span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">SCORE</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">{score}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-rose-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      {comboText && (
        <div className="absolute top-16 z-20 px-6 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl shadow-2xl animate-bounce">
          {comboText}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-rose-500/20 cursor-crosshair touch-none"
      />

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🍉</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Fruit Slicer Blade</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Swipe and slash tossed fruits with your katana! Chain multiple fruits in one swipe for combos. AVOID the ticking bombs!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Draw Katana
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Dojo Round Over!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">All-Time Best</span>
              <span className="font-bold text-rose-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Slice Again
          </button>
        </div>
      )}
    </div>
  );
};
