import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

const COLORS = ['#06b6d4', '#f43f5e', '#facc15', '#a855f7']; // Cyan, Pink, Yellow, Purple

export const ColorSwitchGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['color-switch'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    ballY: 420,
    ballVy: 0,
    ballColorIdx: 0,
    cameraY: 0,
    obstacles: [] as {
      y: number;
      angle: number;
      rotSpeed: number;
      radius: number;
      passed: boolean;
    }[],
    colorSwitchers: [] as { y: number; collected: boolean }[],
    stars: [] as { y: number; collected: boolean }[],
    score: 0,
    animId: 0,
  });

  const bounce = () => {
    if (gameState === 'START') {
      startGame();
      return;
    }
    if (gameState !== 'PLAYING') return;
    const st = stateRef.current;
    st.ballVy = -8.2;
    Sound.playJump();
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.ballY = 420;
    st.ballVy = -6;
    st.ballColorIdx = Math.floor(Math.random() * 4);
    st.cameraY = 0;
    st.score = 0;

    // Generate initial obstacles moving up
    st.obstacles = [];
    st.colorSwitchers = [];
    st.stars = [];

    for (let i = 0; i < 20; i++) {
      const obsY = 240 - i * 280;
      st.obstacles.push({
        y: obsY,
        angle: 0,
        rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.025,
        radius: 80,
        passed: false,
      });

      // Star in center of obstacle
      st.stars.push({ y: obsY, collected: false });

      // Color switcher between obstacles
      st.colorSwitchers.push({ y: obsY - 140, collected: false });
    }

    setScore(0);
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        bounce();
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

      // Gravity & Physics
      st.ballVy += 0.38;
      st.ballY += st.ballVy;

      // Camera smoothly tracks ball upwards
      const targetCamY = 320 - st.ballY;
      if (targetCamY > st.cameraY) {
        st.cameraY += (targetCamY - st.cameraY) * 0.15;
      }

      // Rotate Obstacles
      for (const obs of st.obstacles) {
        obs.angle += obs.rotSpeed;
      }

      const ballScreenY = st.ballY + st.cameraY;
      const ballRadius = 12;

      // Bottom fall death
      if (ballScreenY > 530) {
        Sound.playExplosion();
        setGameState('GAMEOVER');
        if (st.score > highScore) {
          setHighScore(st.score);
          confetti({ particleCount: 60, spread: 50 });
        }
        onGameOver?.(st.score);
        isRunning = false;
        return;
      }

      // Check Color Switcher pickup
      for (const cs of st.colorSwitchers) {
        if (!cs.collected && Math.abs(st.ballY - cs.y) < 24) {
          cs.collected = true;
          // Switch to new color
          st.ballColorIdx = (st.ballColorIdx + 1 + Math.floor(Math.random() * 2)) % 4;
          Sound.playCoin();
          confetti({ particleCount: 20, spread: 40 });
        }
      }

      // Check Stars pickup
      for (const star of st.stars) {
        if (!star.collected && Math.abs(st.ballY - star.y) < 24) {
          star.collected = true;
          st.score++;
          setScore(st.score);
          onScoreUpdate?.(st.score);
          Sound.playScore();
        }
      }

      // Obstacle collision check (circular ring of 4 arcs)
      for (const obs of st.obstacles) {
        const distFromCenter = Math.abs(st.ballY - obs.y);
        // Ball intersects ring wall
        if (distFromCenter >= obs.radius - 16 && distFromCenter <= obs.radius + 16) {
          // Angle of contact
          const contactAngle = st.ballY > obs.y ? Math.PI / 2 : -Math.PI / 2; // bottom or top
          let relativeAngle = (contactAngle - obs.angle) % (Math.PI * 2);
          if (relativeAngle < 0) relativeAngle += Math.PI * 2;

          const arcIndex = Math.floor(relativeAngle / (Math.PI / 2)) % 4;
          if (arcIndex !== st.ballColorIdx) {
            // Hit wrong color!
            Sound.playHit();
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
      const cx = w / 2;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(0, st.cameraY);

      // Draw Rotating Obstacle Rings
      for (const obs of st.obstacles) {
        if (obs.y + st.cameraY < -150 || obs.y + st.cameraY > h + 150) continue;

        ctx.save();
        ctx.translate(cx, obs.y);
        ctx.rotate(obs.angle);

        // 4 color segments
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = COLORS[i];
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.arc(0, 0, obs.radius, i * (Math.PI / 2), (i + 1) * (Math.PI / 2));
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw Stars
      for (const star of st.stars) {
        if (star.collected || star.y + st.cameraY < -50 || star.y + st.cameraY > h + 50) continue;
        ctx.fillStyle = '#facc15';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', cx, star.y);
      }

      // Draw Color Switchers
      for (const cs of st.colorSwitchers) {
        if (cs.collected || cs.y + st.cameraY < -50 || cs.y + st.cameraY > h + 50) continue;
        // 4-quadrant multi-color sphere
        ctx.save();
        ctx.translate(cx, cs.y);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = COLORS[i];
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 14, i * (Math.PI / 2), (i + 1) * (Math.PI / 2));
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Ball
      ctx.fillStyle = COLORS[st.ballColorIdx];
      ctx.shadowColor = COLORS[st.ballColorIdx];
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, st.ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

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
    <div
      onClick={bounce}
      className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 select-none overflow-hidden cursor-pointer"
    >
      {/* Top HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none text-white drop-shadow-md">
        <div className="bg-slate-900/80 backdrop-blur px-4 py-1.5 rounded-xl border border-white/10 font-black text-2xl font-mono text-yellow-300">
          ⭐ {score}
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-pink-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-pink-500/20"
      />

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-pink-500/30 mb-4 animate-bounce">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Color Switch Rush</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Tap or press Space to bounce the colored ball upward! You can ONLY pass through obstacle arcs matching your ball color.
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-base"
          >
            Bounce Ball
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20"
        >
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Color Mismatch!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Stars Collected</span>
              <span className="font-bold text-yellow-300 font-mono text-lg">{score}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Score</span>
              <span className="font-bold text-pink-400 font-mono text-lg">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
