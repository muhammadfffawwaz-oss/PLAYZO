/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GAMES } from './data/games';
import { GameItem, GameCategory, UserGameStats } from './types';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { GameCard } from './components/GameCard';
import { GamePlayerModal } from './components/GamePlayerModal';
import { Footer } from './components/Footer';
import {
  loadUserStats,
  recordPlayedGame,
  toggleFavoriteGame,
  getThemePreference,
  setThemePreference,
} from './utils/storage';
import { Sound } from './utils/sound';
import { Sparkles, Trophy, Flame, Clock, Heart, ArrowUpDown } from 'lucide-react';

export default function App() {
  const [userStats, setUserStats] = useState<UserGameStats>(() => loadUserStats());
  const [activeNav, setActiveNav] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'name'>('popularity');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => getThemePreference() === 'dark');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize theme & sound on mount
  useEffect(() => {
    Sound.init();
    const initialTheme = getThemePreference();
    setIsDark(initialTheme === 'dark');
    setThemePreference(initialTheme);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    setThemePreference(nextTheme);
    Sound.playClick();
  };

  const handleSelectGame = (gameId: string) => {
    Sound.playClick();
    setIsLoading(true);
    setTimeout(() => {
      const updated = recordPlayedGame(gameId);
      setUserStats(updated);
      setActiveGameId(gameId);
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  };

  const handleToggleFavorite = (gameId: string) => {
    const updated = toggleFavoriteGame(gameId);
    setUserStats(updated);
  };

  const handleRandomGame = () => {
    Sound.playClick();
    const randomPick = GAMES[Math.floor(Math.random() * GAMES.length)];
    handleSelectGame(randomPick.id);
  };

  const handleNavClick = (nav: string) => {
    Sound.playClick();
    setActiveNav(nav);
    if (nav === 'home') {
      setSelectedCategory('All');
      setSearchQuery('');
    } else if (nav === 'all') {
      setSelectedCategory('All');
    } else if (nav === 'popular') {
      setSortBy('popularity');
    }
  };

  // Filtered & Sorted Games List
  const filteredGames = useMemo(() => {
    return GAMES.filter((game) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = game.title.toLowerCase().includes(q);
        const matchesCat = game.category.toLowerCase().includes(q);
        const matchesDesc = game.description.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesDesc) return false;
      }

      // Nav Tab filter
      if (activeNav === 'favorites') {
        return userStats.favorites.includes(game.id);
      }
      if (activeNav === 'new') {
        return game.badge === 'New' || game.badge === 'Trending';
      }
      if (activeNav === 'popular') {
        return game.rating >= 4.8 || game.playCount > 300000;
      }

      // Category filter
      if (selectedCategory !== 'All' && game.category !== selectedCategory) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'popularity') return b.playCount - a.playCount;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [searchQuery, activeNav, selectedCategory, sortBy, userStats.favorites]);

  // Popular games strip for homepage
  const popularGames = useMemo(() => {
    return [...GAMES].sort((a, b) => b.playCount - a.playCount).slice(0, 8);
  }, []);

  // Recently played games
  const recentlyPlayedGames = useMemo(() => {
    return userStats.recentlyPlayed
      .map((id) => GAMES.find((g) => g.id === id))
      .filter((g): g is GameItem => g !== undefined)
      .slice(0, 6);
  }, [userStats.recentlyPlayed]);

  // Recently added / hot games
  const newGames = useMemo(() => {
    return GAMES.filter((g) => g.badge === 'New' || g.badge === 'Trending' || g.badge === 'Hot').slice(0, 6);
  }, []);

  // Active game item
  const activeGame = GAMES.find((g) => g.id === activeGameId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Loading Screen Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 animate-spin flex items-center justify-center shadow-xl shadow-purple-500/30">
            <div className="w-12 h-12 rounded-xl bg-slate-950" />
          </div>
          <p className="mt-4 text-white font-extrabold text-sm tracking-wide">LAUNCHING GAME...</p>
        </div>
      )}

      {/* Dedicated Game Player Viewport */}
      {activeGame ? (
        <GamePlayerModal
          game={activeGame}
          allGames={GAMES}
          isFavorite={userStats.favorites.includes(activeGame.id)}
          onBack={() => setActiveGameId(null)}
          onSelectGame={handleSelectGame}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : (
        /* Homepage & Portal View */
        <>
          <Navbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeNav={activeNav}
            onNavClick={handleNavClick}
            onRandomGame={handleRandomGame}
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
            favoritesCount={userStats.favorites.length}
          />

          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
            {/* 1. Large Welcome Hero Banner (Only when on home tab and not searching) */}
            {activeNav === 'home' && !searchQuery && (
              <HeroBanner
                onPlayFeatured={() => handleSelectGame('subway-runner')}
                onSelectGame={handleSelectGame}
              />
            )}

            {/* Recently Played Games Section (if user played any) */}
            {recentlyPlayedGames.length > 0 && !searchQuery && activeNav === 'home' && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-black font-heading tracking-tight text-slate-900 dark:text-white">
                      Jump Back In
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">· Recently Played</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {recentlyPlayedGames.map((game) => (
                    <GameCard
                      key={`recent-${game.id}`}
                      game={game}
                      isFavorite={userStats.favorites.includes(game.id)}
                      onSelect={handleSelectGame}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 2. Category Filter Bar */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                    {activeNav === 'favorites'
                      ? 'Your Favourites'
                      : activeNav === 'new'
                      ? 'New & Trending Releases'
                      : activeNav === 'popular'
                      ? 'Most Popular Games'
                      : 'Explore Categories'}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'})
                  </span>
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-600 dark:text-slate-300">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'popularity' | 'rating' | 'name')}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="popularity">Most Popular</option>
                    <option value="rating">Top Rated</option>
                    <option value="name">Alphabetical</option>
                  </select>
                </div>
              </div>

              {activeNav !== 'favorites' && (
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                    Sound.playClick();
                  }}
                />
              )}
            </div>

            {/* 3. Main Games Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6 mb-12">
              {filteredGames.map((game, idx) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isFavorite={userStats.favorites.includes(game.id)}
                  onSelect={handleSelectGame}
                  onToggleFavorite={handleToggleFavorite}
                  size={idx === 0 && selectedCategory === 'All' && !searchQuery ? 'normal' : 'normal'}
                />
              ))}
            </div>

            {/* Empty state for search or favorites */}
            {filteredGames.length === 0 && (
              <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 my-8 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4 text-3xl">
                  {activeNav === 'favorites' ? '💔' : '🔍'}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {activeNav === 'favorites' ? 'No Favourites Added Yet' : 'No Games Found'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
                  {activeNav === 'favorites'
                    ? 'Click the heart button on any game card to add it to your favourites list for fast access.'
                    : `No matches found for "${searchQuery}". Try searching for Subway, Racing, Chess, 2048, or Snake.`}
                </p>
                <button
                  onClick={() => {
                    setActiveNav('home');
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  View All 24 Games
                </button>
              </div>
            )}

            {/* 4. Popular Games Showcase Section (On Home Tab) */}
            {activeNav === 'home' && !searchQuery && selectedCategory === 'All' && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-black font-heading tracking-tight text-slate-900 dark:text-white">
                      Popular Games
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">· Community Favourites</span>
                  </div>
                  <button
                    onClick={() => setActiveNav('popular')}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    View All →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {popularGames.slice(0, 4).map((game) => (
                    <GameCard
                      key={`popular-${game.id}`}
                      game={game}
                      isFavorite={userStats.favorites.includes(game.id)}
                      onSelect={handleSelectGame}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 5. Recently Added / Trending Section */}
            {activeNav === 'home' && !searchQuery && selectedCategory === 'All' && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                      <Flame className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-black font-heading tracking-tight text-slate-900 dark:text-white">
                      Recently Added & Trending
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">· Hot Picks</span>
                  </div>
                  <button
                    onClick={() => setActiveNav('new')}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    See New Releases →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {newGames.map((game) => (
                    <GameCard
                      key={`new-${game.id}`}
                      game={game}
                      isFavorite={userStats.favorites.includes(game.id)}
                      onSelect={handleSelectGame}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            )}
          </main>

          <Footer
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setActiveNav('all');
            }}
            onSelectGame={handleSelectGame}
          />
        </>
      )}
    </div>
  );
}
