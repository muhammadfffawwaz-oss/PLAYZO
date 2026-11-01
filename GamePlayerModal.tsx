import React, { useState, useRef, useEffect } from 'react';
import { GameItem } from '../types';
import { GAME_COMPONENTS } from './GameRegistry';
import { ArrowLeft, Maximize2, Minimize2, RotateCcw, Heart, Info, Star, Share2, Volume2, VolumeX } from 'lucide-react';
import { Sound } from '../utils/sound';
import { saveHighScore } from '../utils/storage';
import { MusicPlayerControl } from './MusicPlayerControl';

interface GamePlayerModalProps {
  game: GameItem;
  allGames: GameItem[];
  isFavorite: boolean;
  onBack: () => void;
  onSelectGame: (gameId: string) => void;
  onToggleFavorite: (gameId: string) => void;
}

export const GamePlayerModal: React.FC<GamePlayerModalProps> = ({
  game,
  allGames,
  isFavorite,
  onBack,
  onSelectGame,
  onToggleFavorite,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameKey, setGameKey] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isMuted, setIsMuted] = useState(Sound.isMuted());

  // Load existing high score
  useEffect(() => {
    try {
      const raw = localStorage.getItem('playzo_user_stats');
      if (raw) {
        const parsed = JSON.parse(raw);
        setHighScore(parsed.highScores?.[game.id] || 0);
      }
    } catch {}
    setCurrentScore(0);
  }, [game.id, gameKey]);

  // Handle score updates from games
  const handleScoreUpdate = (score: number) => {
    setCurrentScore(score);
    const { stats, isNewRecord } = saveHighScore(game.id, score);
    if (isNewRecord) {
      setHighScore(score);
    }
  };

  const handleGameOver = (finalScore: number) => {
    saveHighScore(game.id, finalScore);
  };

  const restartGame = () => {
    Sound.playClick();
    setGameKey((k) => k + 1);
  };

  const toggleFullscreen = () => {
    Sound.playClick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    Sound.setMuted(next);
  };

  const handleShare = () => {
    Sound.playClick();
    navigator.clipboard?.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const GameComponent = GAME_COMPONENTS[game.id];

  // Related games (same category or popular)
  const relatedGames = allGames.filter((g) => g.id !== game.id).slice(0, 6);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-950 text-white flex flex-col transition-colors selection:bg-purple-500 selection:text-white"
    >
      {/* Top Game Player Toolbar */}
      <div className="h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 z-30">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              Sound.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-white/10 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Games</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight flex items-center gap-2">
              <span>{game.title}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-purple-950 border border-purple-500/30 text-purple-300">
                {game.category}
              </span>
            </h1>
          </div>
        </div>

        {/* Center: Score & Record HUD */}
        <div className="hidden md:flex items-center gap-4">
          <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-purple-400 font-bold text-xs mr-2">CURRENT SCORE</span>
            <span className="font-mono text-base font-extrabold text-white tabular-nums">{currentScore}</span>
          </div>
          <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-amber-400 font-bold text-xs mr-2">HIGH SCORE</span>
            <span className="font-mono text-base font-extrabold text-yellow-300 tabular-nums">{highScore}</span>
          </div>
        </div>

        {/* Right: Actions (Background Music, Restart, Sound FX Mute, Favorite, Fullscreen, Share) */}
        <div className="flex items-center gap-2">
          {/* Background Music Controller */}
          <MusicPlayerControl />

          <button
            onClick={restartGame}
            title="Restart Game"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 active:scale-95 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => onToggleFavorite(game.id)}
            title={isFavorite ? 'Favorited' : 'Add to Favorites'}
            className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-white/10'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 active:scale-95 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleShare}
            title="Share Game"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 active:scale-95 transition-all relative"
          >
            <Share2 className="w-4 h-4" />
            {copiedShare && (
              <div className="absolute top-12 right-0 bg-emerald-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                Link copied!
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main Game Stage Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Game Viewport Container */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950 overflow-hidden relative">
          <div className="w-full h-full max-w-4xl max-h-[680px] flex items-center justify-center">
            {GameComponent ? (
              <GameComponent
                key={gameKey}
                onScoreUpdate={handleScoreUpdate}
                onGameOver={handleGameOver}
              />
            ) : (
              <div className="text-center p-8">
                <div className="text-4xl mb-2">🕹️</div>
                <h3 className="text-xl font-bold">Game Launching...</h3>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Game Info & Related Games (Collapsible or scrollable on right) */}
        {!isFullscreen && (
          <aside className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 sm:p-6 overflow-y-auto shrink-0 flex flex-col gap-6">
            {/* Game Description & How to Play */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>Controls & Instructions</span>
                </h3>
                <button
                  onClick={() => setShowControls(!showControls)}
                  className="text-xs text-purple-400 hover:underline font-bold"
                >
                  {showControls ? 'Hide' : 'Show'}
                </button>
              </div>

              {showControls && (
                <div className="space-y-3 mt-3 text-xs text-slate-300">
                  <p className="text-slate-400">{game.description}</p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="font-bold text-slate-200">Controls:</div>
                    {game.controls.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold text-[11px]">
                          {c.key}
                        </span>
                        <span className="text-slate-300">{c.action}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="font-bold text-slate-200 mb-1">How to Play:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      {game.instructions.map((inst, idx) => (
                        <li key={idx}>{inst}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Related Games Suggestions */}
            <div>
              <h3 className="font-extrabold text-sm text-white mb-3 flex items-center justify-between">
                <span>More Games on PLAYZO</span>
                <span className="text-xs text-purple-400 font-bold">24 Playable</span>
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                {relatedGames.map((rel) => (
                  <button
                    key={rel.id}
                    onClick={() => onSelectGame(rel.id)}
                    className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
                  >
                    <div
                      className={`w-12 h-12 rounded-lg shrink-0 flex items-center justify-center font-bold text-lg text-white bg-gradient-to-tr ${rel.accentColor} overflow-hidden`}
                    >
                      {rel.thumbnailUrl ? (
                        <img
                          src={rel.thumbnailUrl}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>🎮</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white truncate group-hover:text-purple-400 transition-colors">
                        {rel.title}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{rel.rating}</span>
                        <span>·</span>
                        <span>{rel.category}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
