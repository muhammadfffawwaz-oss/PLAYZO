import React, { useState } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type PieceColor = 'w' | 'b';
type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

interface Piece {
  color: PieceColor;
  type: PieceType;
}

type Square = Piece | null;

const INITIAL_BOARD: Square[][] = [
  [
    { color: 'b', type: 'r' },
    { color: 'b', type: 'n' },
    { color: 'b', type: 'b' },
    { color: 'b', type: 'q' },
    { color: 'b', type: 'k' },
    { color: 'b', type: 'b' },
    { color: 'b', type: 'n' },
    { color: 'b', type: 'r' },
  ],
  Array(8).fill({ color: 'b', type: 'p' }),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill({ color: 'w', type: 'p' }),
  [
    { color: 'w', type: 'r' },
    { color: 'w', type: 'n' },
    { color: 'w', type: 'b' },
    { color: 'w', type: 'q' },
    { color: 'w', type: 'k' },
    { color: 'w', type: 'b' },
    { color: 'w', type: 'n' },
    { color: 'w', type: 'r' },
  ],
];

const PIECE_SYMBOLS: Record<string, string> = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
};

export const ChessGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const [board, setBoard] = useState<Square[][]>(() => INITIAL_BOARD.map((r) => [...r]));
  const [turn, setTurn] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number; c: number }[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);
  const [vsAI, setVsAI] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  // Compute legal candidate moves for selected piece
  const getLegalMoves = (r: number, c: number, currentBoard: Square[][]): { r: number; c: number }[] => {
    const piece = currentBoard[r][c];
    if (!piece) return [];
    const moves: { r: number; c: number }[] = [];
    const color = piece.color;
    const opponent = color === 'w' ? 'b' : 'w';

    const addMove = (nr: number, nc: number) => {
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
      const target = currentBoard[nr][nc];
      if (!target) {
        moves.push({ r: nr, c: nc });
        return true;
      }
      if (target.color === opponent) {
        moves.push({ r: nr, c: nc });
      }
      return false; // hit piece, stop ray
    };

    if (piece.type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;

      // 1 square forward
      if (currentBoard[r + dir]?.[c] === null) {
        moves.push({ r: r + dir, c });
        // 2 squares forward from home
        if (r === startRow && currentBoard[r + dir * 2]?.[c] === null) {
          moves.push({ r: r + dir * 2, c });
        }
      }
      // Diagonal captures
      [-1, 1].forEach((dc) => {
        const target = currentBoard[r + dir]?.[c + dc];
        if (target && target.color === opponent) {
          moves.push({ r: r + dir, c: c + dc });
        }
      });
    } else if (piece.type === 'n') {
      const knightOffsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      knightOffsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    } else if (piece.type === 'b' || piece.type === 'q') {
      const diagDirs = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];
      diagDirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMove(r + dr * step, c + dc * step)) step++;
      });
    }

    if (piece.type === 'r' || piece.type === 'q') {
      const straightDirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      straightDirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMove(r + dr * step, c + dc * step)) step++;
      });
    }

    if (piece.type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) addMove(r + dr, c + dc);
        }
      }
    }

    return moves;
  };

  const handleAIMove = (currentBoard: Square[][]) => {
    // Collect all black legal moves
    const allMoves: { from: { r: number; c: number }; to: { r: number; c: number }; score: number }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = currentBoard[r][c];
        if (p && p.color === 'b') {
          const pieceMoves = getLegalMoves(r, c, currentBoard);
          for (const m of pieceMoves) {
            const target = currentBoard[m.r][m.c];
            let moveScore = 0;
            if (target) {
              const values: Record<PieceType, number> = { p: 10, n: 30, b: 35, r: 50, q: 90, k: 900 };
              moveScore += values[target.type];
            }
            // Prefer center control
            if (m.r >= 3 && m.r <= 4 && m.c >= 3 && m.c <= 4) moveScore += 3;
            allMoves.push({ from: { r, c }, to: m, score: moveScore });
          }
        }
      }
    }

    if (allMoves.length === 0) {
      setWinner('White wins by Checkmate!');
      Sound.playWin();
      confetti({ particleCount: 70, spread: 60 });
      return;
    }

    // Sort by move score descending + small random noise
    allMoves.sort((a, b) => b.score + Math.random() * 4 - (a.score + Math.random() * 4));
    const chosen = allMoves[0];

    executeMove(chosen.from.r, chosen.from.c, chosen.to.r, chosen.to.c, currentBoard, 'b');
  };

  const executeMove = (
    fromR: number,
    fromC: number,
    toR: number,
    toC: number,
    currentBoard: Square[][],
    movingColor: PieceColor
  ) => {
    const newBoard = currentBoard.map((row) => [...row]);
    const piece = newBoard[fromR][fromC]!;
    const target = newBoard[toR][toC];

    // Pawn promotion to Queen
    if (piece.type === 'p' && (toR === 0 || toR === 7)) {
      piece.type = 'q';
    }

    newBoard[toR][toC] = piece;
    newBoard[fromR][fromC] = null;

    if (target) {
      Sound.playHit();
      if (target.color === 'w') {
        setCapturedWhite((prev) => [...prev, target.type]);
      } else {
        setCapturedBlack((prev) => [...prev, target.type]);
        onScoreUpdate?.((capturedBlack.length + 1) * 100);
      }
      if (target.type === 'k') {
        const winMsg = `${movingColor === 'w' ? 'White' : 'Black'} wins by King capture!`;
        setWinner(winMsg);
        Sound.playWin();
        if (movingColor === 'w') confetti({ particleCount: 80, spread: 60 });
        onGameOver?.(1000);
        setBoard(newBoard);
        return;
      }
    } else {
      Sound.playClick();
    }

    // Record algebraic notation
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const notation = `${piece.type.toUpperCase()}${files[fromC]}${8 - fromR}→${files[toC]}${8 - toR}`;
    setHistory((prev) => [...prev.slice(-8), notation]);

    setBoard(newBoard);
    setSelectedSquare(null);
    setValidMoves([]);

    const nextTurn = movingColor === 'w' ? 'b' : 'w';
    setTurn(nextTurn);

    // AI move trigger
    if (vsAI && nextTurn === 'b') {
      setTimeout(() => {
        handleAIMove(newBoard);
      }, 500);
    }
  };

  const handleSquareClick = (r: number, c: number) => {
    if (winner) return;
    if (vsAI && turn === 'b') return; // AI is thinking

    const clickedPiece = board[r][c];

    // If already selected and clicking a valid destination
    if (selectedSquare) {
      const isTargetValid = validMoves.some((m) => m.r === r && m.c === c);
      if (isTargetValid) {
        executeMove(selectedSquare.r, selectedSquare.c, r, c, board, turn);
        return;
      }
    }

    // If clicking own piece
    if (clickedPiece && clickedPiece.color === turn) {
      setSelectedSquare({ r, c });
      const moves = getLegalMoves(r, c, board);
      setValidMoves(moves);
      Sound.playClick();
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const resetGame = () => {
    Sound.playClick();
    setBoard(INITIAL_BOARD.map((r) => [...r]));
    setTurn('w');
    setSelectedSquare(null);
    setValidMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setHistory([]);
    setWinner(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-3 bg-slate-900 select-none overflow-hidden">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-2">
        <div className="flex bg-slate-800 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setVsAI(true)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              vsAI ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            vs Chess AI 🤖
          </button>
          <button
            onClick={() => setVsAI(false)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              !vsAI ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pass & Play 👥
          </button>
        </div>

        <button
          onClick={resetGame}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-white/10"
        >
          Reset Game
        </button>
      </div>

      {/* Captured Trays */}
      <div className="w-full max-w-md flex items-center justify-between px-2 text-sm text-slate-400 mb-1">
        <div>
          Black Captured:{' '}
          <span className="text-white text-base">
            {capturedWhite.map((t, i) => PIECE_SYMBOLS['w' + t] || t).join(' ')}
          </span>
        </div>
        <div>
          White Captured:{' '}
          <span className="text-amber-400 text-base">
            {capturedBlack.map((t, i) => PIECE_SYMBOLS['b' + t] || t).join(' ')}
          </span>
        </div>
      </div>

      {/* 8x8 Chessboard */}
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
                className={`relative flex items-center justify-center text-3xl transition-colors ${
                  isSelected
                    ? 'bg-amber-400/80 ring-2 ring-amber-300'
                    : isDark
                    ? 'bg-slate-800'
                    : 'bg-slate-300 text-slate-950'
                }`}
              >
                {cell && (
                  <span
                    className={`drop-shadow ${
                      cell.color === 'w' ? 'text-amber-100' : 'text-slate-950'
                    }`}
                  >
                    {PIECE_SYMBOLS[`${cell.color}${cell.type}`]}
                  </span>
                )}

                {/* Valid move target indicator */}
                {isValidDestination && (
                  <div
                    className={`absolute rounded-full ${
                      cell ? 'w-full h-full border-4 border-emerald-400/80' : 'w-3 h-3 bg-emerald-400'
                    }`}
                  />
                )}
              </button>
            );
          })
        )}

        {/* Winner Modal */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center z-10">
            <div className="text-4xl mb-2">👑</div>
            <h3 className="text-2xl font-black text-amber-400 mb-1">Checkmate!</h3>
            <p className="text-slate-200 text-sm mb-4">{winner}</p>
            <button
              onClick={resetGame}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl shadow-lg"
            >
              Play Rematch
            </button>
          </div>
        )}
      </div>

      {/* Turn indicator & History */}
      <div className="w-full max-w-md flex items-center justify-between mt-3 text-xs text-slate-400">
        <div>
          Turn:{' '}
          <span className={`font-bold ${turn === 'w' ? 'text-amber-300' : 'text-purple-400'}`}>
            {turn === 'w' ? 'White (You)' : vsAI ? 'Black (AI thinking...)' : 'Black'}
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]">
          {history[history.length - 1] || 'No moves yet'}
        </div>
      </div>
    </div>
  );
};
