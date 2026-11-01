import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const ArcheryChallengeGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [shotNum, setShotNum] = useState(1);
  const [wind, setWind] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['archery-challenge'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    bowX: 140,
    bowY: 360,
    isDrawing: false,
    drawStartX: 0,
    drawStartY: 0,
    drawCurrentX: 0,
    drawCurrentY: 0,
    arrow: null as {
      x: number;
      y: number;
      vx: number;
      vy: number;
      angle: number;
      stuck: boolean;
    } | null,
    targetX: 580,
    targetY: 260,
    windSpeed: 0, // pixels per frame drift
    score: 0,
    shotsTaken: 0,
    maxShots: 6,
    animId: 0,
  });

  const nextRound = () => {
    const st = stateRef.current;
    st.arrow = null;
    st.windSpeed = (Math.random() - 0.5) * 0.45;
    setWind(parseFloat((st.windSpeed * 10).toFixed(1)));
    setFeedback(null);
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.score = 0;
    st.shotsTaken = 0;
    st.isDrawing = false;
    nextRound();
    setScore(0);
    setShotNum(1);
    setGameState('PLAYING');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const st = stateRef.current;
    if (st.arrow && !st.arrow.stuck) return; // currently flying

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    st.isDrawing = true;
    st.drawStartX = st.bowX;
    st.drawStartY = st.bowY;
    st.drawCurrentX = x;
    st.drawCurrentY = y;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (!st.isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    st.drawCurrentX = (e.clientX - rect.left) * scaleX;
    st.drawCurrentY = (e.clientY - rect.top) * scaleY;
  };

  const handlePointerUp = () => {
    const st = stateRef.current;
    if (!st.isDrawing) return;
    st.isDrawing = false;

    // Pullback vector
    const dx = st.drawStartX - st.drawCurrentX;
    const dy = st.drawStartY - st.drawCurrentY;
    const pullDist = Math.hypot(dx, dy);

    if (pullDist > 20) {
      const speed = Math.min(22, pullDist * 0.22);
      const angle = Math.atan2(dy, dx);

      st.arrow = {
        x: st.bowX,
        y: st.bowY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        stuck: false,
      };

      Sound.playShoot();
      st.shotsTaken++;
      setShotNum(st.shotsTaken);
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

      // Arrow in flight
      if (st.arrow && !st.arrow.stuck) {
        const a = st.arrow;
        a.x += a.vx;
        a.y += a.vy;
        a.vy += 0.35; // gravity
        a.vx += st.windSpeed; // wind drift
        a.angle = Math.atan2(a.vy, a.vx);

        // Check Target Hit (Target plane around targetX = 580)
        if (a.x >= st.targetX - 25 && a.x <= st.targetX + 25 && a.y >= st.targetY - 100 && a.y <= st.targetY + 100) {
          a.stuck = true;
          const distFromCenter = Math.abs(a.y - st.targetY);

          let points = 0;
          if (distFromCenter < 12) {
            points = 10;
            setFeedback('🎯 BULLSEYE 10 PTS!');
            Sound.playWin();
            confetti({ particleCount: 50, spread: 50, origin: { x: st.targetX / 720, y: st.targetY / 540 } });
          } else if (distFromCenter < 30) {
            points = 8;
            setFeedback('Great Shot! 8 PTS');
            Sound.playCoin();
          } else if (distFromCenter < 55) {
            points = 6;
            setFeedback('Hit 6 PTS');
            Sound.playHit();
          } else {
            points = 4;
            setFeedback('Outer Ring 4 PTS');
            Sound.playScore();
          }

          st.score += points;
          setScore(st.score);
          onScoreUpdate?.(st.score);

          setTimeout(() => {
            if (st.shotsTaken >= st.maxShots) {
              setGameState('GAMEOVER');
              if (st.score > highScore) {
                setHighScore(st.score);
                confetti({ particleCount: 70, spread: 60 });
              }
              onGameOver?.(st.score);
            } else {
              nextRound();
            }
          }, 1400);
        }

        // Missed offscreen
        if (a.x > 750 || a.y > 540) {
          a.stuck = true;
          setFeedback('MISSED TARGET!');
          Sound.playLose();

          setTimeout(() => {
            if (st.shotsTaken >= st.maxShots) {
              setGameState('GAMEOVER');
              onGameOver?.(st.score);
            } else {
              nextRound();
            }
          }, 1400);
        }
      }

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Outdoor mountain archery range
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.6, '#93c5fd');
      skyGrad.addColorStop(1, '#dcfce7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Lush green grass field
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 420, w, 120);

      // Distant archery target buttress
      const tx = st.targetX;
      const ty = st.targetY;

      // Wooden target stand legs
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(tx - 30, ty + 120);
      ctx.lineTo(tx, ty);
      ctx.lineTo(tx + 30, ty + 120);
      ctx.stroke();

      // Target concentric rings
      const rings = [
        { r: 70, color: '#f8fafc' }, // white
        { r: 52, color: '#1e293b' }, // black
        { r: 35, color: '#38bdf8' }, // blue
        { r: 20, color: '#ef4444' }, // red
        { r: 10, color: '#facc15' }, // yellow 10
      ];

      for (const ring of rings) {
        ctx.fillStyle = ring.color;
        ctx.beginPath();
        ctx.ellipse(tx, ty, ring.r * 0.45, ring.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Bow & Arrow at shooter station
      const bx = st.bowX;
      const by = st.bowY;

      // Archer bow arc
      ctx.save();
      ctx.translate(bx, by);

      let bowAngle = 0;
      if (st.isDrawing) {
        const dx = st.drawStartX - st.drawCurrentX;
        const dy = st.drawStartY - st.drawCurrentY;
        bowAngle = Math.atan2(dy, dx);
      }
      ctx.rotate(bowAngle);

      // Wooden bow curved limb
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 40, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.stroke();

      // Bow string
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      const stringPull = st.isDrawing ? -Math.min(30, Math.hypot(st.drawStartX - st.drawCurrentX, st.drawStartY - st.drawCurrentY) * 0.3) : 0;
      ctx.beginPath();
      ctx.moveTo(25, -34);
      ctx.lineTo(stringPull, 0);
      ctx.lineTo(25, 34);
      ctx.stroke();

      // Arrow resting on bow
      if (!st.arrow || st.arrow.stuck) {
        ctx.strokeStyle = '#713f12';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(stringPull, 0);
        ctx.lineTo(stringPull + 60, 0);
        ctx.stroke();

        // Arrow metal arrowhead
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(stringPull + 60, -4);
        ctx.lineTo(stringPull + 72, 0);
        ctx.lineTo(stringPull + 60, 4);
        ctx.fill();
      }

      ctx.restore();

      // Flying or Stuck Arrow
      if (st.arrow) {
        const a = st.arrow;
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);

        ctx.strokeStyle = '#713f12';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();

        // Feathers fletching
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-25, -5, 8, 10);

        // Arrowhead
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(25, -4);
        ctx.lineTo(34, 0);
        ctx.lineTo(25, 4);
        ctx.fill();

        ctx.restore();
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
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-amber-400 font-bold text-xs mr-2">ARROW</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">
              {shotNum} / 6
            </span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-cyan-400 font-bold text-xs mr-2">WIND</span>
            <span className="font-mono text-base font-bold tabular-nums text-cyan-300">
              {wind > 0 ? `→ ${wind} kt` : wind < 0 ? `← ${Math.abs(wind)} kt` : 'CALM'}
            </span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">SCORE</span>
            <span className="font-mono text-base font-bold tabular-nums text-yellow-300">{score}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          RECORD: <span className="text-amber-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      {feedback && (
        <div className="absolute top-16 z-20 px-6 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl shadow-2xl animate-bounce">
          {feedback}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-amber-500/20 cursor-crosshair touch-none"
      />

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🏹</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Archery Master 3D</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Drag backwards to draw the bowstring, account for gravity drop and wind speed, then release to shoot the bullseye!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-base"
          >
            Draw Bow
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Archery Tourney Complete!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Score</span>
              <span className="font-bold text-white font-mono">{score} / 60</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Tourney Score</span>
              <span className="font-bold text-amber-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Shoot Another Round
          </button>
        </div>
      )}
    </div>
  );
};
