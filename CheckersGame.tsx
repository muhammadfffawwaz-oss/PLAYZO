import React, { useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type PieceColor = 'red' | 'black';

interface Piece {
  color: PieceColor;
  isKing: boolean;
}

type Square = Piece | null;

export const CheckersGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const [board, setBoard] = useState<Square[][]>(() => createInitialBoard());
  const [turn, setTurn] = useState<PieceColor>('red');
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number; c: number; isJump: boolean; jumped?: { r: number; c: number } }[]>([]);
  const [redCaptured, setRedCaptured] = useState(0);
  const [blackCaptured, setBlackCaptured] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  function createInitialBoard(): Square[][] {
    const b: Square[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));

    // Place Black on rows 0, 1, 2
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) b[r][c] = { color: 'black', isKing: false };
      }
    }
    // Place Red on rows 5, 6, 7
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) b[r][c] = { color: 'red', isKing: false };
      }
    }
    return b;
  }

  const getMovesForPiece = (r: number, c: number, currentBoard: Square[][]) => {
    const piece = currentBoard[r][c];
    if (!piece) return [];
    const moves: { r: number; c: number; isJump: boolean; jumped?: { r: number; c: number } }[] = [];
    const dirs: number[] = [];

    if (piece.color === 'red' || piece.isKing) dirs.push(-1); // upwards
    if (piece.color === 'black' || piece.isKing) dirs.push(1); // downwards

    const opponent = piece.color === 'red' ? 'black' : 'red';

    for (const dr of dirs) {
      for (const dc of [-1, 1]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          // Regular step
          if (currentBoard[nr][nc] === null) {
            moves.push({ r: nr, c: nc, isJump: false });
          } else if (currentBoard[nr][nc]?.color === opponent) {
            // Jump step
            const jr = nr + dr;
            const jc = nc + dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && currentBoard[jr][jc] === null) {
              moves.push({ r: jr, c: jc, isJump: true, jumped: { r: nr, c: nc } });
            }
          }
        }
      }
    }

    return moves;
  };

  const handleAIMove = (currentBoard: Square[][]) => {
    const allMoves: {
      from: { r: number; c: number };
      to: { r: number; c: number; isJump: boolean; jumped?: { r: number; c: number } };
    }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = currentBoard[r][c];
        if (p && p.color === 'black') {
          const pm = getMovesForPiece(r, c, currentBoard);
          for (const m of pm) {
            allMoves.push({ from: { r, c }, to: m });
          }
        }
      }
    }

    if (allMoves.length === 0) {
      setWinner('Red Wins!');
      Sound.playWin();
      confetti({ particleCount: 70, spread: 60 });
      return;
    }

    // AI prefers jumps if available
    const jumps = allMoves.filter((m) => m.to.isJump);
    const chosen = jumps.length > 0
      ? jumps[Math.floor(Math.random() * jumps.length)]
      : allMoves[Math.floor(Math.random() * allMoves.length)];

    executeMove(chosen.from.r, chosen.from.c, chosen.to, currentBoard, 'black');
  };

  const executeMove = (
    fromR: number,
    fromC: number,
    move: { r: number; c: number; isJump: boolean; jumped?: { r: number; c: number } },
    currentBoard: Square[][],
    movingColor: PieceColor
  ) => {
    const newBoard = currentBoard.map((row) => [...row]);
    const piece = newBoard[fromR][fromC]!;

    // Check King crowning
    let isKing = piece.isKing;
    if (movingColor === 'red' && move.r === 0) isKing = true;
    if (movingColor === 'black' && move.r === 7) isKing = true;

    newBoard[move.r][move.c] = { color: movingColor, isKing };
    newBoard[fromR][fromC] = null;

    if (move.isJump && move.jumped) {
      newBoard[move.jumped.r][move.jumped.c] = null;
      Sound.playHit();
      if (movingColor === 'red') {
        const next = blackCaptured + 1;
        setBlackCaptured(next);
        onScoreUpdate?.(next * 100);
        if (next >= 12) {
          setWinner('Red Wins All Checkers!');
          Sound.playWin();
          confetti({ particleCount: 70, spread: 60 });
          onGameOver?.(1200);
        }
      } else {
        const next = redCaptured + 1;
        setRedCaptured(next);
        if (next >= 12) {
          setWinner('Black Wins All Checkers!');
          Sound.playLose();
        }
      }
    } else {
      Sound.playClick();
    }

    setBoard(newBoard);
    setSelectedSquare(null);
    setValidMoves([]);

    const nextTurn = movingColor === 'red' ? 'black' : 'red';
    setTurn(nextTurn);

    if (nextTurn === 'black') {
      setTimeout(() => {
        handleAIMove(newBoard);
      }, 450);
    }
  };

  const handleSquareClick = (r: number, c: number) => {
    if (winner || turn !== 'red') return;

    const clicked = board[r][c];

    // If destination clicked
    if (selectedSquare) {
      const targetMove = validMoves.find((m) => m.r === r && m.c === c);
      if (targetMove) {
        executeMove(selectedSquare.r, selectedSquare.c, targetMove, board, 'red');
        return;
      }
    }

    // Select red piece
    if (clicked && clicked.color === 'red') {
      setSelectedSquare({ r, c });
      setValidMoves(getMovesForPiece(r, c, board));
      Sound.playClick();
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const restart = () => {
    Sound.playClick();
    setBoard(createInitialBoard());
    setTurn('red');
    setSelectedSquare(null);
    setValidMoves([]);
    setRedCaptured(0);
    setBlackCaptured(0);
    setWinner(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-3 bg-slate-900 select-none overflow-hidden">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-2">
        <div className="flex gap-4 text-xs font-bold text-slate-300">
          <div>
            Black Captured: <span className="text-red-400 font-mono text-sm">{blackCaptured}/12</span>
          </div>
          <div>
            Red Captured: <span className="text-slate-400 font-mono text-sm">{redCaptured}/12</span>
          </div>
        </div>
        <button
          onClick={restart}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-white/10"
        >
          Reset
        </button>
      </div>

      {/* 8x8 Checkers Board */}
      <div className="relative w-full max-w-md aspect-square bg-slate-950 p-2 rounded-2xl border-4 border-slate-700 shadow-2xl grid grid-cols-8 grid-rows-8">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
            const isValidDestination = validMoves.some((m) => m.r === r && m.c === c);

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleSquareClick(r, c)}
                className={`relative flex items-center justify-center transition-colors ${
                  isDark ? 'bg-amber-950/80' : 'bg-amber-100/70'
                }`}
              >
                {cell && (
                  <div
                    className={`w-4/5 h-4/5 rounded-full shadow-lg flex items-center justify-center font-black text-xs transition-transform ${
                      cell.color === 'red'
                        ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-600/40'
                        : 'bg-gradient-to-tr from-slate-900 to-zinc-700 text-amber-300 shadow-black'
                    } ${isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''}`}
                  >
                    {cell.isKing ? '👑' : ''}
                  </div>
                )}

                {/* Move destination dot */}
                {isValidDestination && (
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-md animate-pulse" />
                )}
              </button>
            );
          })
        )}

        {/* Winner modal */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-2xl font-black text-white mb-2">{winner}</h3>
            <button
              onClick={restart}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-xl shadow-lg"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-md flex items-center justify-between mt-3 text-xs text-slate-400">
        <div>
          Turn:{' '}
          <span className={`font-bold ${turn === 'red' ? 'text-red-400' : 'text-slate-400'}`}>
            {turn === 'red' ? 'Red Draughts (You)' : 'Black (AI thinking...)'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500">Reach the back row to crown a King!</div>
      </div>
    </div>
  );
};
