import React, { useEffect, useRef, useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type BlockType = 'air' | 'grass' | 'dirt' | 'stone' | 'wood' | 'leaves' | 'brick' | 'glass' | 'gold' | 'tnt';

interface BlockDef {
  name: string;
  color: string;
  topColor?: string;
  borderColor?: string;
  isSolid: boolean;
}

const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  air: { name: 'Air', color: 'transparent', isSolid: false },
  grass: { name: 'Grass', color: '#854d0e', topColor: '#22c55e', isSolid: true },
  dirt: { name: 'Dirt', color: '#78350f', isSolid: true },
  stone: { name: 'Stone', color: '#64748b', isSolid: true },
  wood: { name: 'Wood', color: '#a16207', isSolid: true },
  leaves: { name: 'Leaves', color: '#15803d', isSolid: true },
  brick: { name: 'Brick', color: '#b91c1c', isSolid: true },
  glass: { name: 'Glass', color: 'rgba(186, 230, 253, 0.5)', isSolid: true },
  gold: { name: 'Gold', color: '#facc15', isSolid: true },
  tnt: { name: 'TNT', color: '#dc2626', topColor: '#f8fafc', isSolid: true },
};

const HOTBAR: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'leaves', 'brick', 'glass', 'gold', 'tnt'];

const GRID_COLS = 36;
const GRID_ROWS = 24;
const TILE_SIZE = 20;

