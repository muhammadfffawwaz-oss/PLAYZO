import React from 'react';
import { Play, Sparkles, Trophy, Zap, Flame } from 'lucide-react';
import { HERO_BANNER_IMAGE } from '../data/games';

interface HeroBannerProps {
  onPlayFeatured: () => void;
  onSelectGame: (gameId: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onPlayFeatured, onSelectGame }) => {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-purple-500/20 text-white shadow-2xl mb-8">
      {/* Background Graphic Scrim & Illumination */}
      <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
        <img
          src={HERO_BANNER_IMAGE}
          alt="PLAYZO Gaming World"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Content */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="max-w-2xl text-center lg:text-left">
          {/* Natural kicker */}
          <div className="inline-flex items-center gap-2 text-xs font-bold text-purple-300 mb-3 tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Welcome to PLAYZO Online Playground</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-heading tracking-tight text-white mb-4 leading-tight">
            PLAY MORE. HAVE FUN.{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              REPEAT.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 mb-8 max-w-xl">
            Discover your next favourite game. Play instantly for free! Over 24 exciting browser games with zero downloads or installations.
          </p>

          {/* Action Button & Quick Highlights */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <button
              onClick={onPlayFeatured}
              className="px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-purple-600/30 flex items-center gap-3 transform hover:scale-105 active:scale-95 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
              </div>
              <span>Play Now</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>24+ Games</span>
              </span>
              <span className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instant Play</span>
              </span>
              <span className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>No Downloads</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Feature Showcase Card Strip */}
        <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
          <div
            onClick={() => onSelectGame('subway-runner')}
            className="group cursor-pointer p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 flex items-center gap-4 transition-all hover:scale-102"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-orange-500">
              <img
                src="/src/assets/images/thumb_subway_runner_1793551139720.jpg"
                alt="Subway Runner"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Featured Action</div>
              <div className="text-sm font-extrabold text-white">Subway Runner 3D</div>
              <div className="text-[11px] text-slate-300">Dodge trains & collect coins</div>
            </div>
          </div>

          <div
            onClick={() => onSelectGame('car-racing')}
            className="group cursor-pointer p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 flex items-center gap-4 transition-all hover:scale-102"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-purple-600">
              <img
                src="/src/assets/images/thumb_car_racing_1793551139912.jpg"
                alt="Car Racing"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Top Speed</div>
              <div className="text-sm font-extrabold text-white">Car Racing: Cyber Drift</div>
              <div className="text-[11px] text-slate-300">Nitro rush on highway</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
