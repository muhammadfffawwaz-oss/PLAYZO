import React, { useState } from 'react';
import { Search, Shuffle, Heart, Moon, Sun, Volume2, VolumeX, Gamepad2, X } from 'lucide-react';
import { Sound } from '../utils/sound';
import { MusicPlayerControl } from './MusicPlayerControl';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeNav: string;
  onNavClick: (nav: string) => void;
  onRandomGame: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  favoritesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  activeNav,
  onNavClick,
  onRandomGame,
  isDark,
  onToggleTheme,
  favoritesCount,
}) => {
  const [isMuted, setIsMuted] = useState(Sound.isMuted());
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    Sound.setMuted(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            onNavClick('home');
            onSearchChange('');
          }}
          className="flex items-center gap-2.5 text-slate-900 dark:text-white shrink-0 group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight font-heading bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 bg-clip-text text-transparent">
            PLAYZO
          </span>
        </button>

        {/* Search Bar (Desktop) */}
        <div className="hidden sm:flex items-center flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search 24+ games... (e.g. Subway, Chess, 2048)"
            className="w-full pl-10 pr-9 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl text-sm border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onNavClick('home')}
            className={`whitespace-nowrap transition-colors hover:text-purple-600 dark:hover:text-purple-400 ${
              activeNav === 'home' ? 'text-purple-600 dark:text-purple-400' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavClick('all')}
            className={`whitespace-nowrap transition-colors hover:text-purple-600 dark:hover:text-purple-400 ${
              activeNav === 'all' ? 'text-purple-600 dark:text-purple-400' : ''
            }`}
          >
            All Games
          </button>
          <button
            onClick={() => onNavClick('popular')}
            className={`whitespace-nowrap transition-colors hover:text-purple-600 dark:hover:text-purple-400 ${
              activeNav === 'popular' ? 'text-purple-600 dark:text-purple-400' : ''
            }`}
          >
            Popular
          </button>
          <button
            onClick={() => onNavClick('new')}
            className={`whitespace-nowrap transition-colors hover:text-purple-600 dark:hover:text-purple-400 ${
              activeNav === 'new' ? 'text-purple-600 dark:text-purple-400' : ''
            }`}
          >
            New Games
          </button>
          <button
            onClick={() => onNavClick('favorites')}
            className={`whitespace-nowrap transition-colors hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1.5 ${
              activeNav === 'favorites' ? 'text-purple-600 dark:text-purple-400' : ''
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Favourites</span>
            {favoritesCount > 0 && (
              <span className="text-xs bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 rounded-full font-bold">
                {favoritesCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Actions (Background Music, Sound FX Mute, Theme, Random Game, Mobile Search) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="sm:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Background Music Player Control */}
          <MusicPlayerControl />

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            onClick={onRandomGame}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-md shadow-purple-500/20 active:scale-95 transition-all whitespace-nowrap"
            title="Play a surprise random game"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Random</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3 border-t border-slate-200 dark:border-slate-800 pt-2 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search 24+ games..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:outline-none"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
};
