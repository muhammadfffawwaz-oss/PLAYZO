import React, { useState, useEffect, useRef } from 'react';
import { Music, TRACKS } from '../utils/music';
import { Play, Pause, Volume2, VolumeX, Music as MusicIcon, ChevronRight, Disc } from 'lucide-react';

export const MusicPlayerControl: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(Music.getIsPlaying());
  const [isMuted, setIsMuted] = useState(Music.getIsMuted());
  const [volume, setVolume] = useState(Music.getVolume());
  const [currentTrack, setCurrentTrack] = useState(Music.getCurrentTrack());
  const [isOpen, setIsOpen] = useState(false);
  const [visualizerBars, setVisualizerBars] = useState<number[]>([20, 50, 80, 45, 25]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Sync state with Music engine
  useEffect(() => {
    const unsubscribe = Music.subscribe(() => {
      setIsPlaying(Music.getIsPlaying());
      setIsMuted(Music.getIsMuted());
      setVolume(Music.getVolume());
      setCurrentTrack(Music.getCurrentTrack());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Visualizer loop when playing
  useEffect(() => {
    let animId = 0;
    const updateVisualizer = () => {
      if (Music.getIsPlaying() && !Music.getIsMuted()) {
        const data = Music.getVisualizerData();
        setVisualizerBars(data);
      } else {
        setVisualizerBars([6, 6, 6, 6, 6]);
      }
      animId = requestAnimationFrame(updateVisualizer);
    };
    animId = requestAnimationFrame(updateVisualizer);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    Music.togglePlay();
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    Music.toggleMute();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    Music.setVolume(val);
  };

  return (
    <div ref={panelRef} className="relative shrink-0">
      {/* Top Bar Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 text-xs font-bold ${
          isPlaying && !isMuted
            ? 'bg-gradient-to-r from-purple-600/15 to-indigo-600/15 border-purple-500/40 text-purple-600 dark:text-purple-300 shadow-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        title="Background Music Settings"
      >
        {/* Quick Play/Pause Mini Toggle */}
        <div
          onClick={handleTogglePlay}
          className="w-5 h-5 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
          title={isPlaying ? 'Pause Music' : 'Play Music'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </div>

        {/* Animated Visualizer Bars */}
        <div className="flex items-end gap-0.5 h-3.5 w-5">
          {visualizerBars.map((h, i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full transition-all duration-75 ${
                isPlaying && !isMuted
                  ? 'bg-purple-600 dark:bg-purple-400'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              style={{
                height: `${isPlaying && !isMuted ? Math.max(15, h) : 20}%`,
              }}
            />
          ))}
        </div>

        {/* Label */}
        <span className="hidden sm:inline font-mono text-[11px] font-bold">
          {isPlaying ? (isMuted ? 'Muted' : 'Music') : 'Music Off'}
        </span>
      </button>

      {/* Floating Music Control Flyout Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-72 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
          {/* Header Track Info */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                isPlaying && !isMuted
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 animate-spin-slow'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Disc className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentTrack.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {currentTrack.description}
              </div>
            </div>
          </div>

          {/* Controls: Play/Pause, Next Track, Mute */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleTogglePlay}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isPlaying
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Music</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Arcade Music</span>
                </>
              )}
            </button>

            <button
              onClick={() => Music.nextTrack()}
              className="ml-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Next Track"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Slider & Mute Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Volume</span>
              <span className="font-mono text-[11px]">
                {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleMute}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 accent-purple-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Track Selection Radios */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Soundtrack
            </div>
            <div className="space-y-1">
              {TRACKS.map((t, idx) => {
                const isSelected = currentTrack.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => Music.setTrack(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/50 font-bold text-purple-600 dark:text-purple-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{t.bpm} BPM</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
