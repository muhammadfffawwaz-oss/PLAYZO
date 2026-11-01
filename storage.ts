import { UserGameStats } from '../types';

const STORAGE_KEY_STATS = 'playzo_user_stats';
const STORAGE_KEY_THEME = 'playzo_theme';

export function loadUserStats(): UserGameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : ['subway-runner', 'car-racing', 'puzzle-2048'],
        recentlyPlayed: Array.isArray(parsed.recentlyPlayed) ? parsed.recentlyPlayed : [],
        highScores: typeof parsed.highScores === 'object' && parsed.highScores !== null ? parsed.highScores : {},
      };
    }
  } catch (e) {
    console.error('Failed to load user stats from localStorage:', e);
  }
  return {
    favorites: ['subway-runner', 'car-racing', 'puzzle-2048'],
    recentlyPlayed: [],
    highScores: {},
  };
}

export function saveUserStats(stats: UserGameStats): void {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save user stats to localStorage:', e);
  }
}

export function recordPlayedGame(gameId: string): UserGameStats {
  const current = loadUserStats();
  const nextRecent = [gameId, ...current.recentlyPlayed.filter((id) => id !== gameId)].slice(0, 12);
  const updated = {
    ...current,
    recentlyPlayed: nextRecent,
  };
  saveUserStats(updated);
  return updated;
}

export function toggleFavoriteGame(gameId: string): UserGameStats {
  const current = loadUserStats();
  const exists = current.favorites.includes(gameId);
  const nextFavs = exists
    ? current.favorites.filter((id) => id !== gameId)
    : [gameId, ...current.favorites];
  const updated = {
    ...current,
    favorites: nextFavs,
  };
  saveUserStats(updated);
  return updated;
}

export function saveHighScore(gameId: string, score: number): { stats: UserGameStats; isNewRecord: boolean } {
  const current = loadUserStats();
  const previous = current.highScores[gameId] || 0;
  if (score > previous) {
    const updated = {
      ...current,
      highScores: {
        ...current.highScores,
        [gameId]: score,
      },
    };
    saveUserStats(updated);
    return { stats: updated, isNewRecord: true };
  }
  return { stats: current, isNewRecord: false };
}

export function getThemePreference(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    // Default to dark for gaming portal aesthetic
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function setThemePreference(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch {}
}
