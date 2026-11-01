import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type Weapon = 'PISTOL' | 'SHOTGUN' | 'RIFLE' | 'ROCKET';

interface WeaponDef {
  name: string;
  damage: number;
  fireRate: number; // ms
  spread: number;
  bulletsPerShot: number;
  ammo: number; // -1 = infinite
  color: string;
}

const WEAPONS: Record<Weapon, WeaponDef> = {
  PISTOL: { name: 'Pistol', damage: 25, fireRate: 260, spread: 0.05, bulletsPerShot: 1, ammo: -1, color: '#facc15' },
  SHOTGUN: { name: 'Shotgun', damage: 20, fireRate: 650, spread: 0.35, bulletsPerShot: 5, ammo: 30, color: '#f97316' },
  RIFLE: { name: 'AK-47', damage: 32, fireRate: 110, spread: 0.1, bulletsPerShot: 1, ammo: 90, color: '#38bdf8' },
  ROCKET: { name: 'RPG', damage: 120, fireRate: 1200, spread: 0.02, bulletsPerShot: 1, ammo: 10, color: '#ef4444' },
};

export const ZombieSurvivalGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [hp, setHp] = useState(100);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>('PISTOL');
  const [ammo, setAmmo] = useState<Record<Weapon, number>>({
    PISTOL: -1,
    SHOTGUN: 30,
    RIFLE: 90,
    ROCKET: 10,
  });
  const [highScore, setHighScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['zombie-survival'] || 0;
    } catch {}
    return 0;
  });

  const stateRef = useRef({
    playerX: 360,
    playerY: 270,
    playerAngle: 0,
    playerHp: 100,
    waveNum: 1,
    score: 0,
    kills: 0,
    activeWeapon: 'PISTOL' as Weapon,
    weaponAmmo: { PISTOL: -1, SHOTGUN: 30, RIFLE: 90, ROCKET: 10 },
    keys: { w: false, a: false, s: false, d: false },
    isFiring: false,
    lastFireTime: 0,
    mousePos: { x: 360, y: 270 },
    bullets: [] as { x: number; y: number; vx: number; vy: number; damage: number; color: string; isRocket?: boolean }[],
    zombies: [] as {
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      speed: number;
      radius: number;
      isHulk?: boolean;
    }[],
    crates: [] as { x: number; y: number; type: 'medkit' | 'shotgun_ammo' | 'rifle_ammo' | 'rocket_ammo' }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number }[],
    animId: 0,
  });

  const spawnZombies = () => {
    const st = stateRef.current;
    const count = 8 + st.waveNum * 4;

    for (let i = 0; i < count; i++) {
      const isHulk = Math.random() < 0.15 && st.waveNum >= 2;
      const angle = Math.random() * Math.PI * 2;
      const dist = 420 + Math.random() * 200;
      st.zombies.push({
        x: 360 + Math.cos(angle) * dist,
        y: 270 + Math.sin(angle) * dist,
        hp: isHulk ? 120 : 40,
        maxHp: isHulk ? 120 : 40,
        speed: isHulk ? 1.1 : 1.7 + Math.random() * 0.7,
        radius: isHulk ? 22 : 14,
        isHulk,
      });
    }
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.playerX = 360;
    st.playerY = 270;
    st.playerHp = 100;
    st.waveNum = 1;
    st.score = 0;
    st.kills = 0;
    st.activeWeapon = 'PISTOL';
    st.weaponAmmo = { PISTOL: -1, SHOTGUN: 30, RIFLE: 90, ROCKET: 10 };
    st.bullets = [];
    st.zombies = [];
    st.crates = [];
    st.particles = [];

    spawnZombies();

    setHp(100);
    setWave(1);
    setScore(0);
    setCurrentWeapon('PISTOL');
    setAmmo({ ...st.weaponAmmo });
    setGameState('PLAYING');
  };

  const switchWeapon = (w: Weapon) => {
    stateRef.current.activeWeapon = w;
    setCurrentWeapon(w);
    Sound.playClick();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (gameState !== 'PLAYING') {
        if (e.code === 'Space' || e.code === 'Enter') startGame();
        return;
      }
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') st.keys.w = true;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') st.keys.a = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') st.keys.s = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') st.keys.d = true;

      if (e.key === '1') switchWeapon('PISTOL');
      if (e.key === '2') switchWeapon('SHOTGUN');
      if (e.key === '3') switchWeapon('RIFLE');
      if (e.key === '4') switchWeapon('ROCKET');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') st.keys.w = false;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') st.keys.a = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') st.keys.s = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') st.keys.d = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    stateRef.current.isFiring = true;
  };

  const handlePointerUp = () => {
    stateRef.current.isFiring = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    stateRef.current.mousePos = { x: mx, y: my };
    stateRef.current.playerAngle = Math.atan2(
      my - stateRef.current.playerY,
      mx - stateRef.current.playerX
    );
  };

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
      const moveSpeed = 3.8;
      if (st.keys.w) st.playerY -= moveSpeed;
      if (st.keys.s) st.playerY += moveSpeed;
      if (st.keys.a) st.playerX -= moveSpeed;
      if (st.keys.d) st.playerX += moveSpeed;
      st.playerX = Math.max(30, Math.min(690, st.playerX));
      st.playerY = Math.max(30, Math.min(510, st.playerY));

      // Player Firing
      const wDef = WEAPONS[st.activeWeapon];
      if (st.isFiring && timestamp - st.lastFireTime > wDef.fireRate) {
        const hasAmmo = wDef.ammo === -1 || st.weaponAmmo[st.activeWeapon] > 0;
        if (hasAmmo) {
          st.lastFireTime = timestamp;
          if (wDef.ammo !== -1) {
            st.weaponAmmo[st.activeWeapon]--;
            setAmmo({ ...st.weaponAmmo });
          }

          Sound.playShoot();

          for (let i = 0; i < wDef.bulletsPerShot; i++) {
            const spreadOffset = (Math.random() - 0.5) * wDef.spread;
            const shootAngle = st.playerAngle + spreadOffset;
            const bulletSpeed = st.activeWeapon === 'ROCKET' ? 10 : 15;
            st.bullets.push({
              x: st.playerX + Math.cos(st.playerAngle) * 20,
              y: st.playerY + Math.sin(st.playerAngle) * 20,
              vx: Math.cos(shootAngle) * bulletSpeed,
              vy: Math.sin(shootAngle) * bulletSpeed,
              damage: wDef.damage,
              color: wDef.color,
              isRocket: st.activeWeapon === 'ROCKET',
            });
          }
        } else {
          // Auto switch to pistol
          switchWeapon('PISTOL');
        }
      }

      // Update Bullets
      for (const b of st.bullets) {
        b.x += b.vx;
        b.y += b.vy;
      }
      st.bullets = st.bullets.filter((b) => b.x > 0 && b.x < 720 && b.y > 0 && b.y < 540);

      // Move Zombies towards player
      for (const z of st.zombies) {
        const dx = st.playerX - z.x;
        const dy = st.playerY - z.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          z.x += (dx / dist) * z.speed;
          z.y += (dy / dist) * z.speed;
        }

        // Zombie attack player
        if (dist < z.radius + 16) {
          st.playerHp -= z.isHulk ? 0.6 : 0.3;
          setHp(Math.max(0, Math.floor(st.playerHp)));

          if (st.playerHp <= 0) {
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

      // Bullet vs Zombie Collisions
      for (const b of st.bullets) {
        for (const z of st.zombies) {
          if (Math.hypot(b.x - z.x, b.y - z.y) < z.radius + 6) {
            z.hp -= b.damage;
            b.x = -999; // consumed
            Sound.playHit();

            // Blood splatters
            for (let i = 0; i < 5; i++) {
              st.particles.push({
                x: z.x,
                y: z.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: '#15803d', // zombie green blood
                life: 0.8,
              });
            }

            // Rocket blast area damage
            if (b.isRocket) {
              Sound.playExplosion();
              for (const nearby of st.zombies) {
                if (Math.hypot(nearby.x - z.x, nearby.y - z.y) < 90) {
                  nearby.hp -= 80;
                }
              }
            }

            if (z.hp <= 0) {
              st.score += z.isHulk ? 100 : 25;
              st.kills++;
              setScore(st.score);
              onScoreUpdate?.(st.score);

              // Chance to drop crates
              if (Math.random() < 0.25) {
                const crateTypes: ('medkit' | 'shotgun_ammo' | 'rifle_ammo' | 'rocket_ammo')[] = [
                  'medkit',
                  'shotgun_ammo',
                  'rifle_ammo',
                  'rocket_ammo',
                ];
                st.crates.push({
                  x: z.x,
                  y: z.y,
                  type: crateTypes[Math.floor(Math.random() * crateTypes.length)],
                });
              }
            }
          }
        }
      }

      st.zombies = st.zombies.filter((z) => z.hp > 0);

      // Crate pickups
      for (const crate of st.crates) {
        if (Math.hypot(crate.x - st.playerX, crate.y - st.playerY) < 32) {
          Sound.playCoin();
          if (crate.type === 'medkit') {
            st.playerHp = Math.min(100, st.playerHp + 35);
            setHp(Math.floor(st.playerHp));
          } else if (crate.type === 'shotgun_ammo') {
            st.weaponAmmo.SHOTGUN += 20;
          } else if (crate.type === 'rifle_ammo') {
            st.weaponAmmo.RIFLE += 60;
          } else if (crate.type === 'rocket_ammo') {
            st.weaponAmmo.ROCKET += 5;
          }
          setAmmo({ ...st.weaponAmmo });
          crate.x = -999;
        }
      }
      st.crates = st.crates.filter((c) => c.x > 0);

      // Wave advancement
      if (st.zombies.length === 0) {
        st.waveNum++;
        setWave(st.waveNum);
        Sound.playWin();
        confetti({ particleCount: 35, spread: 50 });
        spawnZombies();
      }

      // Update particles
      for (const p of st.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
      }
      st.particles = st.particles.filter((p) => p.life > 0);

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Abandoned metal bunker warehouse
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Concrete tile seams
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw Crates
      for (const c of st.crates) {
        ctx.fillStyle = c.type === 'medkit' ? '#ef4444' : '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(c.x - 12, c.y - 12, 24, 24, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.type === 'medkit' ? '+' : '📦', c.x, c.y + 4);
      }

      // Draw Particles
      for (const p of st.particles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Bullets
      for (const b of st.bullets) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.isRocket ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Zombies
      for (const z of st.zombies) {
        ctx.save();
        ctx.translate(z.x, z.y);

        // Zombie body
        ctx.fillStyle = z.isHulk ? '#166534' : '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
        ctx.fill();

        // Hungry eyes
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(4, -4, 3, 0, Math.PI * 2);
        ctx.arc(4, 4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-15, -z.radius - 8, 30, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-15, -z.radius - 8, 30 * (z.hp / z.maxHp), 4);

        ctx.restore();
      }

      // Flashlight cone & Player Soldier
      ctx.save();
      ctx.translate(st.playerX, st.playerY);
      ctx.rotate(st.playerAngle);

      // Flashlight glow cone
      const flashGrad = ctx.createRadialGradient(0, 0, 10, 120, 0, 240);
      flashGrad.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
      flashGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 240, -Math.PI / 6, Math.PI / 6);
      ctx.closePath();
      ctx.fill();

      // Commando body
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Gun barrel
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, -3, 18, 6);

      // Hands
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(12, -8, 4, 0, Math.PI * 2);
      ctx.arc(12, 8, 4, 0, Math.PI * 2);
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
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-red-400 font-bold text-xs">HEALTH</span>
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  hp > 30 ? 'bg-red-500' : 'bg-red-600 animate-pulse'
                }`}
                style={{ width: `${hp}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold">{hp}%</span>
          </div>

          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">WAVE</span>
            <span className="font-mono text-base font-bold text-white">{wave}</span>
          </div>

          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-amber-400 font-bold text-xs mr-2">SCORE</span>
            <span className="font-mono text-base font-bold tabular-nums text-yellow-300">{score}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-slate-300">
          BEST: <span className="text-red-400 font-bold tabular-nums">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-red-500/20 cursor-crosshair touch-none"
      />

      {/* Bottom Weapon Bar */}
      <div className="flex items-center gap-2 mt-2 bg-slate-900/90 p-2 rounded-2xl border border-white/10 shadow-xl">
        {(['PISTOL', 'SHOTGUN', 'RIFLE', 'ROCKET'] as Weapon[]).map((w, idx) => {
          const def = WEAPONS[w];
          const isSelected = currentWeapon === w;
          const bulletCount = ammo[w];
          return (
            <button
              key={w}
              onClick={() => switchWeapon(w)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="font-bold text-xs">{idx + 1}.</span>
              <div className="text-left">
                <div className="text-xs font-bold">{def.name}</div>
                <div className="text-[10px] text-amber-300 font-mono">
                  {bulletCount === -1 ? '∞' : `${bulletCount} rds`}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-700 to-zinc-900 flex items-center justify-center shadow-lg shadow-red-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🧟</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Zombie Survival: Outbreak</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            WASD to move, Mouse to aim & fire. Switch weapons with 1-4, survive relentless hordes, and collect dropped ammo crates!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-red-700 to-zinc-800 hover:from-red-800 hover:to-zinc-900 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-base"
          >
            Enter Bunker
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💀</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Overrun by Undead!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Waves Survived</span>
              <span className="font-bold text-red-400 font-mono">{wave - 1}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Best Survival Record</span>
              <span className="font-bold text-amber-400 font-mono">{highScore}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-red-700 to-zinc-800 hover:from-red-800 hover:to-zinc-900 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Survive Again
          </button>
        </div>
      )}
    </div>
  );
};
