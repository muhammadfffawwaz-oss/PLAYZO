import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const SpaceShooterGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [shield, setShield] = useState(100);
  const [wave, setWave] = useState(1);
  const [bombs, setBombs] = useState(2);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['space-shooter'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    shipX: 360,
    shipY: 460,
    shipVx: 0,
    shipVy: 0,
    shieldHp: 100,
    bombsCount: 2,
    waveNum: 1,
    score: 0,
    keys: { left: false, right: false, up: false, down: false, fire: false },
    lasers: [] as { x: number; y: number; vy: number }[],
    enemies: [] as {
      x: number;
      y: number;
      vx: number;
      vy: number;
      hp: number;
      maxHp: number;
      type: 'scout' | 'cruiser' | 'boss';
      width: number;
      height: number;
    }[],
    enemyLasers: [] as { x: number; y: number; vy: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    stars: [] as { x: number; y: number; speed: number; size: number }[],
    lastFire: 0,
    animId: 0,
  });

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.shipX = 360;
    st.shipY = 460;
    st.shieldHp = 100;
    st.bombsCount = 2;
    st.waveNum = 1;
    st.score = 0;
    st.lasers = [];
    st.enemies = [];
    st.enemyLasers = [];
    st.particles = [];

    // Create background starfield
    st.stars = [];
    for (let i = 0; i < 70; i++) {
      st.stars.push({
        x: Math.random() * 720,
        y: Math.random() * 540,
        speed: 1 + Math.random() * 3,
        size: 1 + Math.random() * 2,
      });
    }

    setScore(0);
    setShield(100);
    setWave(1);
    setBombs(2);
    setGameState('PLAYING');
  };

  const deployBomb = () => {
    const st = stateRef.current;
    if (st.bombsCount <= 0 || gameState !== 'PLAYING') return;
    st.bombsCount--;
    setBombs(st.bombsCount);

    // Destroy all standard enemies and clear enemy lasers
    Sound.playExplosion();
    st.enemyLasers = [];
    for (const enemy of st.enemies) {
      st.score += enemy.hp * 15;
      for (let p = 0; p < 12; p++) {
        st.particles.push({
          x: enemy.x,
          y: enemy.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1,
          color: '#38bdf8',
        });
      }
    }
    st.enemies = [];
    setScore(st.score);
    onScoreUpdate?.(st.score);
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
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') st.keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') st.keys.down = true;
      if (e.code === 'Space') st.keys.fire = true;
      if (e.key === 'b' || e.key === 'B') deployBomb();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') st.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') st.keys.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') st.keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') st.keys.down = false;
      if (e.code === 'Space') st.keys.fire = false;
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

    const loop = (timestamp: number) => {
      if (!isRunning) return;
      const st = stateRef.current;

      // Player Movement
      const speed = 6;
      if (st.keys.left) st.shipX -= speed;
      if (st.keys.right) st.shipX += speed;
      if (st.keys.up) st.shipY -= speed;
      if (st.keys.down) st.shipY += speed;
      st.shipX = Math.max(30, Math.min(690, st.shipX));
      st.shipY = Math.max(200, Math.min(500, st.shipY));

      // Player auto/space fire (rate limited)
      if ((st.keys.fire || true) && timestamp - st.lastFire > 175) {
        st.lastFire = timestamp;
        st.lasers.push({ x: st.shipX - 14, y: st.shipY - 15, vy: -12 });
        st.lasers.push({ x: st.shipX + 14, y: st.shipY - 15, vy: -12 });
        Sound.playShoot();
      }

      // Update lasers
      for (const l of st.lasers) l.y += l.vy;
      st.lasers = st.lasers.filter((l) => l.y > -20);

      // Starfield scroll
      for (const star of st.stars) {
        star.y += star.speed;
        if (star.y > 540) {
          star.y = 0;
          star.x = Math.random() * 720;
        }
      }

      // Spawn Enemies if wave empty
      if (st.enemies.length === 0) {
        const isBossWave = st.waveNum % 5 === 0;
        if (isBossWave) {
          // Boss Spawn
          st.enemies.push({
            x: 360,
            y: 80,
            vx: 3,
            vy: 0,
            hp: 60,
            maxHp: 60,
            type: 'boss',
            width: 140,
            height: 90,
          });
        } else {
          // Regular swarm
          const count = 4 + st.waveNum * 2;
          for (let i = 0; i < count; i++) {
            const isCruiser = Math.random() < 0.3;
            st.enemies.push({
              x: 60 + (i % 6) * 110,
              y: 50 + Math.floor(i / 6) * 70,
              vx: (Math.random() - 0.5) * 3,
              vy: 0.6 + Math.random() * 0.8,
              hp: isCruiser ? 4 : 2,
              maxHp: isCruiser ? 4 : 2,
              type: isCruiser ? 'cruiser' : 'scout',
              width: isCruiser ? 50 : 36,
              height: isCruiser ? 45 : 32,
            });
          }
        }
        st.waveNum++;
        setWave(st.waveNum);
      }

      // Move Enemies & fire
      for (const enemy of st.enemies) {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Bounce walls
        if (enemy.x < 40 || enemy.x > 680) enemy.vx *= -1;
        if (enemy.y > 380 && enemy.type !== 'boss') enemy.vy *= -1;
        if (enemy.y < 40 && enemy.type !== 'boss') enemy.vy *= -1;

        // Enemy firing
        if (Math.random() < (enemy.type === 'boss' ? 0.08 : 0.015)) {
          st.enemyLasers.push({ x: enemy.x, y: enemy.y + 20, vy: 5 });
        }
      }

      // Update enemy lasers
      for (const el of st.enemyLasers) el.y += el.vy;
      st.enemyLasers = st.enemyLasers.filter((el) => el.y < 560);

      // Check Laser vs Enemy collisions
      for (const laser of st.lasers) {
        for (const enemy of st.enemies) {
          if (
            Math.abs(laser.x - enemy.x) < enemy.width / 2 &&
            Math.abs(laser.y - enemy.y) < enemy.height / 2
          ) {
            enemy.hp--;
            laser.y = -999; // mark consumed
            Sound.playHit();

            // Hit particles
            for (let i = 0; i < 4; i++) {
              st.particles.push({
                x: laser.x,
                y: laser.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 0.6,
                color: '#38bdf8',
              });
            }

            if (enemy.hp <= 0) {
              st.score += enemy.type === 'boss' ? 500 : 50;
              setScore(st.score);
              onScoreUpdate?.(st.score);
              Sound.playExplosion();

              // Explosion particles
              for (let i = 0; i < 16; i++) {
                st.particles.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: (Math.random() - 0.5) * 7,
                  vy: (Math.random() - 0.5) * 7,
                  life: 1,
                  color: enemy.type === 'boss' ? '#a855f7' : '#f59e0b',
                });
              }
            }
          }
        }
      }
      st.enemies = st.enemies.filter((e) => e.hp > 0);

      // Check Enemy Laser vs Player Ship
      for (const el of st.enemyLasers) {
        if (Math.hypot(el.x - st.shipX, el.y - st.shipY) < 28) {
          el.y = 999;
          st.shieldHp = Math.max(0, st.shieldHp - 15);
          setShield(st.shieldHp);
          Sound.playHit();

          if (st.shieldHp <= 0) {
            Sound.playExplosion();
            setGameState('GAMEOVER');
            if (st.score > highScore) {
              setHighScore(st.score);
              confetti({ particleCount: 70, spread: 60 });
            }
            onGameOver?.(st.score);
            isRunning = false;
            return;
          }
        }
      }

      // Update explosion particles
      for (const p of st.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
      }
      st.particles = st.particles.filter((p) => p.life > 0);

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Deep space void
      ctx.fillStyle = '#050714';
      ctx.fillRect(0, 0, w, h);

      // Draw stars
      ctx.fillStyle = '#ffffff';
      for (const star of st.stars) {
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      // Draw Lasers
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      for (const l of st.lasers) {
        ctx.fillRect(l.x - 2, l.y, 4, 16);
      }
      ctx.shadowBlur = 0;

      // Draw Enemy Lasers
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 8;
      for (const el of st.enemyLasers) {
        ctx.fillRect(el.x - 2, el.y, 4, 14);
      }
      ctx.shadowBlur = 0;

      // Draw Enemies
      for (const enemy of st.enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        if (enemy.type === 'boss') {
          // Boss Mothership
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath();
          ctx.roundRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height, 16);
          ctx.fill();

          // Boss Core
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();

          // Health bar
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-50, -enemy.height / 2 - 12, 100 * (enemy.hp / enemy.maxHp), 6);
        } else if (enemy.type === 'cruiser') {
          // Heavy Cruiser
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(0, 20);
          ctx.lineTo(-24, -20);
          ctx.lineTo(24, -20);
          ctx.closePath();
          ctx.fill();
        } else {
          // Scout Fighter
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.moveTo(0, 16);
          ctx.lineTo(-18, -14);
          ctx.lineTo(18, -14);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      // Draw Particles
      for (const p of st.particles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, 3 * p.life), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player Spaceship
      ctx.save();
      ctx.translate(st.shipX, st.shipY);

      // Jet exhaust fire
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-10, 18);
      ctx.lineTo(0, 32 + Math.random() * 8);
      ctx.lineTo(10, 18);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ship body (Sleek delta wing)
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(-24, 18);
      ctx.lineTo(0, 10);
      ctx.lineTo(24, 18);
      ctx.closePath();
      ctx.fill();

      // Cockpit glass
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, -6, 5, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Energy Shield Bubble if damaged recently
      if (st.shieldHp < 100) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${st.shieldHp / 100})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0, Math.PI * 2);
        ctx.stroke();
      }

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
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-cyan-400 font-bold text-xs">SHIELD</span>
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  shield > 40 ? 'bg-cyan-400' : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${shield}%` }}
              />
            </div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">WAVE</span>
            <span className="font-mono text-base font-bold text-white">{wave}</span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-amber-400 font-bold text-xs mr-2">BOMBS (B)</span>
            <span className="font-mono text-base font-bold text-yellow-300">💣 {bombs}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-cyan-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const scaleX = 720 / rect.width;
          const scaleY = 540 / rect.height;
          stateRef.current.shipX = (e.clientX - rect.left) * scaleX;
          stateRef.current.shipY = (e.clientY - rect.top) * scaleY;
        }}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-blue-500/20 cursor-none touch-none"
      />

      {/* Touch mobile bombs & controls */}
      <div className="absolute bottom-4 right-6 flex gap-2 z-10 md:hidden">
        <button
          onClick={deployBomb}
          className="p-3 bg-red-600 text-white font-bold rounded-2xl shadow-xl active:scale-95"
        >
          💣 SMART BOMB ({bombs})
        </button>
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Space Shooter: Galaxy War</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Move mouse or arrows to pilot your starship. Destroy alien fleets and motherships, deploy smart bombs with 'B'!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Launch Starfighter
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Hull Destroyed!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Wave Reached</span>
              <span className="font-bold text-cyan-400 font-mono">Wave {wave}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Score</span>
              <span className="font-bold text-purple-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Launch Again
          </button>
        </div>
      )}
    </div>
  );
};
