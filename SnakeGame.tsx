import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type Point = { x: number; y: number };

export const SnakeGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [apples, setApples] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['snake-game'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ] as Point[],
    dir: { x: 1, y: 0 } as Point,
    nextDir: { x: 1, y: 0 } as Point,
    food: { x: 15, y: 10 } as Point,
    star: null as (Point & { timer: number }) | null,
    gridWidth: 24,
    gridHeight: 18,
    speedMs: 110,
    score: 0,
    applesEaten: 0,
    animId: 0,
    lastTick: 0,
    wallMode: true,
  });

  const spawnFood = (snake: Point[]) => {
    const st = stateRef.current;
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * st.gridWidth),
        y: Math.floor(Math.random() * st.gridHeight),
      };
      if (!snake.some((seg) => seg.x === newFood.x && seg.y === newFood.y)) break;
    }
    st.food = newFood;

    // 25% chance to spawn a bonus star
    if (Math.random() < 0.25 && !st.star) {
      let starPos: Point;
      while (true) {
        starPos = {
          x: Math.floor(Math.random() * st.gridWidth),
          y: Math.floor(Math.random() * st.gridHeight),
        };
        if (!snake.some((seg) => seg.x === starPos.x && seg.y === starPos.y)) break;
      }
      st.star = { ...starPos, timer: 60 };
    }
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.snake = [
      { x: 10, y: 9 },
      { x: 9, y: 9 },
      { x: 8, y: 9 },
    ];
    st.dir = { x: 1, y: 0 };
    st.nextDir = { x: 1, y: 0 };
    st.speedMs = 110;
    st.score = 0;
    st.applesEaten = 0;
    st.star = null;
    spawnFood(st.snake);

    setScore(0);
    setApples(0);
    setGameState('PLAYING');
  };

  const changeDirection = useCallback((dx: number, dy: number) => {
    const st = stateRef.current;
    // Disallow 180 reverse into own neck
    if (dx !== -st.dir.x || dy !== -st.dir.y) {
      st.nextDir = { x: dx, y: dy };
    }
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (gameState !== 'PLAYING') {
        if (e.code === 'Space' || e.code === 'Enter') startGame();
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') changeDirection(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') changeDirection(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') changeDirection(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') changeDirection(1, 0);
      if (e.code === 'Space') {
        setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, changeDirection]);

  // Main Loop
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

      if (timestamp - st.lastTick >= st.speedMs) {
        st.lastTick = timestamp;

        // Apply direction
        st.dir = st.nextDir;
        const head = st.snake[0];
        let nextX = head.x + st.dir.x;
        let nextY = head.y + st.dir.y;

        // Wall collision or wrap
        if (st.wallMode) {
          if (nextX < 0 || nextX >= st.gridWidth || nextY < 0 || nextY >= st.gridHeight) {
            Sound.playExplosion();
            setGameState('GAMEOVER');
            if (st.score > highScore) {
              setHighScore(st.score);
              confetti({ particleCount: 65, spread: 55, origin: { y: 0.6 } });
            }
            onGameOver?.(st.score);
            isRunning = false;
            return;
          }
        } else {
          nextX = (nextX + st.gridWidth) % st.gridWidth;
          nextY = (nextY + st.gridHeight) % st.gridHeight;
        }

        // Self bite collision
        if (st.snake.some((seg) => seg.x === nextX && seg.y === nextY)) {
          Sound.playExplosion();
          setGameState('GAMEOVER');
          if (st.score > highScore) {
            setHighScore(st.score);
            confetti({ particleCount: 65, spread: 55, origin: { y: 0.6 } });
          }
          onGameOver?.(st.score);
          isRunning = false;
          return;
        }

        const newHead = { x: nextX, y: nextY };
        const newSnake = [newHead, ...st.snake];

        // Eat Apple?
        if (nextX === st.food.x && nextY === st.food.y) {
          st.score += 10;
          st.applesEaten++;
          st.speedMs = Math.max(65, 110 - Math.floor(st.applesEaten * 1.5));
          setScore(st.score);
          setApples(st.applesEaten);
          onScoreUpdate?.(st.score);
          Sound.playCoin();
          spawnFood(newSnake);
        } else {
          newSnake.pop();
        }

        // Eat Star?
        if (st.star && nextX === st.star.x && nextY === st.star.y) {
          st.score += 50;
          setScore(st.score);
          onScoreUpdate?.(st.score);
          st.star = null;
          Sound.playWin();
          confetti({ particleCount: 30, spread: 40 });
        }

        if (st.star) {
          st.star.timer--;
          if (st.star.timer <= 0) st.star = null;
        }

        st.snake = newSnake;
      }

      // RENDER
      const w = canvas.width;
      const h = canvas.height;
      const cellW = w / st.gridWidth;
      const cellH = h / st.gridHeight;

      // Dark retro background
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, 0, w, h);

      // Grid checker subtle tiles
      for (let r = 0; r < st.gridHeight; r++) {
        for (let c = 0; c < st.gridWidth; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
            ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }

      // Render Star if active
      if (st.star) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(
          (st.star.x + 0.5) * cellW,
          (st.star.y + 0.5) * cellH,
          cellW * 0.45,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Render Apple
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(
        (st.food.x + 0.5) * cellW,
        (st.food.y + 0.5) * cellH,
        cellW * 0.42,
        0,
        Math.PI * 2
      );
      ctx.fill();
      // Apple leaf
      ctx.fillStyle = '#22c55e';
      ctx.fillRect((st.food.x + 0.45) * cellW, st.food.y * cellH + 2, 4, 6);

      // Render Snake
      st.snake.forEach((seg, idx) => {
        const isHead = idx === 0;
        ctx.fillStyle = isHead ? '#34d399' : '#10b981';
        ctx.beginPath();
        ctx.roundRect(
          seg.x * cellW + 2,
          seg.y * cellH + 2,
          cellW - 4,
          cellH - 4,
          isHead ? 8 : 4
        );
        ctx.fill();

        // Eyes on head
        if (isHead) {
          ctx.fillStyle = '#0f172a';
          const eyeOffset = 6;
          ctx.beginPath();
          ctx.arc(
            (seg.x + 0.5) * cellW + st.dir.y * eyeOffset + st.dir.x * 4,
            (seg.y + 0.5) * cellH + st.dir.x * eyeOffset + st.dir.y * 4,
            3,
            0,
            Math.PI * 2
          );
          ctx.arc(
            (seg.x + 0.5) * cellW - st.dir.y * eyeOffset + st.dir.x * 4,
            (seg.y + 0.5) * cellH - st.dir.x * eyeOffset + st.dir.y * 4,
            3,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      });

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
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-emerald-400 font-bold text-xs mr-2">APPLES</span>
            <span className="font-mono text-base font-bold tabular-nums text-yellow-300">{apples}</span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">SCORE</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">{score}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-emerald-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-emerald-500/20"
      />

      {/* Mobile D-Pad */}
      <div className="grid grid-cols-3 gap-2 mt-3 w-48 md:hidden z-10">
        <div />
        <button
          onClick={() => changeDirection(0, -1)}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold text-center"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => changeDirection(-1, 0)}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold text-center"
        >
          ←
        </button>
        <button
          onClick={() => changeDirection(0, 1)}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold text-center"
        >
          ↓
        </button>
        <button
          onClick={() => changeDirection(1, 0)}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold text-center"
        >
          →
        </button>
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🐍</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Snake Arcade Classic</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Eat juicy red apples to grow longer. Grab glowing yellow stars for 50 bonus points, but avoid hitting the walls or your own tail!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Play Snake
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Tail Collision!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Apples Eaten</span>
              <span className="font-bold text-emerald-400 font-mono">{apples}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Record</span>
              <span className="font-bold text-yellow-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
