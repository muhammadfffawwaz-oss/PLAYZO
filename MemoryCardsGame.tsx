import React, { useState, useEffect } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

const ICONS = ['🎮', '🚀', '⭐', '💎', '👑', '🔥', '⚡', '🏆', '👾', '🎯', '⚔️', '🛡️'];

export const MemoryCardsGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const [difficulty, setDifficulty] = useState<12 | 16 | 24>(16);
  const [cards, setCards] = useState<{ id: number; symbol: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [won, setWon] = useState(false);

  const initGame = (numCards: 12 | 16 | 24) => {
    Sound.playClick();
    const pairsCount = numCards / 2;
    const selectedIcons = ICONS.slice(0, pairsCount);
    const deck = [...selectedIcons, ...selectedIcons]
      .sort(() => Math.random() - 0.5)
      .map((symbol, id) => ({
        id,
        symbol,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setIsPlaying(true);
    setWon(false);
  };

  useEffect(() => {
    initGame(difficulty);
  }, [difficulty]);

  // Timer
  useEffect(() => {
    if (!isPlaying || won) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isPlaying, won]);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length >= 2 || cards[index].isFlipped || cards[index].isMatched) return;

    Sound.playClick();
    const nextCards = [...cards];
    nextCards[index].isFlipped = true;
    setCards(nextCards);

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = nextFlipped;

      if (cards[firstIdx].symbol === cards[secondIdx].symbol) {
        // Match!
        setTimeout(() => {
          Sound.playWin();
          nextCards[firstIdx].isMatched = true;
          nextCards[secondIdx].isMatched = true;
          setCards([...nextCards]);
          setFlippedIndices([]);
          setMatches((m) => {
            const nextM = m + 1;
            const currentScore = nextM * 100 - moves * 5;
            onScoreUpdate?.(Math.max(10, currentScore));
            if (nextM === difficulty / 2) {
              setWon(true);
              setIsPlaying(false);
              confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
              onGameOver?.(Math.max(100, 1000 - moves * 20 - seconds * 5));
            }
            return nextM;
          });
        }, 350);
      } else {
        // No match, flip back
        setTimeout(() => {
          nextCards[firstIdx].isFlipped = false;
          nextCards[secondIdx].isFlipped = false;
          setCards([...nextCards]);
          setFlippedIndices([]);
        }, 850);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 select-none overflow-hidden">
      {/* Top HUD */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <div className="flex bg-slate-800 p-1 rounded-xl border border-white/10">
          {[12, 16, 24].map((size) => (
            <button
              key={size}
              onClick={() => {
                setDifficulty(size as 12 | 16 | 24);
                initGame(size as 12 | 16 | 24);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                difficulty === size ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {size} Cards
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="bg-slate-800/90 border border-white/10 px-3 py-1 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 font-bold">MOVES</div>
            <div className="text-sm font-extrabold text-white font-mono">{moves}</div>
          </div>
          <div className="bg-slate-800/90 border border-white/10 px-3 py-1 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 font-bold">TIME</div>
            <div className="text-sm font-extrabold text-cyan-400 font-mono">{seconds}s</div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div
        className={`w-full max-w-md grid gap-2.5 ${
          difficulty === 12
            ? 'grid-cols-4 grid-rows-3 aspect-[4/3]'
            : difficulty === 16
            ? 'grid-cols-4 grid-rows-4 aspect-square'
            : 'grid-cols-6 grid-rows-4 aspect-[6/4]'
        }`}
      >
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(idx)}
            className={`rounded-xl flex items-center justify-center text-3xl font-bold transition-all duration-300 transform perspective-500 ${
              card.isMatched
                ? 'bg-emerald-600/30 border-2 border-emerald-500 scale-95 opacity-80'
                : card.isFlipped
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 rotate-y-180'
                : 'bg-slate-800 hover:bg-slate-700/80 border border-white/10 shadow-md active:scale-95'
            }`}
          >
            {card.isFlipped || card.isMatched ? card.symbol : '❓'}
          </button>
        ))}
      </div>

      {/* Win Modal */}
      {won && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-3xl font-extrabold text-white mb-1">Board Cleared!</h2>
          <p className="text-slate-300 text-sm mb-4">Flawless memory recall!</p>
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 mb-6 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Moves</span>
              <span className="font-bold text-white font-mono">{moves}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Time Elapsed</span>
              <span className="font-bold text-cyan-400 font-mono">{seconds} seconds</span>
            </div>
          </div>
          <button
            onClick={() => initGame(difficulty)}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
