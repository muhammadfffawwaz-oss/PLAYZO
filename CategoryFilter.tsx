import React from 'react';
import { GameCategory } from '../types';
import { CATEGORIES } from '../data/games';
import { Flame, Compass, Puzzle, Trophy, Zap, Shield, Users, Sparkles, LayoutGrid } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: GameCategory;
  onSelectCategory: (cat: GameCategory) => void;
}

const CATEGORY_ICONS: Record<GameCategory, React.ReactNode> = {
  All: <LayoutGrid className="w-4 h-4" />,
  Racing: <Flame className="w-4 h-4 text-orange-500" />,
  Action: <Zap className="w-4 h-4 text-rose-500" />,
  Adventure: <Compass className="w-4 h-4 text-emerald-500" />,
  Puzzle: <Puzzle className="w-4 h-4 text-violet-500" />,
  Sports: <Trophy className="w-4 h-4 text-amber-500" />,
  Arcade: <Sparkles className="w-4 h-4 text-yellow-500" />,
  Strategy: <Shield className="w-4 h-4 text-blue-500" />,
  'Multiplayer-style': <Users className="w-4 h-4 text-pink-500" />,
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onSelectCategory }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none no-scrollbar">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
              isSelected
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80'
            }`}
          >
            {CATEGORY_ICONS[cat]}
            <span>{cat}</span>
          </button>
        );
      })}
    </div>
  );
};
