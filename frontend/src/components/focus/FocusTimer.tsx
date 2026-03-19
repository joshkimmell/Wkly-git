import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export type TimerState = 'idle' | 'running' | 'paused';

interface Props {
  elapsed: number; // seconds
  state: TimerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const FocusTimer: React.FC<Props> = ({ elapsed, state, onStart, onPause, onResume, onReset }) => {
  const circumference = 2 * Math.PI * 54;
  // Progress: each "lap" is 25 minutes (Pomodoro-style visual)
  const lapSeconds = 25 * 60;
  const progress = (elapsed % lapSeconds) / lapSeconds;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Circular progress ring */}
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-700 dark:text-gray-800" />
          {/* Progress */}
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="text-violet-500 transition-all duration-1000"
          />
        </svg>
        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-mono font-bold text-gray-90 dark:text-white tabular-nums">
            {formatTime(elapsed)}
          </span>
          <span className="text-xs text-secondary-text capitalize mt-0.5">{state === 'idle' ? 'ready' : state}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {state === 'idle' && (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" /> Start
          </button>
        )}
        {state === 'running' && (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            <Pause className="w-4 h-4" /> Pause
          </button>
        )}
        {state === 'paused' && (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" /> Resume
          </button>
        )}
        {state !== 'idle' && (
          <button
            onClick={onReset}
            title="Reset timer"
            className="p-2 rounded-full hover:bg-gray-700 text-secondary-text transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {elapsed > 0 && (
        <p className="text-xs text-secondary-text text-center">
          {Math.floor(elapsed / lapSeconds) > 0 && (
            <span>{Math.floor(elapsed / lapSeconds)} × 25 min lap{Math.floor(elapsed / lapSeconds) > 1 ? 's' : ''} · </span>
          )}
          Total: {formatTime(elapsed)}
        </p>
      )}
    </div>
  );
};

export default FocusTimer;
