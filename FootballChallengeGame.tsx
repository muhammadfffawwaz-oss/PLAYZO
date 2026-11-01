import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const FootballChallengeGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['football-challenge'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    ballX: 360,
    ballY: 440,
    ballZ: 0, // 0 = spot, 1 = in goal line
    ballVx: 0,
    ballVy: 0,
    ballCurve: 0,
    isKicking: false,
    keeperX: 360,
    keeperY: 220,
    keeperVx: 2,
    keeperDiveX: 0,
    isKeeperDiving: false,
    dragStartX: 0,
    dragStartY: 0,
    isDragging: false,
    currentScore: 0,
    currentRound: 1,
    maxRounds: 5,
    animId: 0,
    targets: [
      { x: 230, y: 155, points: 100, hit: false, label: '100' }, // top left
      { x: 490, y: 155, points: 100, hit: false, label: '100' }, // top right
      { x: 230, y: 250, points: 50, hit: false, label: '50' }, // bot left
      { x: 490, y: 250, points: 50, hit: false, label: '50' }, // bot right
    ],
  });

  const resetRound = () => {
    const st = stateRef.current;
    st.ballX = 360;
    st.ballY = 440;
    st.ballZ = 0;
    st.ballVx = 0;
    st.ballVy = 0;
    st.ballCurve = 0;
    st.isKicking = false;
    st.keeperX = 360;
    st.isKeeperDiving = false;
    st.keeperDiveX = 0;
    setFeedback(null);
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.currentScore = 0;
    st.currentRound = 1;
    st.targets.forEach((t) => (t.hit = false));
    resetRound();
    setScore(0);
    setRound(1);
    setGameState('PLAYING');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const st = stateRef.current;
    if (st.isKicking) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (Math.hypot(x - st.ballX, y - st.ballY) < 60) {
      st.isDragging = true;
      st.dragStartX = x;
      st.dragStartY = y;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (!st.isDragging) return;
    st.isDragging = false;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;

    const dx = endX - st.dragStartX;
    const dy = endY - st.dragStartY;

    // Must swipe upward
    if (dy < -30) {
      st.isKicking = true;
      st.ballVx = dx * 0.12;
      st.ballVy = dy * 0.14;
      st.ballCurve = (dx / 100) * 0.3; // spin

      // Keeper AI dives towards intended path with some error
      st.isKeeperDiving = true;
      const targetPredictX = 360 + dx * 2.2;
      st.keeperDiveX = Math.max(220, Math.min(500, targetPredictX + (Math.random() - 0.5) * 80));

      Sound.playShoot();
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

      // Keeper idle patrol
      if (!st.isKeeperDiving) {
        st.keeperX += st.keeperVx;
        if (st.keeperX < 310 || st.keeperX > 410) st.keeperVx *= -1;
      } else {
        // Diving animation
        st.keeperX += (st.keeperDiveX - st.keeperX) * 0.15;
      }

      // Ball kick trajectory
      if (st.isKicking) {
        st.ballX += st.ballVx + st.ballCurve;
        st.ballY += st.ballVy;
        st.ballZ += 0.035;

        // Ball reached goal line plane (y ~ 200)
        if (st.ballY <= 200) {
          st.isKicking = false;

          // Goal dimensions: left=190, right=530, top=120, bottom=280
          const inGoalX = st.ballX >= 190 && st.ballX <= 530;
          const inGoalY = st.ballY >= 120 && st.ballY <= 280;

          // Check keeper save
          const keeperSaved = Math.hypot(st.ballX - st.keeperX, st.ballY - st.keeperY) < 55;

          if (keeperSaved) {
            setFeedback('SAVED BY KEEPER! 🧤');
            Sound.playHit();
          } else if (inGoalX && inGoalY) {
            // Target checks
            let points = 50;
            for (const t of st.targets) {
              if (Math.hypot(st.ballX - t.x, st.ballY - t.y) < 40) {
                t.hit = true;
                points = t.points;
                break;
              }
            }
            st.currentScore += points;
            setScore(st.currentScore);
            onScoreUpdate?.(st.currentScore);
            setFeedback(`GOAL! +${points} PTS! ⚽🔥`);
            Sound.playWin();
            confetti({ particleCount: 40, spread: 50, origin: { x: st.ballX / 720, y: st.ballY / 540 } });
          } else {
            setFeedback('OFF TARGET! 💨');
            Sound.playLose();
          }

          // Advance round
          setTimeout(() => {
            if (st.currentRound >= st.maxRounds) {
              setGameState('GAMEOVER');
              if (st.currentScore > highScore) {
                setHighScore(st.currentScore);
                confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
              }
              onGameOver?.(st.currentScore);
            } else {
              st.currentRound++;
              setRound(st.currentRound);
              resetRound();
            }
          }, 1400);
        }
      }

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Stadium pitch
      const pitchGrad = ctx.createLinearGradient(0, 0, 0, h);
      pitchGrad.addColorStop(0, '#064e3b');
      pitchGrad.addColorStop(0.35, '#047857');
      pitchGrad.addColorStop(1, '#10b981');
      ctx.fillStyle = pitchGrad;
      ctx.fillRect(0, 0, w, h);

      // Stadium stands crowd in background
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, w, 110);
      for (let cx = 0; cx < w; cx += 14) {
        for (let cy = 10; cy < 100; cy += 12) {
          const colors = ['#f43f5e', '#3b82f6', '#fbbf24', '#ffffff', '#10b981'];
          ctx.fillStyle = colors[(cx + cy) % colors.length];
          ctx.fillRect(cx, cy, 6, 8);
        }
      }

      // Goal Posts & Crossbar
      const goalLeft = 190;
      const goalRight = 530;
      const crossbarY = 120;
      const groundLineY = 270;

      // Net mesh
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(goalLeft, crossbarY, goalRight - goalLeft, groundLineY - crossbarY);

      // White Goal Frame
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(goalLeft, groundLineY);
      ctx.lineTo(goalLeft, crossbarY);
      ctx.lineTo(goalRight, crossbarY);
      ctx.lineTo(goalRight, groundLineY);
      ctx.stroke();

      // Goal Line
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(120, groundLineY);
      ctx.lineTo(600, groundLineY);
      ctx.stroke();

      // Penalty Box Grass Lines
      ctx.beginPath();
      ctx.moveTo(150, groundLineY);
      ctx.lineTo(80, 540);
      ctx.moveTo(570, groundLineY);
      ctx.lineTo(640, 540);
      ctx.stroke();

      // Targets on goal
      for (const t of st.targets) {
        ctx.strokeStyle = t.hit ? '#4ade80' : '#f59e0b';
        ctx.fillStyle = t.hit ? 'rgba(74, 222, 128, 0.3)' : 'rgba(245, 158, 11, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.label, t.x, t.y + 4);
      }

      // Goalkeeper
      ctx.save();
      ctx.translate(st.keeperX, st.keeperY);

      // Goalkeeper jersey (Neon yellow)
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.roundRect(-16, -24, 32, 38, 6);
      ctx.fill();

      // Goalkeeper gloves
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-22, -10, 8, 0, Math.PI * 2);
      ctx.arc(22, -10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Keeper head
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(0, -34, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Football
      ctx.save();
      const ballScale = Math.max(0.5, 1 - st.ballZ * 0.6);
      ctx.translate(st.ballX, st.ballY);
      ctx.scale(ballScale, ballScale);

      // Ball shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 18, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soccer ball body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Black pentagons
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.arc(-9, -6, 4, 0, Math.PI * 2);
      ctx.arc(9, -6, 4, 0, Math.PI * 2);
      ctx.arc(0, 10, 4, 0, Math.PI * 2);
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
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 select-none overflow-hidden">
      {/* Top HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none text-white drop-shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-emerald-400 font-bold text-xs mr-2">SHOT</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">
              {round} / 5
            </span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">POINTS</span>
            <span className="font-mono text-base font-bold tabular-nums text-yellow-300">{score}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-emerald-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      {/* Shot feedback banner */}
      {feedback && (
        <div className="absolute top-16 z-20 px-6 py-2 rounded-2xl bg-slate-950/90 text-white font-extrabold text-lg shadow-2xl border border-white/20 animate-bounce">
          {feedback}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-emerald-500/20 cursor-pointer touch-none"
      />

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4 animate-bounce">
            <span className="text-3xl">⚽</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Football Challenge</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Swipe upward from the ball to kick! Curve your shot into the 100-point top corners and beat the diving keeper.
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Take Penalty Kicks
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">🏆</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Shootout Finished!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Penalty Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Shootout Record</span>
              <span className="font-bold text-emerald-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Play Another Shootout
          </button>
        </div>
      )}
    </div>
  );
};