export const MinecraftBuilderGame: React.FC<GameProps> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>('grass');
  const [mode, setMode] = useState<'BUILD' | 'MINE' | 'IGNITE'>('BUILD');
  const [blocksPlaced, setBlocksPlaced] = useState(0);

  const stateRef = useRef({
    grid: [] as BlockType[][],
    playerX: 18 * TILE_SIZE,
    playerY: 8 * TILE_SIZE,
    playerVx: 0,
    playerVy: 0,
    isGrounded: false,
    keys: { left: false, right: false, jump: false },
    mouseTile: { c: 0, r: 0 },
    explosions: [] as { x: number; y: number; r: number; alpha: number }[],
    animId: 0,
  });

  // World Generation: rolling hills, trees with wood & leaves, stone underground
  const generateWorld = () => {
    const grid: BlockType[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        // Natural hill height
        const surfaceR = Math.floor(13 + Math.sin(c * 0.28) * 3 + Math.cos(c * 0.1) * 2);
        if (r < surfaceR) {
          grid[r][c] = 'air';
        } else if (r === surfaceR) {
          grid[r][c] = 'grass';
        } else if (r <= surfaceR + 3) {
          grid[r][c] = 'dirt';
        } else {
          // Stone layer with random gold ore
          grid[r][c] = Math.random() < 0.08 ? 'gold' : 'stone';
        }
      }
    }

    // Plant trees
    const treeColumns = [6, 15, 24, 30];
    for (const tc of treeColumns) {
      let surf = 0;
      while (surf < GRID_ROWS && grid[surf][tc] === 'air') surf++;
      surf--; // top of grass
      if (surf >= 4) {
        // Trunk
        grid[surf][tc] = 'wood';
        grid[surf - 1][tc] = 'wood';
        grid[surf - 2][tc] = 'wood';
        // Leaves
        for (let lr = surf - 4; lr <= surf - 2; lr++) {
          for (let lc = tc - 1; lc <= tc + 1; lc++) {
            if (grid[lr]?.[lc] === 'air') grid[lr][lc] = 'leaves';
          }
        }
      }
    }

    stateRef.current.grid = grid;
  };

  useEffect(() => {
    generateWorld();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') st.keys.left = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') st.keys.right = true;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.code === 'Space') {
        if (st.isGrounded) {
          st.playerVy = -8;
          st.isGrounded = false;
          Sound.playJump();
        }
      }
      // 1-9 hotbar selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= HOTBAR.length) {
        setSelectedBlock(HOTBAR[num - 1]);
        Sound.playClick();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') st.keys.left = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') st.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = (GRID_COLS * TILE_SIZE) / rect.width;
    const scaleY = (GRID_ROWS * TILE_SIZE) / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const c = Math.floor(x / TILE_SIZE);
    const r = Math.floor(y / TILE_SIZE);
    const st = stateRef.current;

    if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return;

    if (mode === 'MINE') {
      if (st.grid[r][c] !== 'air') {
        st.grid[r][c] = 'air';
        Sound.playHit();
      }
    } else if (mode === 'BUILD') {
      if (st.grid[r][c] === 'air') {
        st.grid[r][c] = selectedBlock;
        Sound.playScore();
        setBlocksPlaced((prev) => {
          const next = prev + 1;
          onScoreUpdate?.(next * 10);
          return next;
        });
      }
    } else if (mode === 'IGNITE') {
      // Ignite TNT if clicked or clicked nearby
      if (st.grid[r][c] === 'tnt') {
        // Boom!
        st.explosions.push({ x: (c + 0.5) * TILE_SIZE, y: (r + 0.5) * TILE_SIZE, r: 10, alpha: 1 });
        Sound.playExplosion();
        // Clear 3x3 surrounding
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const er = r + dr;
            const ec = c + dc;
            if (er >= 0 && er < GRID_ROWS && ec >= 0 && ec < GRID_COLS) {
              st.grid[er][ec] = 'air';
            }
          }
        }
        confetti({ particleCount: 50, spread: 60, origin: { x: (c / GRID_COLS), y: (r / GRID_ROWS) } });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = (GRID_COLS * TILE_SIZE) / rect.width;
    const scaleY = (GRID_ROWS * TILE_SIZE) / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    stateRef.current.mouseTile = {
      c: Math.floor(x / TILE_SIZE),
      r: Math.floor(y / TILE_SIZE),
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;
      const st = stateRef.current;

      // Player Movement
      if (st.keys.left) st.playerVx = -3.5;
      else if (st.keys.right) st.playerVx = 3.5;
      else st.playerVx = 0;

      // Apply Gravity
      st.playerVy = Math.min(10, st.playerVy + 0.5);

      // Horizontal Collision
      let nextX = st.playerX + st.playerVx;
      const playerTileC = Math.floor(nextX / TILE_SIZE);
      const playerTileR = Math.floor(st.playerY / TILE_SIZE);

      if (
        playerTileC >= 0 &&
        playerTileC < GRID_COLS &&
        st.grid[playerTileR]?.[playerTileC] &&
        BLOCK_DEFS[st.grid[playerTileR][playerTileC]].isSolid
      ) {
        st.playerVx = 0;
      } else {
        st.playerX = Math.max(10, Math.min((GRID_COLS - 1) * TILE_SIZE, nextX));
      }

      // Vertical Collision
      let nextY = st.playerY + st.playerVy;
      const feetR = Math.floor((nextY + 28) / TILE_SIZE);
      const curC = Math.floor(st.playerX / TILE_SIZE);

      if (
        feetR < GRID_ROWS &&
        st.grid[feetR]?.[curC] &&
        BLOCK_DEFS[st.grid[feetR][curC]].isSolid
      ) {
        st.playerY = feetR * TILE_SIZE - 28;
        st.playerVy = 0;
        st.isGrounded = true;
      } else {
        st.playerY = nextY;
        st.isGrounded = false;
      }

      // RENDER
      const w = canvas.width;
      const h = canvas.height;

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.6, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(60, 50, 28, 0, Math.PI * 2);
      ctx.fill();

      // Render Grid Blocks
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const block = st.grid[r]?.[c];
          if (!block || block === 'air') continue;
          const def = BLOCK_DEFS[block];
          const bx = c * TILE_SIZE;
          const by = r * TILE_SIZE;

          ctx.fillStyle = def.color;
          ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);

          // Top color accent (like green grass on top of dirt)
          if (def.topColor) {
            ctx.fillStyle = def.topColor;
            ctx.fillRect(bx, by, TILE_SIZE, 5);
          }

          // Subtle block border
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, TILE_SIZE, TILE_SIZE);

          // TNT Text
          if (block === 'tnt') {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('TNT', bx + TILE_SIZE / 2, by + TILE_SIZE / 2 + 3);
          }
        }
      }

      // Mouse Hover Outline
      const mc = st.mouseTile.c;
      const mr = st.mouseTile.r;
      if (mc >= 0 && mc < GRID_COLS && mr >= 0 && mr < GRID_ROWS) {
        ctx.strokeStyle = mode === 'MINE' ? '#ef4444' : mode === 'IGNITE' ? '#f59e0b' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(mc * TILE_SIZE, mr * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }

      // Render Explosions
      for (const exp of st.explosions) {
        exp.r += 3;
        exp.alpha -= 0.04;
        ctx.fillStyle = `rgba(239, 68, 68, ${Math.max(0, exp.alpha)})`;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.r, 0, Math.PI * 2);
        ctx.fill();
      }
      st.explosions = st.explosions.filter((e) => e.alpha > 0);

      // Render Player Explorer (Steve style pixel character)
      const px = st.playerX;
      const py = st.playerY;

      // Legs (blue jeans)
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(px + 3, py + 16, 5, 12);
      ctx.fillRect(px + 8, py + 16, 5, 12);

      // Shirt (cyan tunic)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(px + 2, py + 8, 12, 9);

      // Head
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(px + 3, py, 10, 8);
      // Brown hair
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px + 3, py, 10, 3);

      st.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);
    return () => {
      isRunning = false;
      cancelAnimationFrame(stateRef.current.animId);
    };
  }, [mode, selectedBlock]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 select-none overflow-hidden">
      {/* Top HUD */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10 text-white drop-shadow-md">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10">
          <span className="text-emerald-400 font-bold text-xs">BLOCKS BUILT</span>
          <span className="font-mono text-sm font-bold text-white">{blocksPlaced}</span>
        </div>

        {/* Tool modes: Build, Mine, Ignite */}
        <div className="flex bg-slate-900/90 backdrop-blur p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setMode('BUILD')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              mode === 'BUILD' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔨 Place
          </button>
          <button
            onClick={() => setMode('MINE')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              mode === 'MINE' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⛏️ Mine
          </button>
          <button
            onClick={() => setMode('IGNITE')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              mode === 'IGNITE' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔥 Ignite TNT
          </button>
          <button
            onClick={generateWorld}
            className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-white rounded-lg"
          >
            🔄 New World
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_COLS * TILE_SIZE}
        height={GRID_ROWS * TILE_SIZE}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="w-full max-w-[720px] aspect-[3/2] bg-slate-950 rounded-2xl shadow-2xl border border-emerald-500/20 cursor-pointer touch-none"
      />

      {/* Bottom Hotbar */}
      <div className="flex items-center gap-1.5 mt-2 bg-slate-900/90 p-2 rounded-2xl border border-white/10 shadow-xl overflow-x-auto max-w-full">
        {HOTBAR.map((block, idx) => {
          const isSelected = selectedBlock === block;
          const def = BLOCK_DEFS[block];
          return (
            <button
              key={block}
              onClick={() => {
                setSelectedBlock(block);
                Sound.playClick();
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
                isSelected
                  ? 'bg-purple-600/30 border-2 border-purple-500 scale-105'
                  : 'bg-slate-800 hover:bg-slate-700/80 border border-white/5'
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg shadow-sm flex items-center justify-center"
                style={{ backgroundColor: def.color }}
              >
                {block === 'tnt' && <span className="text-[8px] font-black text-white">TNT</span>}
              </div>
              <span className="text-[10px] text-slate-300 font-medium mt-1">
                {idx + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
