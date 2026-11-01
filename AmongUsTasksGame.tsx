import React, { useState, useEffect } from 'react';
import { Sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface GameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type TaskType = 'WIRES' | 'CARD' | 'ASTEROIDS' | 'REACTOR';

export const AmongUsTasksGame: React.FC<GameProps> = ({ onScoreUpdate, onGameOver }) => {
  const [currentTask, setCurrentTask] = useState<TaskType>('WIRES');
  const [completedTasks, setCompletedTasks] = useState<TaskType[]>([]);
  const [score, setScore] = useState(0);

  // Task 1: Wires state
  const WIRE_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#ec4899'];
  const [leftWires] = useState([0, 1, 2, 3]);
  const [rightWires] = useState(() => [2, 0, 3, 1].sort(() => Math.random() - 0.5));
  const [connections, setConnections] = useState<Record<number, number>>({});
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);

  // Task 2: Card swipe state
  const [cardX, setCardX] = useState(0);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [swipeStatus, setSwipeStatus] = useState<string>('Swipe ID card from left to right.');
  const [swipeStartTime, setSwipeStartTime] = useState(0);

  // Task 3: Asteroids state
  const [asteroids, setAsteroids] = useState<{ id: number; x: number; y: number; r: number }[]>(() =>
    Array(12)
      .fill(0)
      .map((_, i) => ({
        id: i,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        r: 16 + Math.random() * 12,
      }))
  );

  // Task 4: Reactor keypad sequence state
  const [sequence, setSequence] = useState<number[]>([1, 4, 2, 8, 5]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [showingSequence, setShowingSequence] = useState(false);
  const [activeFlash, setActiveFlash] = useState<number | null>(null);

  const markTaskComplete = (task: TaskType) => {
    Sound.playWin();
    confetti({ particleCount: 45, spread: 55 });
    setCompletedTasks((prev) => {
      const next = [...prev, task];
      const newScore = next.length * 250;
      setScore(newScore);
      onScoreUpdate?.(newScore);

      if (next.length === 4) {
        onGameOver?.(1000);
      }
      return next;
    });
  };

  // Switch to reactor keypad playback
  const playReactorSequence = () => {
    setShowingSequence(true);
    setPlayerInput([]);
    sequence.forEach((num, idx) => {
      setTimeout(() => {
        setActiveFlash(num);
        Sound.playTone(300 + num * 60, 0.15);
        setTimeout(() => setActiveFlash(null), 250);
        if (idx === sequence.length - 1) setShowingSequence(false);
      }, (idx + 1) * 450);
    });
  };

  // Wire connect click
  const handleRightWireClick = (rightColorIdx: number) => {
    if (selectedLeft === null) return;
    if (selectedLeft === rightColorIdx) {
      Sound.playCoin();
      const updated = { ...connections, [selectedLeft]: rightColorIdx };
      setConnections(updated);
      setSelectedLeft(null);

      if (Object.keys(updated).length === 4) {
        markTaskComplete('WIRES');
      }
    } else {
      Sound.playHit();
      setSelectedLeft(null);
    }
  };

  // Card Swipe
  const handleCardDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCard) return;
    const parent = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!parent) return;
    const relX = Math.max(0, Math.min(260, e.clientX - parent.left - 40));
    setCardX(relX);

    if (relX >= 240) {
      setIsDraggingCard(false);
      const duration = Date.now() - swipeStartTime;
      if (duration < 300) {
        setSwipeStatus('Too fast! Try normal speed.');
        Sound.playHit();
        setCardX(0);
      } else if (duration > 1100) {
        setSwipeStatus('Too slow! Swipe steadily.');
        Sound.playHit();
        setCardX(0);
      } else {
        setSwipeStatus('ACCEPTED! Access Granted.');
        markTaskComplete('CARD');
      }
    }
  };

  // Destroy Asteroid
  const blastAsteroid = (id: number) => {
    Sound.playExplosion();
    const remaining = asteroids.filter((a) => a.id !== id);
    setAsteroids(remaining);
    if (remaining.length === 0) {
      markTaskComplete('ASTEROIDS');
    }
  };

  // Reactor button press
  const handleKeypadPress = (num: number) => {
    if (showingSequence || completedTasks.includes('REACTOR')) return;
    Sound.playTone(300 + num * 60, 0.12);
    const nextInput = [...playerInput, num];
    setPlayerInput(nextInput);

    const step = nextInput.length - 1;
    if (sequence[step] !== num) {
      Sound.playLose();
      setPlayerInput([]);
      return;
    }

    if (nextInput.length === sequence.length) {
      markTaskComplete('REACTOR');
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 select-none overflow-hidden">
      {/* Top HUD: Tasks list & Ship status */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            SPACE CREW <span className="text-xs bg-red-600 px-2 py-0.5 rounded-lg">TASK STATION</span>
          </h2>
          <div className="text-xs text-slate-400">
            Total Tasks: <span className="font-bold text-emerald-400">{completedTasks.length} / 4</span>
          </div>
        </div>

        {/* Task Switcher Tabs */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-white/10 gap-1">
          {(['WIRES', 'CARD', 'ASTEROIDS', 'REACTOR'] as TaskType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setCurrentTask(t);
                Sound.playClick();
                if (t === 'REACTOR' && !completedTasks.includes('REACTOR')) {
                  setTimeout(playReactorSequence, 400);
                }
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                currentTask === t ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'WIRES' ? '🔌 Wires' : t === 'CARD' ? '💳 Card' : t === 'ASTEROIDS' ? '☄️ Blaster' : '🔢 Reactor'}
              {completedTasks.includes(t) && <span className="text-emerald-400 font-bold">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Task Station Container */}
      <div className="w-full max-w-lg aspect-[4/3] bg-slate-950 p-6 rounded-3xl border-4 border-slate-700 shadow-2xl flex flex-col items-center justify-center relative">
        {/* TASK 1: FIX WIRES */}
        {currentTask === 'WIRES' && (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="text-center text-xs font-bold text-slate-300">
              Click a left colored wire terminal, then click the matching right socket!
            </div>
            <div className="flex justify-between items-center px-8 flex-1">
              {/* Left wire terminals */}
              <div className="space-y-6">
                {leftWires.map((colorIdx) => {
                  const isConnected = connections[colorIdx] !== undefined;
                  const isSelected = selectedLeft === colorIdx;
                  return (
                    <button
                      key={colorIdx}
                      onClick={() => {
                        setSelectedLeft(colorIdx);
                        Sound.playClick();
                      }}
                      className={`w-16 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white transition-all ${
                        isSelected ? 'ring-4 ring-white scale-110' : ''
                      } ${isConnected ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: WIRE_COLORS[colorIdx] }}
                    >
                      {isConnected ? '✓' : 'PORT'}
                    </button>
                  );
                })}
              </div>

              {/* Right wire sockets */}
              <div className="space-y-6">
                {rightWires.map((colorIdx) => {
                  const isConnected = Object.values(connections).includes(colorIdx);
                  return (
                    <button
                      key={colorIdx}
                      onClick={() => handleRightWireClick(colorIdx)}
                      className={`w-16 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white transition-all ${
                        isConnected ? 'ring-2 ring-emerald-400' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: WIRE_COLORS[colorIdx] }}
                    >
                      {isConnected ? 'LOCKED' : 'CONNECT'}
                    </button>
                  );
                })}
              </div>
            </div>
            {completedTasks.includes('WIRES') && (
              <div className="text-center font-bold text-emerald-400 text-sm">ELECTRICAL RESTORED! ✓</div>
            )}
          </div>
        )}

        {/* TASK 2: SWIPE CARD */}
        {currentTask === 'CARD' && (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
            <div className="text-center text-sm font-bold text-slate-300">{swipeStatus}</div>

            {/* Card Reader scanner slot */}
            <div
              onMouseMove={handleCardDrag}
              onMouseUp={() => setIsDraggingCard(false)}
              className="w-80 h-32 bg-slate-900 border-2 border-slate-700 rounded-2xl relative p-4 overflow-hidden flex items-center"
            >
              {/* Reader stripe */}
              <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-950 -translate-y-1/2" />

              {/* Draggable Card */}
              <div
                onMouseDown={() => {
                  setIsDraggingCard(true);
                  setSwipeStartTime(Date.now());
                  Sound.playClick();
                }}
                className="w-24 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg border border-white/20 p-2 text-white font-bold text-[10px] cursor-grab active:cursor-grabbing absolute select-none flex flex-col justify-between"
                style={{ transform: `translateX(${cardX}px)` }}
              >
                <div className="flex justify-between items-center">
                  <span>CREW ID</span>
                  <span>🚀</span>
                </div>
                <div className="text-[8px] text-cyan-200">MUHAMMAD</div>
              </div>
            </div>

            <button
              onClick={() => {
                setCardX(0);
                setSwipeStatus('Swipe ID card from left to right.');
              }}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Reset Card Position
            </button>
          </div>
        )}

        {/* TASK 3: CLEAR ASTEROIDS */}
        {currentTask === 'ASTEROIDS' && (
          <div className="w-full h-full relative rounded-2xl bg-slate-900 border-2 border-slate-800 overflow-hidden cursor-crosshair">
            <div className="absolute top-2 left-3 text-xs font-bold text-emerald-400 z-10">
              TARGET RADAR: {asteroids.length} REMAINING
            </div>

            {/* Radar scanner sweep */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            {/* Asteroids */}
            {asteroids.map((ast) => (
              <button
                key={ast.id}
                onClick={() => blastAsteroid(ast.id)}
                className="absolute rounded-full bg-gradient-to-tr from-amber-800 to-amber-600 border border-amber-400/50 shadow-md hover:scale-125 transition-transform flex items-center justify-center text-xs"
                style={{
                  left: `${ast.x}%`,
                  top: `${ast.y}%`,
                  width: `${ast.r * 2}px`,
                  height: `${ast.r * 2}px`,
                }}
              >
                ☄️
              </button>
            ))}

            {asteroids.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center font-black text-emerald-400 text-xl">
                ALL ASTEROIDS CLEARED! ✓
              </div>
            )}
          </div>
        )}

        {/* TASK 4: REACTOR KEYPAD */}
        {currentTask === 'REACTOR' && (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center justify-between w-64 text-xs font-bold text-slate-300">
              <span>{showingSequence ? 'Memorize lights...' : 'Replicate sequence!'}</span>
              <button onClick={playReactorSequence} className="text-cyan-400 hover:underline">
                Replay 🔁
              </button>
            </div>

            {/* 3x3 Keypad */}
            <div className="grid grid-cols-3 gap-3 w-64 aspect-square">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isFlashing = activeFlash === num;
                return (
                  <button
                    key={num}
                    onClick={() => handleKeypadPress(num)}
                    className={`rounded-2xl font-black text-xl transition-all shadow-md ${
                      isFlashing
                        ? 'bg-cyan-400 text-slate-950 scale-105 shadow-cyan-400/60 ring-4 ring-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {completedTasks.includes('REACTOR') && (
              <div className="text-emerald-400 font-bold text-sm">REACTOR OVERRIDE READY! ✓</div>
            )}
          </div>
        )}

        {/* All tasks finished celebration banner */}
        {completedTasks.length === 4 && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="text-5xl mb-2">🏆</div>
            <h3 className="text-2xl font-black text-emerald-400 mb-1">Spaceship Fully Repaired!</h3>
            <p className="text-slate-300 text-sm mb-4">You foiled the impostor and saved the crew!</p>
            <button
              onClick={() => {
                setCompletedTasks([]);
                setConnections({});
                setCurrentTask('WIRES');
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg"
            >
              Play Another Shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
