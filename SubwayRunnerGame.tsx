import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const SubwayRunnerGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['subway-runner'] || 0;
    } catch {}
    return 0;
  });

  // Game internals via ref so requestAnimationFrame always reads current
  const stateRef = useRef({
    lane: 1, // 0 = left, 1 = center, 2 = right
    targetLaneX: 0,
    playerX: 0,
    playerY: 0,
    isJumping: false,
    jumpVelocity: 0,
    isSliding: false,
    slideTimer: 0,
    speed: 6,
    distance: 0,
    coinsCollected: 0,
    hasMagnet: false,
    magnetTimer: 0,
    obstacles: [] as {
      lane: number;
      z: number; // 0 (near player) to 1000 (horizon)
      type: 'barrier' | 'train' | 'overhead';
    }[],
    coins: [] as {
      lane: number;
      z: number;
      collected: boolean;
    }[],
    lastObstacleZ: 1000,
    nextCoinZ: 600,
    animId: 0,
    lastTime: 0,
  });

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.lane = 1;
    st.speed = 6.5;
    st.distance = 0;
    st.coinsCollected = 0;
    st.isJumping = false;
    st.isSliding = false;
    st.hasMagnet = false;
    st.magnetTimer = 0;
    st.obstacles = [
      { lane: 0, z: 500, type: 'barrier' },
      { lane: 2, z: 800, type: 'train' },
    ];
    st.coins = [
      { lane: 1, z: 400, collected: false },
      { lane: 1, z: 450, collected: false },
      { lane: 1, z: 500, collected: false },
      { lane: 0, z: 700, collected: false },
      { lane: 0, z: 750, collected: false },
    ];
    st.lastObstacleZ = 800;
    st.nextCoinZ = 750;

    setScore(0);
    setCoins(0);
    setGameState('PLAYING');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') {
        if (e.code === 'Space' || e.code === 'Enter') {
          startGame();
        }
        return;
      }

      const st = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (st.lane > 0) {
          st.lane--;
          Sound.playJump();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (st.lane < 2) {
          st.lane++;
          Sound.playJump();
        }
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'Space') {
        e.preventDefault();
        if (!st.isJumping && !st.isSliding) {
          st.isJumping = true;
          st.jumpVelocity = 14;
          Sound.playJump();
        }
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (!st.isSliding) {
          st.isSliding = true;
          st.slideTimer = 26; // frames
          if (st.isJumping) {
            // fast drop
            st.isJumping = false;
            st.playerY = 0;
          }
          Sound.playScore();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Main game loop
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

      // Update distance & speed
      st.distance += st.speed;
      st.speed = Math.min(15, 6.5 + st.distance / 2000);
      const currentScore = Math.floor(st.distance / 10 + st.coinsCollected * 15);
      setScore(currentScore);
      onScoreUpdate?.(currentScore);

      // Lane smoothing
      const lanePositions = [-140, 0, 140];
      const targetX = lanePositions[st.lane];
      st.playerX += (targetX - st.playerX) * 0.25;

      // Jump physics
      if (st.isJumping) {
        st.playerY += st.jumpVelocity;
        st.jumpVelocity -= 0.85; // gravity
        if (st.playerY <= 0) {
          st.playerY = 0;
          st.isJumping = false;
        }
      }

      // Slide timer
      if (st.isSliding) {
        st.slideTimer--;
        if (st.slideTimer <= 0) {
          st.isSliding = false;
        }
      }

      // Magnet timer
      if (st.hasMagnet) {
        st.magnetTimer--;
        if (st.magnetTimer <= 0) st.hasMagnet = false;
      }

      // Spawn obstacles
      if (st.lastObstacleZ < 1000) {
        const gap = 300 + Math.random() * 250;
        const newZ = st.lastObstacleZ + gap;
        const randLane = Math.floor(Math.random() * 3);
        const types: ('barrier' | 'train' | 'overhead')[] = ['barrier', 'train', 'overhead'];
        const type = types[Math.floor(Math.random() * types.length)];
        st.obstacles.push({ lane: randLane, z: newZ, type });
        st.lastObstacleZ = newZ;
      }

      // Spawn coins
      if (st.nextCoinZ < 1000) {
        const coinLane = Math.floor(Math.random() * 3);
        const coinCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < coinCount; i++) {
          st.coins.push({ lane: coinLane, z: st.nextCoinZ + i * 40, collected: false });
        }
        st.nextCoinZ += coinCount * 40 + 200 + Math.random() * 200;
      }

      // Move obstacles towards player
      for (const obs of st.obstacles) {
        obs.z -= st.speed;
      }
      st.obstacles = st.obstacles.filter((o) => o.z > -100);
      st.lastObstacleZ -= st.speed;

      // Move coins towards player
      for (const coin of st.coins) {
        coin.z -= st.speed;
        // Magnet attraction
        if (st.hasMagnet && !coin.collected && coin.z > 0 && coin.z < 350) {
          const coinLanePos = lanePositions[coin.lane];
          if (coinLanePos < st.playerX) coin.lane = Math.min(2, coin.lane + 0.1);
          if (coinLanePos > st.playerX) coin.lane = Math.max(0, coin.lane - 0.1);
        }

        // Collect detection
        if (!coin.collected && coin.z > -20 && coin.z < 60) {
          const coinX = lanePositions[Math.round(coin.lane)];
          if (Math.abs(st.playerX - coinX) < 50 && (!st.isJumping || st.playerY < 60)) {
            coin.collected = true;
            st.coinsCollected++;
            setCoins(st.coinsCollected);
            Sound.playCoin();
          }
        }
      }
      st.coins = st.coins.filter((c) => c.z > -50 && !c.collected);
      st.nextCoinZ -= st.speed;

      // Collision detection with obstacles
      for (const obs of st.obstacles) {
        if (obs.z > 0 && obs.z < 60) {
          const obsX = lanePositions[obs.lane];
          if (Math.abs(st.playerX - obsX) < 45) {
            let hit = false;
            if (obs.type === 'barrier') {
              if (st.playerY < 40) hit = true; // jumped over?
            } else if (obs.type === 'overhead') {
              if (!st.isSliding) hit = true; // slid under?
            } else if (obs.type === 'train') {
              hit = true; // trains cannot be jumped over!
            }

            if (hit) {
              Sound.playExplosion();
              setGameState('GAMEOVER');
              if (currentScore > highScore) {
                setHighScore(currentScore);
                confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
              }
              onGameOver?.(currentScore);
              isRunning = false;
              return;
            }
          }
        }
      }

      // RENDERING
      const w = canvas.width;
      const h = canvas.height;
      const horizonY = h * 0.38;
      const vanishingX = w / 2;

      // Sky gradient with sunset vibe
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#1e1b4b'); // deep purple
      skyGrad.addColorStop(0.5, '#4338ca'); // indigo
      skyGrad.addColorStop(1, '#db2777'); // pink sunset
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY);

      // Distant city skyline
      ctx.fillStyle = '#0f172a';
      const buildingWidths = [45, 60, 35, 70, 50, 40, 65, 55, 80, 45, 60, 40, 70];
      let bx = 0;
      for (let i = 0; i < buildingWidths.length; i++) {
        const bw = buildingWidths[i];
        const bh = 40 + ((i * 37) % 60);
        ctx.fillRect(bx, horizonY - bh, bw, bh);
        // glowing window specks
        ctx.fillStyle = '#fbbf24';
        for (let wy = horizonY - bh + 6; wy < horizonY - 10; wy += 12) {
          if ((i + wy) % 3 === 0) {
            ctx.fillRect(bx + 8, wy, 4, 6);
            ctx.fillRect(bx + bw - 14, wy, 4, 6);
          }
        }
        ctx.fillStyle = '#0f172a';
        bx += bw + 6;
      }

      // Ground (subway gravel & tracks)
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      groundGrad.addColorStop(0, '#1e293b');
      groundGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Project 3D (x, z) to 2D screen
      const project = (x3d: number, z3d: number) => {
        const factor = 200 / (z3d + 200);
        const screenX = vanishingX + x3d * factor;
        const screenY = horizonY + (h - horizonY) * factor;
        return { x: screenX, y: screenY, factor };
      };

      // Draw Rails and wooden ties
      const numTies = 24;
      const offsetZ = (st.distance % 50);
      for (let i = 0; i < numTies; i++) {
        const tz = i * 40 - offsetZ;
        if (tz > 0 && tz < 900) {
          const pLeft = project(-220, tz);
          const pRight = project(220, tz);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = Math.max(1, 4 * pLeft.factor);
          ctx.beginPath();
          ctx.moveTo(pLeft.x, pLeft.y);
          ctx.lineTo(pRight.x, pRight.y);
          ctx.stroke();
        }
      }

      // Draw 4 Track rails (dividing 3 lanes)
      const railXs = [-210, -70, 70, 210];
      for (const rx of railXs) {
        const pFar = project(rx, 800);
        const pNear = project(rx, 0);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pFar.x, pFar.y);
        ctx.lineTo(pNear.x, pNear.y);
        ctx.stroke();
      }

      // Render Coins
      for (const coin of st.coins) {
        if (coin.z < 0 || coin.z > 800) continue;
        const p = project(lanePositions[Math.round(coin.lane)], coin.z);
        const radius = Math.max(3, 16 * p.factor);
        ctx.save();
        ctx.translate(p.x, p.y - 30 * p.factor);
        // Spinning coin effect
        const wobble = Math.sin(Date.now() / 120 + coin.z) * radius;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(2, Math.abs(wobble)), radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * p.factor;
        ctx.stroke();
        // Inner star shine
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, Math.abs(wobble) * 0.4), radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Sort obstacles by z descending so further ones draw first
      const sortedObstacles = [...st.obstacles].sort((a, b) => b.z - a.z);

      for (const obs of sortedObstacles) {
        if (obs.z < 0 || obs.z > 800) continue;
        const obsLaneX = lanePositions[obs.lane];
        const p = project(obsLaneX, obs.z);
        const scale = p.factor;

        if (obs.type === 'barrier') {
          // Low road barrier
          const bw = 90 * scale;
          const bh = 50 * scale;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(p.x - bw / 2, p.y - bh, bw, bh);
          // Striped warning
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(p.x - bw / 2 + 10 * scale, p.y - bh + 10 * scale, bw - 20 * scale, 12 * scale);
        } else if (obs.type === 'overhead') {
          // Elevated barrier to slide under
          const bw = 110 * scale;
          const bh = 30 * scale;
          const poleH = 90 * scale;
          // Side poles
          ctx.fillStyle = '#64748b';
          ctx.fillRect(p.x - bw / 2, p.y - poleH, 8 * scale, poleH);
          ctx.fillRect(p.x + bw / 2 - 8 * scale, p.y - poleH, 8 * scale, poleH);
          // Overhead crossbeam
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(p.x - bw / 2, p.y - poleH, bw, bh);
          ctx.fillStyle = '#1e293b';
          ctx.font = `bold ${Math.max(8, 12 * scale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('SLIDE', p.x, p.y - poleH + 20 * scale);
        } else if (obs.type === 'train') {
          // Approaching subway train front
          const tw = 110 * scale;
          const th = 130 * scale;
          // Train body
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.roundRect(p.x - tw / 2, p.y - th, tw, th, 12 * scale);
          ctx.fill();
          // Windshield
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(p.x - tw / 2 + 10 * scale, p.y - th + 15 * scale, tw - 20 * scale, 45 * scale);
          // Headlights
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(p.x - tw * 0.3, p.y - 25 * scale, 10 * scale, 0, Math.PI * 2);
          ctx.arc(p.x + tw * 0.3, p.y - 25 * scale, 10 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render Player Character
      const pBase = project(st.playerX, 0);
      const playerScale = pBase.factor;
      const py = pBase.y - st.playerY;

      ctx.save();
      ctx.translate(pBase.x, py);

      // Player shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, st.playerY, 28 * playerScale, 10 * playerScale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (st.isSliding) {
        // Sliding posture (low horizontal)
        ctx.fillStyle = '#8b5cf6'; // purple hoodie
        ctx.beginPath();
        ctx.roundRect(-30, -32, 60, 24, 8);
        ctx.fill();
        // Head
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(26, -20, 12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Running / Jumping posture
        const legSwing = Math.sin(Date.now() / 90) * 12;
        // Legs & shoes
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(-12, -25, 8, 25 + (st.isJumping ? -8 : legSwing));
        ctx.fillRect(4, -25, 8, 25 + (st.isJumping ? -8 : -legSwing));
        // Cool sneakers
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(-14, (st.isJumping ? -12 : legSwing), 12, 6);
        ctx.fillRect(2, (st.isJumping ? -12 : -legSwing), 12, 6);

        // Body / Jacket
        ctx.fillStyle = '#6366f1'; // indigo hoodie
        ctx.beginPath();
        ctx.roundRect(-16, -60, 32, 38, 8);
        ctx.fill();

        // Backpack
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-12, -54, 24, 20);

        // Head & hair
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(0, -74, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03'; // brown cool hair
        ctx.beginPath();
        ctx.arc(0, -78, 14, Math.PI, Math.PI * 2);
        ctx.fill();
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-amber-400 font-bold text-sm">COINS</span>
            <span className="font-mono text-base font-bold tabular-nums text-yellow-300">{coins}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-sm">SCORE</span>
            <span className="font-mono text-base font-bold tabular-nums text-white">{score}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-amber-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-purple-500/20"
      />

      {/* Touch / Screen Mobile Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4 z-10 md:hidden">
        <button
          onClick={() => {
            const st = stateRef.current;
            if (st.lane > 0) {
              st.lane--;
              Sound.playJump();
            }
          }}
          className="p-4 bg-slate-800/80 backdrop-blur text-white rounded-2xl border border-white/10 active:scale-95"
        >
          ← Left
        </button>
        <button
          onClick={() => {
            const st = stateRef.current;
            if (!st.isJumping && !st.isSliding) {
              st.isJumping = true;
              st.jumpVelocity = 14;
              Sound.playJump();
            }
          }}
          className="p-4 bg-purple-600 text-white rounded-2xl active:scale-95 font-bold"
        >
          Jump ↑
        </button>
        <button
          onClick={() => {
            const st = stateRef.current;
            if (!st.isSliding) {
              st.isSliding = true;
              st.slideTimer = 26;
              Sound.playScore();
            }
          }}
          className="p-4 bg-amber-600 text-white rounded-2xl active:scale-95 font-bold"
        >
          Slide ↓
        </button>
        <button
          onClick={() => {
            const st = stateRef.current;
            if (st.lane < 2) {
              st.lane++;
              Sound.playJump();
            }
          }}
          className="p-4 bg-slate-800/80 backdrop-blur text-white rounded-2xl border border-white/10 active:scale-95"
        >
          Right →
        </button>
      </div>

      {/* Overlays */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🏃‍♂️</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Subway Runner</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Switch between 3 lanes, leap over red barriers, slide under overhead gantries, and grab shiny coins!
          </p>
          <div className="flex gap-4 mb-6 text-xs text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-white/10">
            <span>← / → or A/D: Lane</span>
            <span>·</span>
            <span>↑ / Space: Jump</span>
            <span>·</span>
            <span>↓ / S: Slide</span>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all transform hover:scale-105 active:scale-95 text-base"
          >
            Start Running
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Crashed!</h2>
          <p className="text-slate-400 text-sm mb-5">Mind the oncoming subway train!</p>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Final Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Coins Collected</span>
              <span className="font-bold text-amber-400 font-mono">{coins}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">All-Time Best</span>
              <span className="font-bold text-purple-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all transform hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
