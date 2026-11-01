import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

const BUBBLE_RADIUS = 18;
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const BubbleShooterGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['bubble-shooter'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    rows: 10,
    cols: 14,
    grid: [] as (string | null)[][],
    currentBubble: COLORS[0],
    nextBubble: COLORS[1],
    cannonAngle: -Math.PI / 2,
    shootingBubble: null as {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
    } | null,
    shotsFired: 0,
    score: 0,
    animId: 0,
  });

  const getBubblePos = (r: number, c: number) => {
    const isOdd = r % 2 === 1;
    const x = (c + (isOdd ? 1 : 0.5)) * (BUBBLE_RADIUS * 2) + 10;
    const y = (r + 0.5) * (BUBBLE_RADIUS * 1.74) + 10;
    return { x, y };
  };

  const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.score = 0;
    st.shotsFired = 0;
    st.currentBubble = getRandomColor();
    st.nextBubble = getRandomColor();
    st.shootingBubble = null;

    // Fill initial 4 rows
    st.grid = [];
    for (let r = 0; r < st.rows; r++) {
      st.grid[r] = [];
      const colsInRow = r % 2 === 1 ? st.cols - 1 : st.cols;
      for (let c = 0; c < colsInRow; c++) {
        if (r < 4) {
          st.grid[r][c] = getRandomColor();
        } else {
          st.grid[r][c] = null;
        }
      }
    }

    setScore(0);
    setGameState('PLAYING');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const cannonX = 360;
    const cannonY = 500;
    const angle = Math.atan2(mouseY - cannonY, mouseX - cannonX);
    // Limit cannon to upward half plane
    if (angle < -0.15 && angle > -Math.PI + 0.15) {
      stateRef.current.cannonAngle = angle;
    }
  };

  const handlePointerDown = () => {
    if (gameState !== 'PLAYING') return;
    const st = stateRef.current;
    if (st.shootingBubble) return;

    const speed = 16;
    st.shootingBubble = {
      x: 360,
      y: 500,
      vx: Math.cos(st.cannonAngle) * speed,
      vy: Math.sin(st.cannonAngle) * speed,
      color: st.currentBubble,
    };
    st.currentBubble = st.nextBubble;
    st.nextBubble = getRandomColor();
    st.shotsFired++;
    Sound.playShoot();
  };

  // Find clusters and pop
  const checkMatches = (targetR: number, targetC: number, color: string) => {
    const st = stateRef.current;
    const matched: { r: number; c: number }[] = [];
    const visited = new Set<string>();

    const getNeighbors = (r: number, c: number) => {
      const isOdd = r % 2 === 1;
      const neighbors: { r: number; c: number }[] = [];
      const offsets = isOdd
        ? [
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, 0],
            [1, 1],
          ]
        : [
            [-1, -1],
            [-1, 0],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
          ];
      for (const [dr, dc] of offsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < st.rows && nc >= 0 && nc < (nr % 2 === 1 ? st.cols - 1 : st.cols)) {
          neighbors.push({ r: nr, c: nc });
        }
      }
      return neighbors;
    };

    const dfs = (r: number, c: number) => {
      const key = `${r},${c}`;
      if (visited.has(key)) return;
      visited.add(key);
      if (st.grid[r]?.[c] === color) {
        matched.push({ r, c });
        for (const n of getNeighbors(r, c)) dfs(n.r, n.c);
      }
    };

    dfs(targetR, targetC);

    if (matched.length >= 3) {
      matched.forEach(({ r, c }) => {
        st.grid[r][c] = null;
      });
      const points = matched.length * 20;
      st.score += points;
      setScore(st.score);
      onScoreUpdate?.(st.score);
      Sound.playSlice();

      if (matched.length >= 5) {
        confetti({ particleCount: 30, spread: 45 });
      }
    }
  };

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

      // Update shooting bubble
      if (st.shootingBubble) {
        const b = st.shootingBubble;
        b.x += b.vx;
        b.y += b.vy;

        // Bounce walls
        if (b.x - BUBBLE_RADIUS < 10) {
          b.x = 10 + BUBBLE_RADIUS;
          b.vx *= -1;
          Sound.playHit();
        } else if (b.x + BUBBLE_RADIUS > 710) {
          b.x = 710 - BUBBLE_RADIUS;
          b.vx *= -1;
          Sound.playHit();
        }

        // Ceiling collision or colliding with existing grid bubble
        let collided = false;
        let bestR = -1;
        let bestC = -1;

        if (b.y - BUBBLE_RADIUS <= 10) {
          collided = true;
          // Find nearest top cell
          bestR = 0;
          let minDist = 9999;
          for (let c = 0; c < st.cols; c++) {
            const pos = getBubblePos(0, c);
            const dist = Math.abs(pos.x - b.x);
            if (dist < minDist) {
              minDist = dist;
              bestC = c;
            }
          }
        } else {
          // Check collision with grid
          for (let r = 0; r < st.rows; r++) {
            const colsCount = r % 2 === 1 ? st.cols - 1 : st.cols;
            for (let c = 0; c < colsCount; c++) {
              if (st.grid[r][c] !== null) {
                const pos = getBubblePos(r, c);
                if (Math.hypot(pos.x - b.x, pos.y - b.y) < BUBBLE_RADIUS * 1.8) {
                  collided = true;
                  break;
                }
              }
            }
            if (collided) break;
          }

          if (collided) {
            // Find closest empty cell
            let minDist = 9999;
            for (let r = 0; r < st.rows; r++) {
              const colsCount = r % 2 === 1 ? st.cols - 1 : st.cols;
              for (let c = 0; c < colsCount; c++) {
                if (st.grid[r][c] === null) {
                  const pos = getBubblePos(r, c);
                  const dist = Math.hypot(pos.x - b.x, pos.y - b.y);
                  if (dist < minDist) {
                    minDist = dist;
                    bestR = r;
                    bestC = c;
                  }
                }
              }
            }
          }
        }

        if (collided && bestR !== -1 && bestC !== -1) {
          st.grid[bestR][bestC] = b.color;
          const colorToMatch = b.color;
          st.shootingBubble = null;
          checkMatches(bestR, bestC, colorToMatch);

          // Game over if bottom row reached
          if (bestR >= st.rows - 2) {
            Sound.playLose();
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

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Deep galactic backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Render Grid Bubbles
      for (let r = 0; r < st.rows; r++) {
        const colsCount = r % 2 === 1 ? st.cols - 1 : st.cols;
        for (let c = 0; c < colsCount; c++) {
          const color = st.grid[r][c];
          if (color) {
            const { x, y } = getBubblePos(r, c);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, BUBBLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            // Bubble gloss highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(x - 5, y - 5, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Aiming trajectory guide line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(360, 500);
      ctx.lineTo(
        360 + Math.cos(st.cannonAngle) * 300,
        500 + Math.sin(st.cannonAngle) * 300
      );
      ctx.stroke();
      ctx.setLineDash([]);

      // Cannon Base & Barrel
      ctx.save();
      ctx.translate(360, 500);
      ctx.rotate(st.cannonAngle + Math.PI / 2);

      // Cannon barrel
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(-12, -45, 24, 45);

      ctx.restore();

      // Current loaded bubble in cannon
      ctx.fillStyle = st.currentBubble;
      ctx.beginPath();
      ctx.arc(360, 500, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(355, 495, 5, 0, Math.PI * 2);
      ctx.fill();

      // Next preview bubble
      ctx.fillStyle = st.nextBubble;
      ctx.beginPath();
      ctx.arc(300, 505, 12, 0, Math.PI * 2);
      ctx.fill();

      // Moving Shooting Bubble
      if (st.shootingBubble) {
        ctx.fillStyle = st.shootingBubble.color;
        ctx.beginPath();
        ctx.arc(st.shootingBubble.x, st.shootingBubble.y, BUBBLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
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
        <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
          <span className="text-violet-400 font-bold text-xs mr-2">SCORE</span>
          <span className="font-mono text-base font-bold tabular-nums text-white">{score}</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-violet-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-violet-500/20 cursor-crosshair touch-none"
      />

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🔮</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Bubble Shooter Deluxe</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Aim your cannon and fire colored bubbles to form clusters of 3 or more!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Launch Cannon
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Bubbles Dropped Too Low!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Final Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">High Score</span>
              <span className="font-bold text-violet-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
