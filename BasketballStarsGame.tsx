import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const BasketballStarsGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['basketball-stars'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    ballX: 180,
    ballY: 420,
    ballVx: 0,
    ballVy: 0,
    ballRadius: 18,
    isShooting: false,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCurrentX: 0,
    dragCurrentY: 0,
    hoopX: 560,
    hoopY: 220,
    hoopWidth: 70,
    hoopVx: 1.5,
    rimLeftX: 525,
    rimRightX: 595,
    streakCount: 0,
    currentScore: 0,
    timerSeconds: 60,
    animId: 0,
    netWave: 0,
    scoredThisShot: false,
  });

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.ballX = 180;
    st.ballY = 420;
    st.ballVx = 0;
    st.ballVy = 0;
    st.isShooting = false;
    st.isDragging = false;
    st.streakCount = 0;
    st.currentScore = 0;
    st.timerSeconds = 60;
    st.hoopX = 560;
    st.hoopY = 220;
    st.scoredThisShot = false;

    setScore(0);
    setStreak(0);
    setTimeLeft(60);
    setGameState('PLAYING');
  };

  const resetBall = () => {
    const st = stateRef.current;
    st.ballX = 140 + Math.random() * 80;
    st.ballY = 420;
    st.ballVx = 0;
    st.ballVy = 0;
    st.isShooting = false;
    st.scoredThisShot = false;
  };

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      stateRef.current.timerSeconds--;
      setTimeLeft(stateRef.current.timerSeconds);
      if (stateRef.current.timerSeconds <= 0) {
        clearInterval(interval);
        Sound.playLose();
        setGameState('GAMEOVER');
        const finalScore = stateRef.current.currentScore;
        if (finalScore > highScore) {
          setHighScore(finalScore);
          confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
        }
        onGameOver?.(finalScore);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, highScore, onGameOver]);

  // Pointer drag events for aiming
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const st = stateRef.current;
    if (st.isShooting) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicking near ball
    if (Math.hypot(x - st.ballX, y - st.ballY) < 65) {
      st.isDragging = true;
      st.dragStartX = st.ballX;
      st.dragStartY = st.ballY;
      st.dragCurrentX = x;
      st.dragCurrentY = y;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (!st.isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    st.dragCurrentX = (e.clientX - rect.left) * scaleX;
    st.dragCurrentY = (e.clientY - rect.top) * scaleY;
  };

  const handlePointerUp = () => {
    const st = stateRef.current;
    if (!st.isDragging) return;
    st.isDragging = false;

    // Launch impulse (inverted pull like slingshot)
    const dx = st.dragStartX - st.dragCurrentX;
    const dy = st.dragStartY - st.dragCurrentY;
    const power = Math.hypot(dx, dy);

    if (power > 20) {
      st.isShooting = true;
      st.ballVx = Math.min(24, Math.max(4, dx * 0.16));
      st.ballVy = Math.min(-6, Math.max(-26, dy * 0.16));
      Sound.playJump();
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

      // Move hoop vertically if score > 5
      if (st.currentScore >= 6) {
        st.hoopY += st.hoopVx;
        if (st.hoopY < 160 || st.hoopY > 300) st.hoopVx *= -1;
      }
      st.rimLeftX = st.hoopX - 35;
      st.rimRightX = st.hoopX + 35;

      // Ball Physics
      if (st.isShooting) {
        st.ballX += st.ballVx;
        st.ballY += st.ballVy;
        st.ballVy += 0.58; // gravity

        // Bounce off backboard (at st.hoopX + 42)
        const boardX = st.hoopX + 40;
        if (
          st.ballX + st.ballRadius >= boardX &&
          st.ballX - st.ballRadius <= boardX + 12 &&
          st.ballY >= st.hoopY - 80 &&
          st.ballY <= st.hoopY + 30
        ) {
          st.ballVx = -Math.abs(st.ballVx) * 0.65;
          Sound.playHit();
        }

        // Rim collisions
        const distLeftRim = Math.hypot(st.ballX - st.rimLeftX, st.ballY - st.hoopY);
        if (distLeftRim < st.ballRadius + 4) {
          st.ballVx = -st.ballVx * 0.7;
          st.ballVy = -st.ballVy * 0.7;
          Sound.playHit();
        }
        const distRightRim = Math.hypot(st.ballX - st.rimRightX, st.ballY - st.hoopY);
        if (distRightRim < st.ballRadius + 4) {
          st.ballVx = -st.ballVx * 0.7;
          st.ballVy = -st.ballVy * 0.7;
          Sound.playHit();
        }

        // SWISH Detection: passing downwards through hoop center
        if (
          !st.scoredThisShot &&
          st.ballVy > 0 &&
          st.ballX > st.rimLeftX + 5 &&
          st.ballX < st.rimRightX - 5 &&
          Math.abs(st.ballY - (st.hoopY + 10)) < 15
        ) {
          st.scoredThisShot = true;
          st.streakCount++;
          const streakMultiplier = Math.min(4, Math.floor(st.streakCount / 2) + 1);
          const pointsEarned = 2 * streakMultiplier;
          st.currentScore += pointsEarned;
          st.timerSeconds = Math.min(60, st.timerSeconds + 2); // bonus time

          setScore(st.currentScore);
          setStreak(st.streakCount);
          onScoreUpdate?.(st.currentScore);

          st.netWave = 15;
          Sound.playWin();

          if (st.streakCount >= 3) {
            confetti({ particleCount: 30, spread: 45, origin: { x: st.hoopX / 720, y: st.hoopY / 540 } });
          }
        }

        // Out of bounds / floor reset
        if (st.ballY > 520 || st.ballX > 750 || st.ballX < -30) {
          if (!st.scoredThisShot) {
            st.streakCount = 0;
            setStreak(0);
          }
          resetBall();
        }
      }

      if (st.netWave > 0) st.netWave *= 0.9;

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Arena background
      const courtGrad = ctx.createLinearGradient(0, 0, 0, h);
      courtGrad.addColorStop(0, '#1e1b4b');
      courtGrad.addColorStop(0.7, '#312e81');
      courtGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = courtGrad;
      ctx.fillRect(0, 0, w, h);

      // Court floor with polished wood planks
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 440, w, 100);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      for (let py = 455; py < 540; py += 16) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
      }

      // Three point line & paint keys
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(st.hoopX, 440, 260, Math.PI, Math.PI * 1.5);
      ctx.stroke();

      // Backboard & Pole
      const hy = st.hoopY;
      const hx = st.hoopX;

      // Heavy stanchion pole
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(hx + 42, hy - 40);
      ctx.lineTo(hx + 100, 440);
      ctx.stroke();

      // Clear tempered glass backboard
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.fillRect(hx + 38, hy - 80, 8, 100);
      ctx.strokeRect(hx + 38, hy - 80, 8, 100);

      // Orange Rim
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(st.rimLeftX, hy);
      ctx.lineTo(st.rimRightX, hy);
      ctx.stroke();

      // White Net with swing wave
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      const netBottomY = hy + 40;
      const wave = Math.sin(Date.now() / 80) * st.netWave;

      ctx.beginPath();
      ctx.moveTo(st.rimLeftX, hy);
      ctx.quadraticCurveTo(hx - 10 + wave, hy + 20, hx - 15 + wave, netBottomY);
      ctx.lineTo(hx + 15 + wave, netBottomY);
      ctx.quadraticCurveTo(hx + 10 + wave, hy + 20, st.rimRightX, hy);
      ctx.stroke();

      // Net cross stitches
      ctx.beginPath();
      ctx.moveTo(st.rimLeftX + 15, hy);
      ctx.lineTo(hx + 10 + wave, netBottomY);
      ctx.moveTo(st.rimRightX - 15, hy);
      ctx.lineTo(hx - 10 + wave, netBottomY);
      ctx.stroke();

      // Aiming trajectory dots
      if (st.isDragging) {
        const dx = st.dragStartX - st.dragCurrentX;
        const dy = st.dragStartY - st.dragCurrentY;
        const initialVx = dx * 0.16;
        const initialVy = dy * 0.16;

        ctx.fillStyle = '#facc15';
        for (let t = 1; t <= 18; t += 2) {
          const px = st.ballX + initialVx * t;
          const py = st.ballY + initialVy * t + 0.5 * 0.58 * t * t;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2, 6 - t * 0.25), 0, Math.PI * 2);
          ctx.fill();
        }

        // Drag vector arrow
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(st.ballX, st.ballY);
        ctx.lineTo(st.dragCurrentX, st.dragCurrentY);
        ctx.stroke();
      }

      // Basketball
      ctx.save();
      ctx.translate(st.ballX, st.ballY);

      // Fiery trail if streak >= 2
      if (st.streakCount >= 2) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, st.ballRadius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Ball sphere
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, 0, st.ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Black seam curves
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, st.ballRadius, 0, Math.PI * 2);
      ctx.moveTo(-st.ballRadius, 0);
      ctx.lineTo(st.ballRadius, 0);
      ctx.moveTo(0, -st.ballRadius);
      ctx.lineTo(0, st.ballRadius);
      ctx.stroke();

      ctx.restore();

      st.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => {
      isRunning = false;
      cancelAnimationFrame(stateRef.current.animId);
    };
  }, [gameState, onScoreUpdate, onGameOver]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 select-none overflow-hidden">
      {/* Top HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none text-white drop-shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-orange-400 font-bold text-xs">TIME</span>
            <span className="font-mono text-base font-bold tabular-nums text-yellow-300">{timeLeft}s</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs">SCORE</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">{score}</span>
          </div>
          {streak > 1 && (
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1 rounded-xl font-bold text-xs animate-pulse">
              🔥 {streak}x STREAK
            </div>
          )}
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-orange-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-orange-500/20 cursor-crosshair touch-none"
      />

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🏀</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Basketball Stars</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Drag the ball backwards to aim the shot arc, release to shoot! Chain swishes for fireball streak combos.
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Shoot Hoops
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">⏱️</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Time's Up!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Points</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Longest Streak</span>
              <span className="font-bold text-orange-400 font-mono">{streak}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Score</span>
              <span className="font-bold text-yellow-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Play Another Round
          </button>
        </div>
      )}
    </div>
  );
};
