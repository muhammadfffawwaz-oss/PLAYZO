import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type TowerType = 'archer' | 'cannon' | 'frost' | 'laser';

interface TowerDef {
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // ms
  color: string;
  icon: string;
}

const TOWERS: Record<TowerType, TowerDef> = {
  archer: { name: 'Gatling', cost: 100, range: 110, damage: 15, fireRate: 350, color: '#38bdf8', icon: '🏹' },
  cannon: { name: 'Cannon', cost: 150, range: 130, damage: 45, fireRate: 1100, color: '#ea580c', icon: '💣' },
  frost: { name: 'Frost', cost: 125, range: 100, damage: 10, fireRate: 600, color: '#06b6d4', icon: '❄️' },
  laser: { name: 'Plasma', cost: 200, range: 140, damage: 60, fireRate: 800, color: '#a855f7', icon: '⚡' },
};

// S-curve path waypoints
const PATH = [
  { x: 0, y: 140 },
  { x: 200, y: 140 },
  { x: 200, y: 380 },
  { x: 480, y: 380 },
  { x: 480, y: 180 },
  { x: 720, y: 180 },
];

export const TowerDefenseGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [gold, setGold] = useState(300);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(1);
  const [selectedTower, setSelectedTower] = useState<TowerType>('archer');
  const [score, setScore] = useState(0);

  const stateRef = useRef({
    gold: 300,
    lives: 20,
    wave: 1,
    score: 0,
    isWaveActive: false,
    towers: [] as {
      x: number;
      y: number;
      type: TowerType;
      level: number;
      lastShot: number;
    }[],
    enemies: [] as {
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      speed: number;
      waypointIdx: number;
      slowTimer: number;
    }[],
    projectiles: [] as {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      color: string;
      damage: number;
      speed: number;
    }[],
    animId: 0,
  });

  const startNextWave = () => {
    const st = stateRef.current;
    if (st.isWaveActive) return;
    st.isWaveActive = true;
    Sound.playShoot();

    const enemyCount = 6 + st.wave * 3;
    let spawned = 0;

    const spawnInterval = setInterval(() => {
      if (gameState !== 'PLAYING' || spawned >= enemyCount) {
        clearInterval(spawnInterval);
        return;
      }
      spawned++;
      st.enemies.push({
        x: PATH[0].x - spawned * 25,
        y: PATH[0].y,
        hp: 30 + st.wave * 15,
        maxHp: 30 + st.wave * 15,
        speed: 1.6 + Math.random() * 0.4,
        waypointIdx: 1,
        slowTimer: 0,
      });
    }, 700);
  };

  const startGame = () => {
    Sound.playClick();
    const st = stateRef.current;
    st.gold = 350;
    st.lives = 20;
    st.wave = 1;
    st.score = 0;
    st.towers = [
      { x: 140, y: 220, type: 'archer', level: 1, lastShot: 0 },
      { x: 380, y: 310, type: 'cannon', level: 1, lastShot: 0 },
    ];
    st.enemies = [];
    st.projectiles = [];
    st.isWaveActive = false;

    setGold(350);
    setLives(20);
    setWave(1);
    setScore(0);
    setGameState('PLAYING');
    setTimeout(startNextWave, 800);
  };

  const handleCanvasClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 540 / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const st = stateRef.current;
    const def = TOWERS[selectedTower];

    // Check if clicking existing tower to upgrade
    const existing = st.towers.find((t) => Math.hypot(t.x - clickX, t.y - clickY) < 28);
    if (existing) {
      const upgradeCost = Math.floor(def.cost * 0.8);
      if (st.gold >= upgradeCost && existing.level < 3) {
        st.gold -= upgradeCost;
        existing.level++;
        setGold(st.gold);
        Sound.playWin();
      }
      return;
    }

    // Check not on road
    // Approximate distance to road segments
    let onRoad = false;
    for (let i = 0; i < PATH.length - 1; i++) {
      const p1 = PATH[i];
      const p2 = PATH[i + 1];
      const minX = Math.min(p1.x, p2.x) - 35;
      const maxX = Math.max(p1.x, p2.x) + 35;
      const minY = Math.min(p1.y, p2.y) - 35;
      const maxY = Math.max(p1.y, p2.y) + 35;
      if (clickX >= minX && clickX <= maxX && clickY >= minY && clickY <= maxY) {
        onRoad = true;
        break;
      }
    }

    if (onRoad) return;

    if (st.gold >= def.cost) {
      st.gold -= def.cost;
      st.towers.push({
        x: clickX,
        y: clickY,
        type: selectedTower,
        level: 1,
        lastShot: 0,
      });
      setGold(st.gold);
      Sound.playCoin();
    }
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

      // Update enemies along path
      for (const enemy of st.enemies) {
        if (enemy.slowTimer > 0) enemy.slowTimer--;
        const actualSpeed = enemy.slowTimer > 0 ? enemy.speed * 0.5 : enemy.speed;

        const targetWp = PATH[enemy.waypointIdx];
        if (targetWp) {
          const dx = targetWp.x - enemy.x;
          const dy = targetWp.y - enemy.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 6) {
            enemy.waypointIdx++;
            if (enemy.waypointIdx >= PATH.length) {
              // Reached castle!
              st.lives--;
              setLives(st.lives);
              Sound.playLose();
              enemy.hp = 0; // consumed

              if (st.lives <= 0) {
                setGameState('GAMEOVER');
                onGameOver?.(st.score);
                isRunning = false;
                return;
              }
            }
          } else {
            enemy.x += (dx / dist) * actualSpeed;
            enemy.y += (dy / dist) * actualSpeed;
          }
        }
      }

      // Towers shooting
      for (const tower of st.towers) {
        const def = TOWERS[tower.type];
        const range = def.range + (tower.level - 1) * 20;
        const fireRate = Math.max(150, def.fireRate - (tower.level - 1) * 80);

        if (timestamp - tower.lastShot > fireRate) {
          // Find first enemy in range
          const target = st.enemies.find((e) => Math.hypot(e.x - tower.x, e.y - tower.y) <= range && e.hp > 0);
          if (target) {
            tower.lastShot = timestamp;
            const damage = def.damage * tower.level;
            target.hp -= damage;
            if (tower.type === 'frost') target.slowTimer = 90;

            st.projectiles.push({
              x: tower.x,
              y: tower.y,
              targetX: target.x,
              targetY: target.y,
              color: def.color,
              damage,
              speed: 12,
            });

            Sound.playShoot();

            if (target.hp <= 0) {
              st.gold += 18;
              st.score += 25;
              setGold(st.gold);
              setScore(st.score);
              onScoreUpdate?.(st.score);
              Sound.playHit();
            }
          }
        }
      }

      // Filter dead enemies
      st.enemies = st.enemies.filter((e) => e.hp > 0);

      // Check wave clear
      if (st.isWaveActive && st.enemies.length === 0) {
        st.isWaveActive = false;
        st.wave++;
        setWave(st.wave);
        st.gold += 60;
        setGold(st.gold);
        Sound.playWin();
        confetti({ particleCount: 30, spread: 45 });
      }

      // Update projectiles
      for (const p of st.projectiles) {
        p.x += (p.targetX - p.x) * 0.4;
        p.y += (p.targetY - p.y) * 0.4;
      }
      st.projectiles = st.projectiles.filter((p) => Math.hypot(p.targetX - p.x, p.targetY - p.y) > 4);

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Lush green kingdom grass
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, w, h);

      // Draw Winding Dirt Track
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 50;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
      ctx.stroke();

      // Track borders
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 54;
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
      ctx.stroke();

      // Inner cobblestone
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 42;
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
      ctx.stroke();

      // Draw Towers
      for (const t of st.towers) {
        const def = TOWERS[t.type];

        // Base ring
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Tower body
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 14, 0, Math.PI * 2);
        ctx.fill();

        // Level stars
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('★'.repeat(t.level), t.x, t.y + 26);
      }

      // Draw Projectiles
      for (const p of st.projectiles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Creeps / Enemies
      for (const e of st.enemies) {
        ctx.fillStyle = e.slowTimer > 0 ? '#38bdf8' : '#ef4444';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 11, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const bw = 22;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(e.x - bw / 2, e.y - 18, bw, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(e.x - bw / 2, e.y - 18, bw * (e.hp / e.maxHp), 4);
      }

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
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-yellow-400 font-bold text-xs mr-2">GOLD</span>
            <span className="font-mono text-base font-bold tabular-nums text-yellow-300">💰 {gold}</span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-red-400 font-bold text-xs mr-2">CASTLE</span>
            <span className="font-mono text-base font-bold tabular-nums text-red-400">❤️ {lives}</span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">WAVE</span>
            <span className="font-mono text-base font-bold text-white">{wave}</span>
          </div>
        </div>

        <button
          onClick={startNextWave}
          disabled={stateRef.current.isWaveActive}
          className="pointer-events-auto px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-lg active:scale-95"
        >
          {stateRef.current.isWaveActive ? 'Wave in Progress...' : 'Start Next Wave ⚔️'}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        onPointerDown={handleCanvasClick}
        className="w-full max-w-[720px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-2xl border border-emerald-500/20 cursor-pointer touch-none"
      />

      {/* Tower Selection Bar */}
      <div className="flex items-center gap-2 mt-2 bg-slate-900/90 p-2 rounded-2xl border border-white/10 shadow-xl">
        {(Object.keys(TOWERS) as TowerType[]).map((type) => {
          const t = TOWERS[type];
          const isSelected = selectedTower === type;
          return (
            <button
              key={type}
              onClick={() => {
                setSelectedTower(type);
                Sound.playClick();
              }}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{t.icon}</span>
              <div className="text-left">
                <div className="text-xs font-bold">{t.name}</div>
                <div className="text-[10px] text-amber-300 font-mono">{t.cost}g</div>
              </div>
            </button>
          );
        })}
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 animate-bounce">
            <span className="text-3xl">🏰</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Kingdom Tower Defense</h2>
          <p className="text-slate-300 max-w-md text-sm mb-6">
            Build defensive turrets on the grass along the path. Stop enemy creeps before they breach the fortress!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-base"
          >
            Defend Kingdom
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-4xl mb-3">💥</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Castle Breached!</h2>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Score</span>
              <span className="font-bold text-white font-mono">{score}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Waves Survived</span>
              <span className="font-bold text-amber-400 font-mono">{wave - 1}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
