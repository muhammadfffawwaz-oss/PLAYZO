import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const PlatformJumperGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['platform-jumper'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    playerX: 200,
    playerY: 400,
    playerVx: 0,
    playerVy: 0,
    cameraY: 0,
    maxHeight: 0,
    keys: { left: false, right: false },
    platforms: [] as {
      x: number;
      y: number;
      w: number;
      type: 'normal' | 'moving' | 'spring';
      vx: number;
    }[],
    animId: 0,
  });

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.playerX = 200;
    st.playerY = 400;
    st.playerVx = 0;
    st.playerVy = -11;
    st.cameraY = 0;
    st.maxHeight = 0;

    // Generate initial vertical platforms
    st.platforms = [];
    st.platforms.push({ x: 160, y: 460, w: 90, type: 'normal', vx: 0 });

    for (let i = 1; i < 40; i++) {
      const isMoving = Math.random() < 0.25;
      const isSpring = !isMoving && Math.random() < 0.2;
      st.platforms.push({
        x: 40 + Math.random() * 320,
        y: 460 - i * 65,
        w: 80,
        type: isSpring ? 'spring' : isMoving ? 'moving' : 'normal',
        vx: isMoving ? (Math.random() < 0.5 ? 2 : -2) : 0,
      });
    }

    setScore(0);
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
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') st.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') st.keys.right = false;
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

      // Horizontal movement & screen wrap
      if (st.keys.left) st.playerVx = -6;
      else if (st.keys.right) st.playerVx = 6;
      else st.playerVx *= 0.8;

      st.playerX += st.playerVx;
      if (st.playerX < -20) st.playerX = 420;
      if (st.playerX > 420) st.playerX = -20;

      // Vertical gravity
      st.playerVy += 0.42;
      st.playerY += st.playerVy;

      // Camera scrolls up smoothly
      const targetCam = 270 - st.playerY;
      if (targetCam > st.cameraY) {
        st.cameraY += (targetCam - st.cameraY) * 0.2;
      }

      // Max altitude score
      const currentHeight = Math.max(0, Math.floor((400 - st.playerY) / 5));
      if (currentHeight > st.maxHeight) {
        st.maxHeight = currentHeight;
        setScore(st.maxHeight);
        onScoreUpdate?.(st.maxHeight);
      }

      // Move platforms & spawn new ones
      for (const p of st.platforms) {
        if (p.type === 'moving') {
          p.x += p.vx;
          if (p.x < 20 || p.x > 320) p.vx *= -1;
        }

        // Platform bounce landing (only when falling downwards)
        if (
          st.playerVy > 0 &&
          st.playerX + 16 >= p.x &&
          st.playerX - 16 <= p.x + p.w &&
          st.playerY + 24 >= p.y &&
          st.playerY + 24 <= p.y + 16
        ) {
          if (p.type === 'spring') {
            st.playerVy = -19; // super high jump
            Sound.playWin();
          } else {
            st.playerVy = -11.5;
            Sound.playJump();
          }
        }
      }

      // Spawn platforms higher up
      const highestPlat = st.platforms[st.platforms.length - 1];
      if (highestPlat && highestPlat.y + st.cameraY > -200) {
        const isMoving = Math.random() < 0.35;
        const isSpring = !isMoving && Math.random() < 0.2;
        st.platforms.push({
          x: 40 + Math.random() * 320,
          y: highestPlat.y - (55 + Math.random() * 25),
          w: 80,
          type: isSpring ? 'spring' : isMoving ? 'moving' : 'normal',
          vx: isMoving ? (Math.random() < 0.5 ? 2.5 : -2.5) : 0,
        });
      }

      // Clean bottom platforms
      st.platforms = st.platforms.filter((p) => p.y + st.cameraY < 600);

      // Fall off bottom death
      if (st.playerY + st.cameraY > 540) {
        Sound.playExplosion();
        setGameState('GAMEOVER');
        if (st.maxHeight > highScore) {
          setHighScore(st.maxHeight);
          confetti({ particleCount: 60, spread: 50 });
        }
        onGameOver?.(st.maxHeight);
        isRunning = false;
        return;
      }

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Dreamy stratosphere gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0c4a6e');
      skyGrad.addColorStop(0.5, '#0284c7');
      skyGrad.addColorStop(1, '#67e8f9');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(0, st.cameraY);

      // Render Platforms
      for (const p of st.platforms) {
        if (p.y + st.cameraY < -50 || p.y + st.cameraY > h + 50) continue;

        if (p.type === 'spring') {
          // Green platform with golden spring on top
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.w, 14, 6);
          ctx.fill();

          ctx.fillStyle = '#facc15';
          ctx.fillRect(p.x + p.w / 2 - 8, p.y - 8, 16, 8);
        } else if (p.type === 'moving') {
          // Blue neon hover platform
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.w, 14, 6);
          ctx.fill();
        } else {
          // Classic wooden / grass platform
          ctx.fillStyle = '#84cc16';
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.w, 14, 6);
          ctx.fill();
        }
      }

      // Render Jumper Character
      ctx.save();
      ctx.translate(st.playerX, st.playerY);

      // Green alien / frog jumper body
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Big cute eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-7, -12, 6, 0, Math.PI * 2);
      ctx.arc(7, -12, 6, 0, Math.PI * 2);
      ctx.fill();

      // Pupils looking in moving direction
      const eyeDir = st.playerVx > 0 ? 2 : st.playerVx < 0 ? -2 : 0;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-7 + eyeDir, -12, 3, 0, Math.PI * 2);
      ctx.arc(7 + eyeDir, -12, 3, 0, Math.PI * 2);
      ctx.fill();

      // Little feet
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(-10, 18, 6, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(10, 18, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

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
      {/* Top HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none text-white drop-shadow-md">
        <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10 font-bold text-xs text-lime-400">
          ALTITUDE: <span className="font-mono text-base font-bold text-white">{score}m</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          RECORD: <span className="text-lime-400 font-bold tabular-nums">{highScore}m</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={420}
        height={540}
        className="w-full max-w-[420px] aspect-[420/540] bg-slate-950 rounded-2xl shadow-2xl border border-lime-500/20"
      />

      {/* Mobile buttons */}
      <div className="flex justify-center gap-6 mt-3 md:hidden">
        <button
          onTouchStart={() => (stateRef.current.keys.left = true)}
          onTouchEnd={() => (stateRef.current.keys.left = false)}
          className="p-4 bg-slate-800 text-white rounded-2xl font-bold border border-white/10 active:scale-95"
        >
          ← Move Left
        </button>
        <button
          onTouchStart={() => (stateRef.current.keys.right = true)}
          onTouchEnd={() => (stateRef.current.keys.right = false)}
          className="p-4 bg-slate-800 text-white rounded-2xl font-bold border border-white/10 active:scale-95"
        >
          Move Right →
        </button>
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-lime-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🐸</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Mega Platform Jumper</h2>
          <p className="text-slate-300 max-w-xs text-sm mb-6">
            Bounce ever higher into the sky! Steer left/right or A/D. Land on golden springs to rocket upward!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-600 hover:to-emerald-700 text-slate-950 font-black rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-base"
          >
            Start Bouncing
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Fell From Orbit!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Altitude Reached</span>
              <span className="font-bold text-white font-mono">{score}m</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Altitude</span>
              <span className="font-bold text-lime-400 font-mono">{highScore}m</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-600 hover:to-emerald-700 text-slate-950 font-black rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Jump Again
          </button>
        </div>
      )}
    </div>
  );
};
