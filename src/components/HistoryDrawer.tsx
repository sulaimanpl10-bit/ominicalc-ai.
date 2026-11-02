import React, { useState } from 'react';
import { X, Trash2, Copy, CornerDownLeft, Search } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';

export const HistoryDrawer: React.FC = () => {
  const {
    isHistoryOpen,
    setIsHistoryOpen,
    history,
    clearHistory,
    deleteHistoryItem,
    showToast,
    setReusedExpression,
    mode,
  } = useCalculator();

  const [filterMode, setFilterMode] = useState<'all' | 'current'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isHistoryOpen) return null;

  const filteredHistory = history.filter((item) => {
    if (filterMode === 'current' && item.mode !== mode) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.expression.toLowerCase().includes(term) ||
      item.result.toLowerCase().includes(term) ||
      item.modeName.toLowerCase().includes(term)
    );
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  };

  const handleReuse = (expr: string) => {
    setReusedExpression(expr);
    showToast(`Loaded expression into calculator`);
    setIsHistoryOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calculation History"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity"
      onClick={() => setIsHistoryOpen(false)}
    >
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base text-slate-900 dark:text-white">
              Calculation History
            </h2>
            <span className="text-xs font-mono text-slate-400">
              ({history.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                aria-label="Clear all calculation history"
                className="p-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1"
                title="Clear all history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-xs">Clear</span>
              </button>
            )}
            <button
              onClick={() => setIsHistoryOpen(false)}
              aria-label="Close calculation history drawer"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search history expressions or results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Modes
            </button>
            <button
              onClick={() => setFilterMode('current')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                filterMode === 'current'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Current Mode Only
            </button>
          </div>
        </div>

        {/* History Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              <p>No calculations found.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Perform calculations to see them stored here for quick reuse.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {item.modeName}
                  </span>
                  <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="font-mono text-xs text-slate-500 dark:text-slate-400 break-all mb-1">
                  {item.expression}
                </div>

                <div className="font-mono text-base font-bold text-slate-900 dark:text-white break-all mb-2">
                  = {item.result}
                </div>

                {item.details && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-2">
                    {item.details}
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <button
                    onClick={() => handleReuse(item.expression)}
                    className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1"
                    title="Reuse in current calculator"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Reuse</span>
                  </button>
                  <button
                    onClick={() => handleCopy(item.result)}
                    className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1"
                    title="Copy result"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => deleteHistoryItem(item.id)}
                    className="p-1.5 text-xs text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
