import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const FlappyBirdGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['flappy-bird'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    birdY: 240,
    birdVelocity: 0,
    birdAngle: 0,
    pipes: [] as {
      x: number;
      topHeight: number;
      bottomHeight: number;
      passed: boolean;
    }[],
    groundOffset: 0,
    gap: 155,
    speed: 3.2,
    score: 0,
    animId: 0,
  });

  const flap = () => {
    if (gameState === 'START') {
      startGame();
      return;
    }
    if (gameState === 'GAMEOVER') {
      return;
    }
    const st = stateRef.current;
    st.birdVelocity = -8.5;
    Sound.playJump();
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.birdY = 240;
    st.birdVelocity = -6;
    st.birdAngle = 0;
    st.score = 0;
    st.pipes = [
      { x: 500, topHeight: 140, bottomHeight: 220, passed: false },
      { x: 740, topHeight: 180, bottomHeight: 180, passed: false },
    ];
    setScore(0);
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        flap();
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
      st.birdVelocity += 0.46;
      st.birdY += st.birdVelocity;
      st.birdAngle = Math.min(Math.PI / 3, Math.max(-Math.PI / 4, st.birdVelocity * 0.08));

      st.groundOffset = (st.groundOffset + st.speed) % 30;

      // Move pipes
      for (const pipe of st.pipes) {
        pipe.x -= st.speed;

        // Check if bird passed pipe
        if (!pipe.passed && pipe.x + 60 < 140) {
          pipe.passed = true;
          st.score++;
          setScore(st.score);
          onScoreUpdate?.(st.score);
          Sound.playScore();
          if (st.score % 10 === 0) {
            confetti({ particleCount: 35, spread: 50, origin: { x: 0.3, y: 0.5 } });
          }
        }
      }

      // Spawn new pipes
      const lastPipe = st.pipes[st.pipes.length - 1];
      if (lastPipe && lastPipe.x < 520) {
        const topH = 80 + Math.random() * 180;
        const botH = 540 - 100 - topH - st.gap;
        st.pipes.push({ x: 760, topHeight: topH, bottomHeight: botH, passed: false });
      }

      // Filter offscreen pipes
      st.pipes = st.pipes.filter((p) => p.x > -90);

      // Floor / Ceiling Collision
      const birdRadius = 16;
      const birdX = 140;
      const groundY = 460;

      if (st.birdY - birdRadius <= 0 || st.birdY + birdRadius >= groundY) {
        Sound.playExplosion();
        setGameState('GAMEOVER');
        if (st.score > highScore) {
          setHighScore(st.score);
          confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
        }
        onGameOver?.(st.score);
        isRunning = false;
        return;
      }

      // Pipe Collisions
      for (const pipe of st.pipes) {
        const pipeW = 68;
        if (birdX + birdRadius > pipe.x && birdX - birdRadius < pipe.x + pipeW) {
          if (st.birdY - birdRadius < pipe.topHeight || st.birdY + birdRadius > groundY - pipe.bottomHeight) {
            Sound.playHit();
            setGameState('GAMEOVER');
            if (st.score > highScore) {
              setHighScore(st.score);
              confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
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

      // Daylight / evening sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.7, '#bae6fd');
      skyGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // City skyline in background
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(0, 360, w, 100);
      for (let bx = 0; bx < w; bx += 55) {
        const bh = 50 + ((bx * 13) % 40);
        ctx.fillRect(bx, 360 - bh, 45, bh);
      }

      // Render Green Pipes
      for (const pipe of st.pipes) {
        const pw = 68;
        // Top pipe
        const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pw, 0);
        topGrad.addColorStop(0, '#22c55e');
        topGrad.addColorStop(0.5, '#4ade80');
        topGrad.addColorStop(1, '#15803d');
        ctx.fillStyle = topGrad;
        ctx.fillRect(pipe.x, 0, pw, pipe.topHeight);
        // Top pipe lip
        ctx.fillRect(pipe.x - 4, pipe.topHeight - 24, pw + 8, 24);

        // Bottom pipe
        const botY = groundY - pipe.bottomHeight;
        ctx.fillStyle = topGrad;
        ctx.fillRect(pipe.x, botY, pw, pipe.bottomHeight);
        // Bottom pipe lip
        ctx.fillRect(pipe.x - 4, botY, pw + 8, 24);
      }

      // Ground (dirt & grass)
      ctx.fillStyle = '#16a34a'; // grass top
      ctx.fillRect(0, groundY, w, 14);
      ctx.fillStyle = '#d97706'; // dirt
      ctx.fillRect(0, groundY + 14, w, h - groundY - 14);

      // Bird
      ctx.save();
      ctx.translate(birdX, st.birdY);
      ctx.rotate(st.birdAngle);

      // Yellow chubby bird body
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing flap animation
      const wingY = Math.sin(Date.now() / 80) * 4;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-6, wingY, 10, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Big cartoon eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(8, -5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(10, -5, 3, 0, Math.PI * 2);
      ctx.fill();

      // Orange Beak
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(14, -2);
      ctx.lineTo(24, 2);
      ctx.lineTo(14, 6);
      ctx.fill();

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
      onClick={flap}
      className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 select-none overflow-hidden cursor-pointer"
    >
      {/* Top HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none text-white drop-shadow-md">
        <div className="bg-slate-900/80 backdrop-blur px-4 py-1.5 rounded-xl border border-white/10 font-black text-2xl font-mono text-yellow-300">
          {score}
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-yellow-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-sky-400/20"
      />

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-400/30 mb-4 animate-bounce">
            <span className="text-3xl">🪽</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Flappy Wings</h2>
          <p className="text-slate-200 max-w-md text-sm mb-6">
            Tap or press Space to flap upward. Time each wing stroke to glide through the pipe gaps!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 font-black rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Tap to Flap
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20"
        >
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Game Over!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Score</span>
              <span className="font-bold text-yellow-300 font-mono text-lg">{score}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Score</span>
              <span className="font-bold text-amber-400 font-mono text-lg">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 font-black rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Flap Again
          </button>
        </div>
      )}
    </div>
  );
};
