import React, { createContext, useContext, useEffect, useState } from 'react';
import { CalculatorMode, CalculationHistoryItem } from '../types/calculator';
import { clientCache } from '../utils/performanceCache';

interface CalculatorContextType {
  mode: CalculatorMode;
  setMode: (mode: CalculatorMode) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  angleUnit: 'deg' | 'rad';
  setAngleUnit: (unit: 'deg' | 'rad') => void;
  favorites: CalculatorMode[];
  toggleFavorite: (mode: CalculatorMode) => void;
  history: CalculationHistoryItem[];
  addHistory: (item: Omit<CalculationHistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  deleteHistoryItem: (id: string) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  performanceMode: 'fast' | 'balanced' | 'deep';
  setPerformanceMode: (mode: 'fast' | 'balanced' | 'deep') => void;
  clearCache: () => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
  reusedExpression: string | null;
  setReusedExpression: (val: string | null) => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

const DEFAULT_FAVORITES: CalculatorMode[] = ['auto', 'standard', 'scientific', 'graphing', 'ai-solver', 'unit-converter'];

export const CalculatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('omni_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Performance Mode (Fast, Balanced, Deep)
  const [performanceMode, setPerformanceModeState] = useState<'fast' | 'balanced' | 'deep'>(() => {
    const saved = localStorage.getItem('omni_perf_mode') as 'fast' | 'balanced' | 'deep';
    return saved || 'balanced';
  });

  const setPerformanceMode = (m: 'fast' | 'balanced' | 'deep') => {
    setPerformanceModeState(m);
    localStorage.setItem('omni_perf_mode', m);
  };

  const clearCache = async () => {
    clientCache.clear();
    try {
      await fetch('/api/cache/clear', { method: 'POST' });
    } catch {
      // ignore
    }
  };

  // Mode state
  const [mode, setMode] = useState<CalculatorMode>(() => {
    const saved = localStorage.getItem('omni_mode') as CalculatorMode;
    return saved || 'standard';
  });

  // Angle unit
  const [angleUnit, setAngleUnit] = useState<'deg' | 'rad'>(() => {
    return (localStorage.getItem('omni_angle_unit') as 'deg' | 'rad') || 'deg';
  });

  // Favorites
  const [favorites, setFavorites] = useState<CalculatorMode[]>(() => {
    try {
      const saved = localStorage.getItem('omni_favorites');
      return saved ? JSON.parse(saved) : DEFAULT_FAVORITES;
    } catch {
      return DEFAULT_FAVORITES;
    }
  });

  // History
  const [history, setHistory] = useState<CalculationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('omni_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Drawers and Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reusedExpression, setReusedExpression] = useState<string | null>(null);

  // Sync theme with document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('omni_theme', theme);
  }, [theme]);

  // Sync mode with local storage
  useEffect(() => {
    localStorage.setItem('omni_mode', mode);
  }, [mode]);

  // Sync angle unit
  useEffect(() => {
    localStorage.setItem('omni_angle_unit', angleUnit);
  }, [angleUnit]);

  // Sync favorites
  useEffect(() => {
    localStorage.setItem('omni_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Sync history
  useEffect(() => {
    localStorage.setItem('omni_history', JSON.stringify(history));
  }, [history]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleFavorite = (modeId: CalculatorMode) => {
    setFavorites((prev) => {
      if (prev.includes(modeId)) {
        return prev.filter((m) => m !== modeId);
      } else {
        return [...prev, modeId];
      }
    });
  };

  const addHistory = (item: Omit<CalculationHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: CalculationHistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: Date.now(),
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 99)]); // Keep last 100
  };

  const clearHistory = () => {
    setHistory([]);
    showToast('History cleared');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2500);
  };

  // Global keyboard shortcuts (Cmd+K for Command Palette, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsHistoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CalculatorContext.Provider
      value={{
        mode,
        setMode,
        theme,
        toggleTheme,
        angleUnit,
        setAngleUnit,
        favorites,
        toggleFavorite,
        history,
        addHistory,
        clearHistory,
        deleteHistoryItem,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isHistoryOpen,
        setIsHistoryOpen,
        performanceMode,
        setPerformanceMode,
        clearCache,
        toastMessage,
        showToast,
        reusedExpression,
        setReusedExpression,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
};
