import React from 'react';
import { SubwayRunnerGame } from '../games/SubwayRunnerGame';
import { CarRacingGame } from '../games/CarRacingGame';
import { MotoRacingGame } from '../games/MotoRacingGame';
import { BasketballStarsGame } from '../games/BasketballStarsGame';
import { FootballChallengeGame } from '../games/FootballChallengeGame';
import { Puzzle2048Game } from '../games/Puzzle2048Game';
import { TicTacToeGame } from '../games/TicTacToeGame';
import { SnakeGame } from '../games/SnakeGame';
import { FlappyBirdGame } from '../games/FlappyBirdGame';
import { BubbleShooterGame } from '../games/BubbleShooterGame';
import { MinecraftBuilderGame } from '../games/MinecraftBuilderGame';
import { SpaceShooterGame } from '../games/SpaceShooterGame';
import { FruitNinjaGame } from '../games/FruitNinjaGame';
import { ChessGame } from '../games/ChessGame';
import { CheckersGame } from '../games/CheckersGame';
import { MemoryCardsGame } from '../games/MemoryCardsGame';
import { EndlessRunnerGame } from '../games/EndlessRunnerGame';
import { TowerDefenseGame } from '../games/TowerDefenseGame';
import { MazeEscapeGame } from '../games/MazeEscapeGame';
import { ArcheryChallengeGame } from '../games/ArcheryChallengeGame';
import { AmongUsTasksGame } from '../games/AmongUsTasksGame';
import { ColorSwitchGame } from '../games/ColorSwitchGame';
import { PlatformJumperGame } from '../games/PlatformJumperGame';
import { ZombieSurvivalGame } from '../games/ZombieSurvivalGame';

interface GameComponentProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

export const GAME_COMPONENTS: Record<string, React.FC<GameComponentProps>> = {
  'subway-runner': SubwayRunnerGame,
  'car-racing': CarRacingGame,
  'moto-racing': MotoRacingGame,
  'basketball-stars': BasketballStarsGame,
  'football-challenge': FootballChallengeGame,
  'puzzle-2048': Puzzle2048Game,
  'tic-tac-toe': TicTacToeGame,
  'snake-game': SnakeGame,
  'flappy-bird': FlappyBirdGame,
  'bubble-shooter': BubbleShooterGame,
  'minecraft-builder': MinecraftBuilderGame,
  'space-shooter': SpaceShooterGame,
  'fruit-ninja': FruitNinjaGame,
  'chess': ChessGame,
  'checkers': CheckersGame,
  'memory-cards': MemoryCardsGame,
  'endless-runner': EndlessRunnerGame,
  'tower-defense': TowerDefenseGame,
  'maze-escape': MazeEscapeGame,
  'archery-challenge': ArcheryChallengeGame,
  'among-us-tasks': AmongUsTasksGame,
  'color-switch': ColorSwitchGame,
  'platform-jumper': PlatformJumperGame,
  'zombie-survival': ZombieSurvivalGame,
};
