export type GameCategory =
  | 'All'
  | 'Racing'
  | 'Action'
  | 'Adventure'
  | 'Puzzle'
  | 'Sports'
  | 'Arcade'
  | 'Strategy'
  | 'Multiplayer-style';

export interface GameItem {
  id: string;
  title: string;
  slug: string;
  category: GameCategory;
  description: string;
  instructions: string[];
  controls: { key: string; action: string }[];
  rating: number; // e.g. 4.8
  playCount: number; // e.g. 142000
  badge?: 'Popular' | 'New' | 'Hot' | 'Trending';
  thumbnailUrl?: string; // photo or illustration
  accentColor: string; // Tailwind gradient/color e.g. from-indigo-500 to-purple-600
  secondaryColor: string;
  iconName: string;
  featured?: boolean;
}

export interface UserGameStats {
  favorites: string[]; // game IDs
  recentlyPlayed: string[]; // game IDs in order
  highScores: Record<string, number>;
}
