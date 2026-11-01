import React from 'react';
import { Gamepad2, Heart, Shield, Sparkles } from 'lucide-react';
import { CATEGORIES } from '../data/games';
import { GameCategory } from '../types';

interface FooterProps {
  onSelectCategory: (cat: GameCategory) => void;
  onSelectGame: (gameId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, onSelectGame }) => {
  return (
    <footer className="mt-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <span className="text-xl font-black font-heading tracking-tight bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 bg-clip-text text-transparent">
                PLAYZO
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              The premier online gaming platform inspired by Poki. Discover and play over 24 high-speed games instantly in your browser with no download required.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Free · Real-Time Web Play</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Game Categories
            </h4>
            <ul className="space-y-2 text-xs">
              {CATEGORIES.slice(1, 6).map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => {
                      onSelectCategory(cat);
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                    className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {cat} Games
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* More Categories */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Explore More
            </h4>
            <ul className="space-y-2 text-xs">
              {CATEGORIES.slice(6).map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => {
                      onSelectCategory(cat);
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                    className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {cat} Games
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => onSelectGame('subway-runner')}
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium text-amber-500"
                >
                  Subway Runner
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectGame('car-racing')}
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium text-cyan-500"
                >
                  Car Racing
                </button>
              </li>
            </ul>
          </div>

          {/* Platform Standards */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Platform Features
            </h4>
            <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero Installation</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                All 24 games are built on HTML5 Canvas and native JavaScript for instantaneous loading.
              </p>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              High scores and favourites are saved safely in your browser localStorage.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            © {new Date().getFullYear()} PLAYZO Gaming Platform. All 24 games fully playable.
          </div>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <span>Built with fun for gamers worldwide</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
