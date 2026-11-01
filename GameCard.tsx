import React from 'react';
import { GameItem } from '../types';
import { Play, Heart, Star } from 'lucide-react';
import { Sound } from '../utils/sound';

interface GameCardProps {
  game: GameItem;
  isFavorite: boolean;
  onSelect: (gameId: string) => void;
  onToggleFavorite: (gameId: string) => void;
  size?: 'normal' | 'large';
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isFavorite,
  onSelect,
  onToggleFavorite,
  size = 'normal',
}) => {
  const formatPlays = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.floor(num / 1000)}K`;
    return num.toString();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Sound.playClick();
    onToggleFavorite(game.id);
  };

  return (
    <div
      onClick={() => onSelect(game.id)}
      className={`group relative rounded-3xl overflow-hidden cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col ${
        size === 'large' ? 'col-span-1 md:col-span-2 row-span-2' : ''
      }`}
    >
      {/* Thumbnail Aspect Box */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
        {game.thumbnailUrl ? (
          <img
            src={game.thumbnailUrl}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
          />
        ) : (
          /* Vibrant Thematic SVG Card Artwork Fallback */
          <div
            className={`w-full h-full bg-gradient-to-tr ${game.accentColor} flex flex-col items-center justify-center p-6 text-white text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500`}
          >
            {/* Subtle background geometric pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner text-3xl">
              {game.category === 'Racing' && '🏎️'}
              {game.category === 'Action' && '⚡'}
              {game.category === 'Sports' && '🏀'}
              {game.category === 'Puzzle' && '🧩'}
              {game.category === 'Adventure' && '⛏️'}
              {game.category === 'Strategy' && '♟️'}
              {game.category === 'Arcade' && '🕹️'}
              {game.category === 'Multiplayer-style' && '👥'}
            </div>
            <div className="relative z-10 font-black text-lg text-white drop-shadow-md tracking-tight">
              {game.title}
            </div>
          </div>
        )}

        {/* Favorite Heart Button (Top Right) */}
        <button
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md ${
            isFavorite
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40 scale-110'
              : 'bg-slate-950/40 text-white/80 hover:bg-slate-950/70 hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
        </button>

        {/* Category Label (Top Left) */}
        <div className="absolute top-3 left-3 z-10 bg-slate-950/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold text-white border border-white/10">
          {game.category}
        </div>

        {/* Play Overlay on Hover */}
        <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
          <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-2xl shadow-purple-600/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Body & Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
            {game.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
            {game.description}
          </p>
        </div>

        {/* Rating and Plays Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 font-medium">
          <div className="flex items-center gap-1 text-amber-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{game.rating}</span>
          </div>

          <div className="font-mono text-[11px]">
            {formatPlays(game.playCount)} plays
          </div>
        </div>
      </div>
    </div>
  );
};
