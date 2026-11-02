import React, { useState, useEffect, useCallback } from 'react';
import { Delete, Copy, Check, RotateCcw } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { evaluateMathExpression } from '../../utils/mathEngine';

export const StandardCalculator: React.FC = () => {
  const { addHistory, showToast, reusedExpression, setReusedExpression } = useCalculator();

  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [memory, setMemory] = useState<number | null>(null);
  const [justCalculated, setJustCalculated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle reused expression from history
  useEffect(() => {
    if (reusedExpression) {
      setDisplay(reusedExpression);
      setEquation('');
      setJustCalculated(false);
      setReusedExpression(null);
    }
  }, [reusedExpression, setReusedExpression]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (justCalculated) {
        setDisplay(digit);
        setEquation('');
        setJustCalculated(false);
        return;
      }
      if (display === '0' && digit !== '.') {
        setDisplay(digit);
      } else {
        if (digit === '.' && display.includes('.')) return;
        setDisplay((prev) => (prev.length < 18 ? prev + digit : prev));
      }
    },
    [display, justCalculated]
  );

  const handleOperator = useCallback(
    (op: string) => {
      setJustCalculated(false);
      if (equation && !equation.endsWith('=')) {
        // Evaluate running total
        try {
          const sanitizedEquation = equation + display;
          const val = evaluateMathExpression(sanitizedEquation);
          setEquation(`${val} ${op} `);
          setDisplay('0');
        } catch {
          setEquation(`${display} ${op} `);
          setDisplay('0');
        }
      } else {
        setEquation(`${display} ${op} `);
        setDisplay('0');
      }
    },
    [equation, display]
  );

  const handleEqual = useCallback(() => {
    if (!equation || equation.endsWith('=')) return;
    try {
      const fullExpr = equation + display;
      const res = evaluateMathExpression(fullExpr);
      const formattedRes = parseFloat(res.toFixed(10)).toString();

      addHistory({
        mode: 'standard',
        modeName: 'Standard',
        expression: fullExpr,
        result: formattedRes,
      });

      setEquation(`${fullExpr} =`);
      setDisplay(formattedRes);
      setJustCalculated(true);
    } catch {
      setDisplay('Error');
      setEquation('');
      setJustCalculated(true);
    }
  }, [equation, display, addHistory]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setEquation('');
    setJustCalculated(false);
  }, []);

  const handleClearEntry = useCallback(() => {
    setDisplay('0');
  }, []);

  const handleBackspace = useCallback(() => {
    if (justCalculated) {
      handleClear();
      return;
    }
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  }, [justCalculated, handleClear]);

  const handleToggleSign = useCallback(() => {
    if (display === '0' || display === 'Error') return;
    setDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : '-' + prev));
  }, [display]);

  const handlePercent = useCallback(() => {
    const num = parseFloat(display);
    if (isNaN(num)) return;
    const res = (num / 100).toString();
    setDisplay(res);
  }, [display]);

  const handleSquareRoot = useCallback(() => {
    const num = parseFloat(display);
    if (isNaN(num) || num < 0) {
      setDisplay('Error');
      return;
    }
    const res = Math.sqrt(num);
    const formatted = parseFloat(res.toFixed(10)).toString();
    addHistory({
      mode: 'standard',
      modeName: 'Standard',
      expression: `√(${display})`,
      result: formatted,
    });
    setDisplay(formatted);
    setJustCalculated(true);
  }, [display, addHistory]);

  const handleReciprocal = useCallback(() => {
    const num = parseFloat(display);
    if (num === 0 || isNaN(num)) {
      setDisplay('Error (div by 0)');
      return;
    }
    const res = 1 / num;
    const formatted = parseFloat(res.toFixed(10)).toString();
    addHistory({
      mode: 'standard',
      modeName: 'Standard',
      expression: `1/(${display})`,
      result: formatted,
    });
    setDisplay(formatted);
    setJustCalculated(true);
  }, [display, addHistory]);

  const handleSquare = useCallback(() => {
    const num = parseFloat(display);
    if (isNaN(num)) return;
    const res = num * num;
    const formatted = parseFloat(res.toFixed(10)).toString();
    addHistory({
      mode: 'standard',
      modeName: 'Standard',
      expression: `sqr(${display})`,
      result: formatted,
    });
    setDisplay(formatted);
    setJustCalculated(true);
  }, [display, addHistory]);

  // Memory functions
  const handleMemoryAdd = () => {
    const num = parseFloat(display);
    if (!isNaN(num)) {
      setMemory((prev) => (prev || 0) + num);
      showToast('Added to memory (M+)');
    }
  };

  const handleMemorySub = () => {
    const num = parseFloat(display);
    if (!isNaN(num)) {
      setMemory((prev) => (prev || 0) - num);
      showToast('Subtracted from memory (M-)');
    }
  };

  const handleMemoryRecall = () => {
    if (memory !== null) {
      setDisplay(memory.toString());
      setJustCalculated(true);
      showToast('Recalled memory (MR)');
    }
  };

  const handleMemoryClear = () => {
    setMemory(null);
    showToast('Memory cleared (MC)');
  };

  const copyResult = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    showToast('Copied result');
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focusing inputs or modals
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.') {
        handleDigit('.');
      } else if (e.key === '+') {
        handleOperator('+');
      } else if (e.key === '-') {
        handleOperator('-');
      } else if (e.key === '*') {
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEqual();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === '%') {
        handlePercent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleDigit,
    handleOperator,
    handleEqual,
    handleBackspace,
    handleClear,
    handlePercent,
  ]);

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
      {/* Display Screen */}
      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 text-right mb-4 relative group">
        <div className="h-5 text-xs font-mono text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
          {equation || '\u00A0'}
        </div>
        <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-900 dark:text-white tracking-tight overflow-x-auto scrollbar-none py-1">
          {display}
        </div>

        {/* Copy button overlay */}
        <button
          onClick={copyResult}
          title="Copy current value"
          className="absolute left-3 bottom-3 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {memory !== null && (
          <span className="absolute left-11 bottom-4 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
            M = {memory}
          </span>
        )}
      </div>

      {/* Memory Bar */}
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        <button
          onClick={handleMemoryClear}
          disabled={memory === null}
          className="py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          MC
        </button>
        <button
          onClick={handleMemoryRecall}
          disabled={memory === null}
          className="py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          MR
        </button>
        <button
          onClick={handleMemoryAdd}
          className="py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          M+
        </button>
        <button
          onClick={handleMemorySub}
          className="py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          M-
        </button>
        <button
          onClick={() => {
            const num = parseFloat(display);
            if (!isNaN(num)) {
              setMemory(num);
              showToast(`Memory stored: ${num}`);
            }
          }}
          className="py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          MS
        </button>
      </div>

      {/* Main Keypad Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Row 1 */}
        <button
          onClick={handlePercent}
          className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
        >
          %
        </button>
        <button
          onClick={handleClearEntry}
          className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
        >
          CE
        </button>
        <button
          onClick={handleClear}
          className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 font-medium text-sm transition-colors"
        >
          C
        </button>
        <button
          onClick={handleBackspace}
          className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
          title="Backspace"
        >
          <Delete className="w-4 h-4" />
        </button>

        {/* Row 2: Advanced standard functions */}
        <button
          onClick={handleReciprocal}
          className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
        >
          1/x
        </button>
        <button
          onClick={handleSquare}
          className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
        >
          x²
        </button>
        <button
          onClick={handleSquareRoot}
          className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
        >
          √x
        </button>
        <button
          onClick={() => handleOperator('÷')}
          className="py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold text-base transition-colors"
        >
          ÷
        </button>

        {/* Row 3 */}
        <button
          onClick={() => handleDigit('7')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          7
        </button>
        <button
          onClick={() => handleDigit('8')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          8
        </button>
        <button
          onClick={() => handleDigit('9')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          9
        </button>
        <button
          onClick={() => handleOperator('×')}
          className="py-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold text-base transition-colors"
        >
          ×
        </button>

        {/* Row 4 */}
        <button
          onClick={() => handleDigit('4')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          4
        </button>
        <button
          onClick={() => handleDigit('5')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          5
        </button>
        <button
          onClick={() => handleDigit('6')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          6
        </button>
        <button
          onClick={() => handleOperator('−')}
          className="py-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold text-base transition-colors"
        >
          −
        </button>

        {/* Row 5 */}
        <button
          onClick={() => handleDigit('1')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          1
        </button>
        <button
          onClick={() => handleDigit('2')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          2
        </button>
        <button
          onClick={() => handleDigit('3')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          3
        </button>
        <button
          onClick={() => handleOperator('+')}
          className="py-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold text-base transition-colors"
        >
          +
        </button>

        {/* Row 6 */}
        <button
          onClick={handleToggleSign}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-base border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          ±
        </button>
        <button
          onClick={() => handleDigit('0')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          0
        </button>
        <button
          onClick={() => handleDigit('.')}
          className="py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-colors"
        >
          .
        </button>
        <button
          onClick={handleEqual}
          className="py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl shadow-xs transition-colors"
        >
          =
        </button>
      </div>
    </div>
  );
};
