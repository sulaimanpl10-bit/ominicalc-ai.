import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Star,
  History,
  RotateCcw,
  Sparkles,
  Calculator,
  Compass,
  LineChart,
  Repeat,
  DollarSign,
  Percent,
  Calendar,
  Binary,
  Shapes,
  BarChart2,
  Grid3X3,
  Divide,
  Scale,
  Hash,
  Wand2,
} from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { CALCULATOR_MODES } from '../utils/modesConfig';
import { CalculatorMode } from '../types/calculator';

const MODE_ICONS: Record<CalculatorMode, React.ReactNode> = {
  auto: <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
  standard: <Calculator className="w-4 h-4" />,
  scientific: <Compass className="w-4 h-4" />,
  graphing: <LineChart className="w-4 h-4" />,
  'ai-solver': <Sparkles className="w-4 h-4 text-indigo-500" />,
  'unit-converter': <Repeat className="w-4 h-4" />,
  currency: <DollarSign className="w-4 h-4" />,
  percentage: <Percent className="w-4 h-4" />,
  datetime: <Calendar className="w-4 h-4" />,
  programmer: <Binary className="w-4 h-4" />,
  geometry: <Shapes className="w-4 h-4" />,
  statistics: <BarChart2 className="w-4 h-4" />,
  matrix: <Grid3X3 className="w-4 h-4" />,
  equations: <Divide className="w-4 h-4" />,
  financial: <Scale className="w-4 h-4" />,
  fractions: <Hash className="w-4 h-4" />,
};

export const ModeNavigation: React.FC = () => {
  const {
    mode,
    setMode,
    favorites,
    toggleFavorite,
    angleUnit,
    setAngleUnit,
    history,
    setIsHistoryOpen,
    showToast,
  } = useCalculator();

  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModeMeta = CALCULATOR_MODES.find((m) => m.id === mode) || CALCULATOR_MODES[0];
  const isCurrentFavorite = favorites.includes(mode);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModes = CALCULATOR_MODES.filter(
    (m) =>
      m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const categories = [
    'Core',
    'Scientific & Graphing',
    'Applied',
    'Technical',
    'Algebra & Advanced',
  ] as const;

  const handleFavoriteClick = (e: React.MouseEvent, mId: CalculatorMode) => {
    e.stopPropagation();
    toggleFavorite(mId);
    showToast(favorites.includes(mId) ? 'Removed from favorites' : 'Added to favorites');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Mode selector dropdown & favorite star */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-sm transition-all shadow-xs"
              >
                <span className="text-indigo-600 dark:text-indigo-400">
                  {MODE_ICONS[currentModeMeta.id]}
                </span>
                <span className="font-semibold whitespace-nowrap">{currentModeMeta.name}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Mode Dropdown Menu */}
              {isOpen && (
                <div className="absolute left-0 mt-1.5 w-80 sm:w-96 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <input
                      type="text"
                      placeholder="Filter 15 calculator modes..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {categories.map((cat) => {
                    const group = filteredModes.filter((m) => m.category === cat);
                    if (group.length === 0) return null;
                    return (
                      <div key={cat} className="mb-2">
                        <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          {cat}
                        </div>
                        <div className="space-y-0.5">
                          {group.map((item) => (
                            <div
                              key={item.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setMode(item.id);
                                setIsOpen(false);
                                setSearchFilter('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setMode(item.id);
                                  setIsOpen(false);
                                  setSearchFilter('');
                                }
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer select-none ${
                                mode === item.id
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className={mode === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>
                                  {MODE_ICONS[item.id]}
                                </span>
                                <div className="truncate">
                                  <div className="font-medium truncate">{item.name}</div>
                                  <div className="text-[11px] text-slate-400 font-normal truncate">
                                    {item.description}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleFavoriteClick(e, item.id)}
                                title={favorites.includes(item.id) ? 'Remove favorite' : 'Add favorite'}
                                className="p-1 hover:text-amber-500 text-slate-300 dark:text-slate-600 transition-colors shrink-0 ml-2"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    favorites.includes(item.id)
                                      ? 'fill-amber-400 text-amber-400'
                                      : ''
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Favorite toggle for active mode */}
            <button
              onClick={(e) => handleFavoriteClick(e, mode)}
              title={isCurrentFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle favorite mode"
              className={`p-2 rounded-lg border transition-colors ${
                isCurrentFavorite
                  ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-500'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Star className={`w-4 h-4 ${isCurrentFavorite ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Angle unit toggle when on standard, scientific, or graphing */}
            {(mode === 'standard' || mode === 'scientific' || mode === 'graphing') && (
              <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs font-medium">
                <button
                  onClick={() => setAngleUnit('deg')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    angleUnit === 'deg'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  DEG
                </button>
                <button
                  onClick={() => setAngleUnit('rad')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    angleUnit === 'rad'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  RAD
                </button>
              </div>
            )}
          </div>

          {/* Right: Pinned Favorites strip + History Drawer trigger */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400 shrink-0 hidden lg:inline">
              Favorites:
            </span>
            {favorites.map((favId) => {
              const meta = CALCULATOR_MODES.find((m) => m.id === favId);
              if (!meta) return null;
              const isActive = mode === favId;
              return (
                <button
                  key={favId}
                  onClick={() => setMode(favId)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {MODE_ICONS[favId]}
                  </span>
                  <span>{meta.shortName}</span>
                </button>
              );
            })}

            {/* History drawer trigger button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              aria-label="Open calculation history"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 ml-auto md:ml-2"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>History</span>
              {history.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                  {history.length > 99 ? '99+' : history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
