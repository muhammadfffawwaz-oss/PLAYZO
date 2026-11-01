import React, { useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const TicTacToeGame: React.FC<GameProps> = ({ onScoreUpdate }) => {
  const [gridSize, setGridSize] = useState<3 | 5>(3);
  const [board, setBoard] = useState<(string | null)[]>(() => Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [vsAI, setVsAI] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ x: 0, o: 0, ties: 0 });

  const checkWinner = (squares: (string | null)[], size: number): { winner: string; line: number[] } | null => {
    const winLength = size === 3 ? 3 : 4;

    // Check rows
    for (let r = 0; r < size; r++) {
      for (let c = 0; c <= size - winLength; c++) {
        const first = squares[r * size + c];
        if (!first) continue;
        let match = true;
        const line = [r * size + c];
        for (let k = 1; k < winLength; k++) {
          if (squares[r * size + c + k] !== first) {
            match = false;
            break;
          }
          line.push(r * size + c + k);
        }
        if (match) return { winner: first, line };
      }
    }

    // Check cols
    for (let c = 0; c < size; c++) {
      for (let r = 0; r <= size - winLength; r++) {
        const first = squares[r * size + c];
        if (!first) continue;
        let match = true;
        const line = [r * size + c];
        for (let k = 1; k < winLength; k++) {
          if (squares[(r + k) * size + c] !== first) {
            match = false;
            break;
          }
          line.push((r + k) * size + c);
        }
        if (match) return { winner: first, line };
      }
    }

    // Check main diagonals
    for (let r = 0; r <= size - winLength; r++) {
      for (let c = 0; c <= size - winLength; c++) {
        const first = squares[r * size + c];
        if (!first) continue;
        let match = true;
        const line = [r * size + c];
        for (let k = 1; k < winLength; k++) {
          if (squares[(r + k) * size + (c + k)] !== first) {
            match = false;
            break;
          }
          line.push((r + k) * size + (c + k));
        }
        if (match) return { winner: first, line };
      }
    }

    // Check anti diagonals
    for (let r = 0; r <= size - winLength; r++) {
      for (let c = winLength - 1; c < size; c++) {
        const first = squares[r * size + c];
        if (!first) continue;
        let match = true;
        const line = [r * size + c];
        for (let k = 1; k < winLength; k++) {
          if (squares[(r + k) * size + (c - k)] !== first) {
            match = false;
            break;
          }
          line.push((r + k) * size + (c - k));
        }
        if (match) return { winner: first, line };
      }
    }

    return null;
  };

  const handleAIMove = (currentSquares: (string | null)[]) => {
    // Collect empty slots
    const available = currentSquares
      .map((val, idx) => (val === null ? idx : null))
      .filter((val): val is number => val !== null);

    if (available.length === 0) return;

    // 1. Can AI (O) win right now?
    for (const idx of available) {
      const copy = [...currentSquares];
      copy[idx] = 'O';
      if (checkWinner(copy, gridSize)?.winner === 'O') {
        makeMove(idx, copy, 'O');
        return;
      }
    }

    // 2. Can player (X) win next? Block it!
    for (const idx of available) {
      const copy = [...currentSquares];
      copy[idx] = 'X';
      if (checkWinner(copy, gridSize)?.winner === 'X') {
        const aiCopy = [...currentSquares];
        aiCopy[idx] = 'O';
        makeMove(idx, aiCopy, 'O');
        return;
      }
    }

    // 3. Take center if available
    const centerIdx = gridSize === 3 ? 4 : 12;
    if (currentSquares[centerIdx] === null) {
      const copy = [...currentSquares];
      copy[centerIdx] = 'O';
      makeMove(centerIdx, copy, 'O');
      return;
    }

    // 4. Otherwise pick random open cell
    const randomPick = available[Math.floor(Math.random() * available.length)];
    const copy = [...currentSquares];
    copy[randomPick] = 'O';
    makeMove(randomPick, copy, 'O');
  };

  const makeMove = (index: number, newSquares: (string | null)[], player: 'X' | 'O') => {
    Sound.playClick();
    const result = checkWinner(newSquares, gridSize);

    if (result) {
      setBoard(newSquares);
      setWinner(result.winner);
      setWinningLine(result.line);
      Sound.playWin();
      if (result.winner === 'X') {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
        setScores((prev) => {
          const updated = { ...prev, x: prev.x + 1 };
          onScoreUpdate?.(updated.x * 100);
          return updated;
        });
      } else {
        setScores((prev) => ({ ...prev, o: prev.o + 1 }));
      }
      return;
    }

    // Check tie
    if (newSquares.every((sq) => sq !== null)) {
      setBoard(newSquares);
      setWinner('TIE');
      Sound.playLose();
      setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
      return;
    }

    setBoard(newSquares);
    setIsXNext(player === 'O');
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;

    const currentPlayer = isXNext ? 'X' : 'O';
    const newBoard = [...board];
    newBoard[index] = currentPlayer;

    makeMove(index, newBoard, currentPlayer);

    // If playing vs AI and game not ended
    if (vsAI && isXNext && !winner && newBoard.some((s) => s === null)) {
      const result = checkWinner(newBoard, gridSize);
      if (!result) {
        setTimeout(() => {
          handleAIMove(newBoard);
        }, 350);
      }
    }
  };

  const resetGame = () => {
    Sound.playClick();
    setBoard(Array(gridSize * gridSize).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
  };

  const changeGrid = (size: 3 | 5) => {
    Sound.playClick();
    setGridSize(size);
    setBoard(Array(size * size).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 select-none overflow-hidden">
      {/* Top Controls & Modes */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4">
        <div className="flex bg-slate-800 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setVsAI(true)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              vsAI ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            vs AI 🤖
          </button>
          <button
            onClick={() => setVsAI(false)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              !vsAI ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            2 Player 👥
          </button>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => changeGrid(3)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              gridSize === 3 ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            3x3
          </button>
          <button
            onClick={() => changeGrid(5)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              gridSize === 5 ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            5x5
          </button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="w-full max-w-sm flex items-center justify-around bg-slate-950/60 border border-white/10 rounded-2xl p-2.5 mb-5 shadow-lg">
        <div className="text-center">
          <div className="text-xs font-bold text-pink-400">PLAYER (X)</div>
          <div className="text-xl font-extrabold text-white font-mono">{scores.x}</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-slate-400">TIES</div>
          <div className="text-xl font-extrabold text-slate-300 font-mono">{scores.ties}</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-cyan-400">{vsAI ? 'BOT (O)' : 'PLAYER 2 (O)'}</div>
          <div className="text-xl font-extrabold text-white font-mono">{scores.o}</div>
        </div>
      </div>

      {/* Grid */}
      <div
        className={`relative w-full max-w-sm aspect-square bg-slate-950/80 p-3 rounded-2xl border-2 border-pink-500/30 shadow-2xl grid gap-2 ${
          gridSize === 3 ? 'grid-cols-3 grid-rows-3' : 'grid-cols-5 grid-rows-5'
        }`}
      >
        {board.map((cell, index) => {
          const isWinningCell = winningLine?.includes(index);
          return (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className={`rounded-xl flex items-center justify-center font-black transition-all ${
                gridSize === 3 ? 'text-4xl' : 'text-2xl'
              } ${
                isWinningCell
                  ? 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white scale-105 shadow-lg shadow-pink-500/50'
                  : cell === 'X'
                  ? 'bg-slate-800 text-pink-400 border border-pink-500/20'
                  : cell === 'O'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/20'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 active:scale-95'
              }`}
            >
              {cell}
            </button>
          );
        })}

        {/* Winner Banner Overlay */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="text-4xl mb-2">{winner === 'TIE' ? '🤝' : '👑'}</div>
            <h3 className="text-2xl font-black text-white mb-2">
              {winner === 'TIE'
                ? 'It is a Draw!'
                : winner === 'X'
                ? 'Player X Wins!'
                : vsAI
                ? 'AI Bot Wins!'
                : 'Player O Wins!'}
            </h3>
            <button
              onClick={resetGame}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-sm"
            >
              Play Next Round
            </button>
          </div>
        )}
      </div>

      {/* Turn indicator & Reset */}
      <div className="w-full max-w-sm flex items-center justify-between mt-4">
        <div className="text-xs text-slate-300 flex items-center gap-2">
          <span>Turn:</span>
          <span className={`font-bold ${isXNext ? 'text-pink-400' : 'text-cyan-400'}`}>
            {isXNext ? 'Player (X)' : vsAI ? 'AI thinking...' : 'Player 2 (O)'}
          </span>
        </div>
        <button
          onClick={resetGame}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-white/10"
        >
          Reset Board
        </button>
      </div>
    </div>
  );
};
