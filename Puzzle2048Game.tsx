import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type Board = number[][];

export const Puzzle2048Game: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const [board, setBoard] = useState<Board>(() => getInitialBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) return JSON.parse(raw).highScores?.['puzzle-2048'] || 0;
    } catch {}
    return 0;
  });
  const [history, setHistory] = useState<{ board: Board; score: number }[]>([]);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function getInitialBoard(): Board {
    const b = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    addRandomTile(b);
    addRandomTile(b);
    return b;
  }

  function addRandomTile(b: Board): boolean {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return false;
    const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    b[choice.r][choice.c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  const checkGameOver = (b: Board): boolean => {
    // Any empty cell?
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) return false;
        if (c < 3 && b[r][c] === b[r][c + 1]) return false;
        if (r < 3 && b[r][c] === b[r + 1][c]) return false;
      }
    }
    return true;
  };

  const move = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (lost) return;

      const newBoard: Board = board.map((row) => [...row]);
      let pointsEarned = 0;
      let hasMoved = false;

      // Helper to slide and merge a single row
      const slide = (row: number[]) => {
        const nonZero = row.filter((val) => val !== 0);
        const result: number[] = [];
        for (let i = 0; i < nonZero.length; i++) {
          if (i < nonZero.length - 1 && nonZero[i] === nonZero[i + 1]) {
            const merged = nonZero[i] * 2;
            result.push(merged);
            pointsEarned += merged;
            if (merged === 2048 && !won) {
              setWon(true);
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            i++;
          } else {
            result.push(nonZero[i]);
          }
        }
        while (result.length < 4) result.push(0);
        return result;
      };

      if (direction === 'LEFT') {
        for (let r = 0; r < 4; r++) {
          const oldRow = newBoard[r];
          const newRow = slide(oldRow);
          if (oldRow.some((val, idx) => val !== newRow[idx])) hasMoved = true;
          newBoard[r] = newRow;
        }
      } else if (direction === 'RIGHT') {
        for (let r = 0; r < 4; r++) {
          const oldRow = newBoard[r];
          const newRow = slide([...oldRow].reverse()).reverse();
          if (oldRow.some((val, idx) => val !== newRow[idx])) hasMoved = true;
          newBoard[r] = newRow;
        }
      } else if (direction === 'UP') {
        for (let c = 0; c < 4; c++) {
          const oldCol = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
          const newCol = slide(oldCol);
          if (oldCol.some((val, idx) => val !== newCol[idx])) hasMoved = true;
          for (let r = 0; r < 4; r++) newBoard[r][c] = newCol[r];
        }
      } else if (direction === 'DOWN') {
        for (let c = 0; c < 4; c++) {
          const oldCol = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
          const newCol = slide([...oldCol].reverse()).reverse();
          if (oldCol.some((val, idx) => val !== newCol[idx])) hasMoved = true;
          for (let r = 0; r < 4; r++) newBoard[r][c] = newCol[r];
        }
      }

      if (hasMoved) {
        setHistory((prev) => [...prev.slice(-10), { board, score }]);
        addRandomTile(newBoard);
        setBoard(newBoard);

        const newScore = score + pointsEarned;
        setScore(newScore);
        onScoreUpdate?.(newScore);

        if (pointsEarned > 0) {
          Sound.playMerge();
        } else {
          Sound.playScore();
        }

        if (newScore > bestScore) {
          setBestScore(newScore);
        }

        if (checkGameOver(newBoard)) {
          setLost(true);
          Sound.playLose();
          onGameOver?.(newScore);
        }
      }
    },
    [board, score, bestScore, won, lost, onScoreUpdate, onGameOver]
  );

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setBoard(last.board);
    setScore(last.score);
    setHistory((prev) => prev.slice(0, -1));
    setLost(false);
    Sound.playClick();
  };

  const restart = () => {
    Sound.playClick();
    setBoard(getInitialBoard());
    setScore(0);
    setHistory([]);
    setWon(false);
    setLost(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move('RIGHT');
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') move('UP');
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') move('DOWN');
      if (e.key === 'u' || e.key === 'U') undo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) move(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      if (Math.abs(dy) > 30) move(dy > 0 ? 'DOWN' : 'UP');
    }
  };

  const getTileColor = (val: number) => {
    switch (val) {
      case 2:
        return 'bg-amber-100 text-slate-800 dark:bg-amber-200';
      case 4:
        return 'bg-amber-200 text-slate-900 dark:bg-amber-300';
      case 8:
        return 'bg-orange-400 text-white shadow-md shadow-orange-500/20';
      case 16:
        return 'bg-orange-500 text-white shadow-md shadow-orange-500/30';
      case 32:
        return 'bg-rose-500 text-white shadow-md shadow-rose-500/30';
      case 64:
        return 'bg-red-600 text-white shadow-lg shadow-red-600/30';
      case 128:
        return 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/40 text-2xl font-black';
      case 256:
        return 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/40 text-2xl font-black';
      case 512:
        return 'bg-amber-500 text-white shadow-xl shadow-amber-500/50 text-2xl font-black';
      case 1024:
        return 'bg-purple-600 text-white shadow-xl shadow-purple-600/50 text-xl font-black';
      case 2048:
        return 'bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 text-white shadow-2xl shadow-yellow-400/60 text-xl font-black ring-4 ring-yellow-300 animate-pulse';
      default:
        return 'bg-indigo-600 text-white text-lg font-black';
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 select-none overflow-hidden"
    >
      {/* Top Bar with score & undo */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            2048 <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500 text-slate-950 rounded-lg">PUZZLE</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-800/90 border border-white/10 px-3 py-1 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold">SCORE</div>
            <div className="text-base font-extrabold text-white font-mono">{score}</div>
          </div>
          <div className="bg-slate-800/90 border border-white/10 px-3 py-1 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold">BEST</div>
            <div className="text-base font-extrabold text-amber-400 font-mono">{bestScore}</div>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative w-full max-w-sm aspect-square bg-slate-950/80 p-3 rounded-2xl border-2 border-amber-500/30 shadow-2xl grid grid-cols-4 grid-rows-4 gap-2.5">
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`rounded-xl flex items-center justify-center font-bold text-2xl transition-all duration-100 ${
                cell === 0 ? 'bg-slate-800/40 border border-white/5' : getTileColor(cell)
              }`}
            >
              {cell > 0 ? cell : ''}
            </div>
          ))
        )}

        {/* Win Overlay */}
        {won && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="text-5xl mb-2">🎉</div>
            <h3 className="text-2xl font-black text-amber-400 mb-1">You Reached 2048!</h3>
            <p className="text-slate-300 text-xs mb-4">Incredible mathematical mastery!</p>
            <div className="flex gap-2">
              <button
                onClick={() => setWon(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700"
              >
                Keep Going
              </button>
              <button
                onClick={restart}
                className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {lost && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="text-4xl mb-2">💀</div>
            <h3 className="text-2xl font-black text-white mb-1">Game Over!</h3>
            <p className="text-slate-400 text-xs mb-4">No more legal moves left on the grid.</p>
            <div className="flex gap-2">
              {history.length > 0 && (
                <button
                  onClick={undo}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  Undo Move
                </button>
              )}
              <button
                onClick={restart}
                className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="w-full max-w-sm flex items-center justify-between mt-4">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-bold border border-white/10 transition-colors"
        >
          ↩ Undo (U)
        </button>
        <div className="text-xs text-slate-400">Arrow keys or Swipe to slide</div>
        <button
          onClick={restart}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
        >
          Reset
        </button>
      </div>

      {/* On-screen Direction Arrows for Mobile */}
      <div className="grid grid-cols-3 gap-2 mt-3 w-48 md:hidden">
        <div />
        <button
          onClick={() => move('UP')}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold text-center"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => move('LEFT')}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold text-center"
        >
          ←
        </button>
        <button
          onClick={() => move('DOWN')}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold text-center"
        >
          ↓
        </button>
        <button
          onClick={() => move('RIGHT')}
          className="p-3 bg-slate-800 text-white rounded-xl active:bg-slate-700 font-bold text-center"
        >
          →
        </button>
      </div>
    </div>
  );
};
