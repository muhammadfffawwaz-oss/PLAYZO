import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const MazeEscapeGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'VICTORY'>('START');
  const [hasKey, setHasKey] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [fogMode, setFogMode] = useState(true);

  const stateRef = useRef({
    gridSize: 19, // odd number for maze walls
    grid: [] as number[][], // 1 = wall, 0 = path
    playerX: 1,
    playerY: 1,
    keyX: 17,
    keyY: 17,
    exitX: 17,
    exitY: 1,
    hasKey: false,
    timer: 0,
    animId: 0,
  });

  // Depth-first search maze generator
  const generateMaze = (size: number) => {
    const grid: number[][] = Array(size)
      .fill(0)
      .map(() => Array(size).fill(1));

    const stack: [number, number][] = [];
    grid[1][1] = 0;
    stack.push([1, 1]);

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = []; // [nr, nc, wallR, wallC]

      const dirs = [
        [-2, 0, -1, 0],
        [2, 0, 1, 0],
        [0, -2, 0, -1],
        [0, 2, 0, 1],
      ];

      for (const [dr, dc, wr, wc] of dirs) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr > 0 && nr < size - 1 && nc > 0 && nc < size - 1 && grid[nr][nc] === 1) {
          neighbors.push([nr, nc, cr + wr, cc + wc]);
        }
      }

      if (neighbors.length > 0) {
        const [nr, nc, wr, wc] = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[wr][wc] = 0;
        grid[nr][nc] = 0;
        stack.push([nr, nc]);
      } else {
        stack.pop();
      }
    }

    return grid;
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.gridSize = 19;
    st.grid = generateMaze(19);
    st.playerX = 1;
    st.playerY = 1;
    st.keyX = 17;
    st.keyY = 17;
    st.exitX = 17;
    st.exitY = 1;
    st.hasKey = false;
    st.timer = 0;

    setHasKey(false);
    setSeconds(0);
    setGameState('PLAYING');
  };

  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      if (gameState !== 'PLAYING') return;
      const st = stateRef.current;
      const nextX = st.playerX + dx;
      const nextY = st.playerY + dy;

      if (st.grid[nextY]?.[nextX] === 0) {
        st.playerX = nextX;
        st.playerY = nextY;
        Sound.playClick();

        // Check key
        if (!st.hasKey && nextX === st.keyX && nextY === st.keyY) {
          st.hasKey = true;
          setHasKey(true);
          Sound.playCoin();
          confetti({ particleCount: 30, spread: 45 });
        }

        // Check exit
        if (st.hasKey && nextX === st.exitX && nextY === st.exitY) {
          Sound.playWin();
          setGameState('VICTORY');
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          const finalScore = Math.max(50, 1000 - st.timer * 15);
          onScoreUpdate?.(finalScore);
          onGameOver?.(finalScore);
        }
      }
    },
    [gameState, onScoreUpdate, onGameOver]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (gameState !== 'PLAYING') {
        if (e.code === 'Space' || e.code === 'Enter') startGame();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') movePlayer(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') movePlayer(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') movePlayer(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') movePlayer(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, movePlayer]);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      stateRef.current.timer++;
      setSeconds(stateRef.current.timer);
    }, 1000);
    return () => clearInterval(interval);
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
      const w = canvas.width;
      const h = canvas.height;
      const cellSize = w / st.gridSize;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Draw Maze Grid
      for (let r = 0; r < st.gridSize; r++) {
        for (let c = 0; c < st.gridSize; c++) {
          const isWall = st.grid[r]?.[c] === 1;
          const x = c * cellSize;
          const y = r * cellSize;

          if (isWall) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellSize, cellSize);
          } else {
            ctx.fillStyle = '#020617';
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }

      // Draw Key if not collected
      if (!st.hasKey) {
        ctx.fillStyle = '#facc15';
        ctx.font = `${Math.floor(cellSize * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔑', (st.keyX + 0.5) * cellSize, (st.keyY + 0.5) * cellSize);
      }

      // Draw Exit Portal
      ctx.fillStyle = st.hasKey ? '#10b981' : '#64748b';
      ctx.beginPath();
      ctx.arc((st.exitX + 0.5) * cellSize, (st.exitY + 0.5) * cellSize, cellSize * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.floor(cellSize * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.hasKey ? '🌀' : '🔒', (st.exitX + 0.5) * cellSize, (st.exitY + 0.5) * cellSize);

      // Draw Player Explorer
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc((st.playerX + 0.5) * cellSize, (st.playerY + 0.5) * cellSize, cellSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fog of War Flashlight
      if (fogMode) {
        const px = (st.playerX + 0.5) * cellSize;
        const py = (st.playerY + 0.5) * cellSize;
        const grad = ctx.createRadialGradient(px, py, cellSize * 1.5, px, py, cellSize * 4.5);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.98)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      st.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => {
      isRunning = false;
      cancelAnimationFrame(stateRef.current.animId);
    };
  }, [gameState, fogMode]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 select-none overflow-hidden">
      {/* Top HUD */}
      <div className="w-full max-w-md flex items-center justify-between mb-2 px-2 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/90 border border-white/10 px-3 py-1 rounded-xl text-xs">
            STATUS: <span className="font-bold text-yellow-300">{hasKey ? 'Key Found! Exit Unlocked' : 'Find Key 🔑'}</span>
          </div>
          <div className="bg-slate-800/90 border border-white/10 px-3 py-1 rounded-xl text-xs font-mono">
            ⏱️ {seconds}s
          </div>
        </div>

        <button
          onClick={() => setFogMode(!fogMode)}
          className={`px-3 py-1 text-xs font-bold rounded-xl border transition-colors ${
            fogMode ? 'bg-purple-600 border-purple-500' : 'bg-slate-800 border-white/10 text-slate-300'
          }`}
        >
          {fogMode ? '🔦 Flashlight On' : 'Full Map'}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={570}
        height={570}
        className="w-full max-w-[570px] aspect-square bg-slate-950 rounded-2xl shadow-2xl border border-teal-500/20"
      />

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-2 mt-3 w-44 md:hidden">
        <div />
        <button
          onClick={() => movePlayer(0, -1)}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => movePlayer(-1, 0)}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold"
        >
          ←
        </button>
        <button
          onClick={() => movePlayer(0, 1)}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold"
        >
          ↓
        </button>
        <button
          onClick={() => movePlayer(1, 0)}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold"
        >
          →
        </button>
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🧭</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Labyrinth Maze Escape</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Navigate dark labyrinth corridors with your flashlight. Grab the Golden Key and reach the exit portal!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-base"
          >
            Enter Maze
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-3xl font-extrabold text-white mb-1">Escaped!</h2>
          <p className="text-slate-300 text-sm mb-4">You found the exit in {seconds} seconds!</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Play Another Maze
          </button>
        </div>
      )}
    </div>
  );
};
