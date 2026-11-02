import React, { useState } from 'react';
import { Sun, Moon, Search, Sparkles, Zap, Gauge, Brain, Camera } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { CalculatorMode } from '../types/calculator';
import { CameraMathSolverModal } from './camera/CameraMathSolverModal';

export const Header: React.FC = () => {
  const {
    theme,
    toggleTheme,
    mode,
    setMode,
    setIsCommandPaletteOpen,
    performanceMode,
    setPerformanceMode,
  } = useCalculator();

  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleNavClick = (targetMode: CalculatorMode) => {
    setMode(targetMode);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setMode('standard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap shrink-0 group"
        >
          <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-base shadow-sm group-hover:bg-indigo-500 transition-colors">
            ∑
          </span>
          <span className="font-extrabold tracking-tight">OmniCalc</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
            AI
          </span>
        </a>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => handleNavClick('auto')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              mode === 'auto' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Auto Mode
          </button>
          <button
            onClick={() => handleNavClick('standard')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              mode === 'standard' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => handleNavClick('scientific')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              mode === 'scientific' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Scientific
          </button>
          <button
            onClick={() => handleNavClick('graphing')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              mode === 'graphing' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Graphing
          </button>
          <button
            onClick={() => handleNavClick('financial')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              mode === 'financial' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Financial
          </button>
          <button
            onClick={() => handleNavClick('ai-solver')}
            className={`flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              mode === 'ai-solver' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            AI Solver
          </button>
        </nav>

        {/* Zone 3: Actions, performance toggle & theme toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI Performance Mode Toggle */}
          <button
            onClick={() => {
              const nextMode =
                performanceMode === 'fast'
                  ? 'balanced'
                  : performanceMode === 'balanced'
                  ? 'deep'
                  : 'fast';
              setPerformanceMode(nextMode);
            }}
            title={`AI Engine: ${
              performanceMode === 'fast'
                ? 'Fast (Sub-second low reasoning)'
                : performanceMode === 'balanced'
                ? 'Balanced (Optimal speed & derivation)'
                : 'Deep (High reasoning & proofs)'
            } - Click to switch`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            {performanceMode === 'fast' && (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="hidden sm:inline">Fast</span>
              </>
            )}
            {performanceMode === 'balanced' && (
              <>
                <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Balanced</span>
              </>
            )}
            {performanceMode === 'deep' && (
              <>
                <Brain className="w-3.5 h-3.5 text-violet-500" />
                <span className="hidden sm:inline">Deep</span>
              </>
            )}
          </button>

          {/* Camera Math Solver Quick Button */}
          <button
            onClick={() => setIsCameraOpen(true)}
            aria-label="Open AI Camera Math Solver"
            title="Scan math question with Camera or upload photo"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Camera</span>
          </button>

          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Open Command Search"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search modes</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-slate-500">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* AI Camera Solver Modal */}
      <CameraMathSolverModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onApplyMathToSolver={(mathText) => {
          setMode('ai-solver');
        }}
      />
    </header>
  );
};
