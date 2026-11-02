import React, { useState, useEffect, useCallback } from 'react';
import { Delete, Copy, Check, RotateCcw } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { evaluateMathExpression, factorial } from '../../utils/mathEngine';

export const ScientificCalculator: React.FC = () => {
  const {
    angleUnit,
    setAngleUnit,
    addHistory,
    showToast,
    reusedExpression,
    setReusedExpression,
  } = useCalculator();

  const [expression, setExpression] = useState('');
  const [resultPreview, setResultPreview] = useState('0');
  const [isSecondActive, setIsSecondActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle reused expression from history
  useEffect(() => {
    if (reusedExpression) {
      setExpression(reusedExpression);
      setReusedExpression(null);
    }
  }, [reusedExpression, setReusedExpression]);

  // Live evaluation preview
  useEffect(() => {
    if (!expression.trim()) {
      setResultPreview('0');
      return;
    }
    try {
      const res = evaluateMathExpression(expression, angleUnit);
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        setResultPreview(parseFloat(res.toFixed(10)).toString());
      }
    } catch {
      // Ignore intermediate syntax incomplete states
    }
  }, [expression, angleUnit]);

  const insert = useCallback((str: string) => {
    setExpression((prev) => prev + str);
  }, []);

  const handleClear = useCallback(() => {
    setExpression('');
    setResultPreview('0');
  }, []);

  const handleBackspace = useCallback(() => {
    setExpression((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
  }, []);

  const handleCalculate = useCallback(() => {
    if (!expression.trim()) return;
    try {
      const res = evaluateMathExpression(expression, angleUnit);
      const formatted = parseFloat(res.toFixed(10)).toString();

      addHistory({
        mode: 'scientific',
        modeName: 'Scientific',
        expression: `${expression} [${angleUnit.toUpperCase()}]`,
        result: formatted,
      });

      setResultPreview(formatted);
      setExpression(formatted);
      showToast('Calculated');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Invalid syntax');
    }
  }, [expression, angleUnit, addHistory, showToast]);

  const handleFactorial = () => {
    try {
      const num = evaluateMathExpression(expression || resultPreview, angleUnit);
      const res = factorial(num);
      const formatted = res.toString();
      addHistory({
        mode: 'scientific',
        modeName: 'Scientific',
        expression: `${num}!`,
        result: formatted,
      });
      setExpression(formatted);
      setResultPreview(formatted);
    } catch (err: unknown) {
      showToast((err as Error).message);
    }
  };

  const copyResult = () => {
    const val = resultPreview !== '0' ? resultPreview : expression;
    if (val) {
      navigator.clipboard.writeText(val);
      setCopied(true);
      showToast('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        insert(e.key);
      } else if (e.key === '.') {
        insert('.');
      } else if (e.key === '+') {
        insert('+');
      } else if (e.key === '-') {
        insert('−');
      } else if (e.key === '*') {
        insert('×');
      } else if (e.key === '/') {
        e.preventDefault();
        insert('÷');
      } else if (e.key === '(' || e.key === ')') {
        insert(e.key);
      } else if (e.key === '^') {
        insert('^');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [insert, handleCalculate, handleBackspace, handleClear]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
      {/* Display Screen */}
      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 mb-4 text-right relative">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAngleUnit(angleUnit === 'deg' ? 'rad' : 'deg')}
              className="px-2 py-0.5 rounded font-mono font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
            >
              {angleUnit.toUpperCase()}
            </button>
            {isSecondActive && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold">
                2nd
              </span>
            )}
          </div>
          <div className="font-mono truncate max-w-xs sm:max-w-md">
            {expression || 'Ready'}
          </div>
        </div>

        <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-900 dark:text-white tracking-tight overflow-x-auto scrollbar-none py-1">
          {resultPreview}
        </div>

        <button
          onClick={copyResult}
          title="Copy value"
          className="absolute left-4 bottom-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Scientific Controls Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 text-xs sm:text-sm">
        {/* Row 1: Function Controls */}
        <button
          onClick={() => setIsSecondActive(!isSecondActive)}
          className={`py-2.5 rounded-xl font-semibold transition-colors ${
            isSecondActive
              ? 'bg-amber-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          2nd
        </button>
        <button
          onClick={() => insert(angleUnit === 'deg' ? 'deg' : 'rad')}
          onClickCapture={() => setAngleUnit(angleUnit === 'deg' ? 'rad' : 'deg')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          {angleUnit.toUpperCase()}
        </button>
        <button
          onClick={() => insert('(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          (
        </button>
        <button
          onClick={() => insert(')')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          )
        </button>
        <button
          onClick={handleClear}
          className="py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold transition-colors"
        >
          AC
        </button>
        <button
          onClick={handleBackspace}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={() => insert('÷')}
          className="py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold transition-colors"
        >
          ÷
        </button>

        {/* Row 2: Trig functions */}
        <button
          onClick={() => insert(isSecondActive ? 'asin(' : 'sin(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          {isSecondActive ? 'sin⁻¹' : 'sin'}
        </button>
        <button
          onClick={() => insert(isSecondActive ? 'acos(' : 'cos(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          {isSecondActive ? 'cos⁻¹' : 'cos'}
        </button>
        <button
          onClick={() => insert(isSecondActive ? 'atan(' : 'tan(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          {isSecondActive ? 'tan⁻¹' : 'tan'}
        </button>
        <button
          onClick={() => insert('7')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          7
        </button>
        <button
          onClick={() => insert('8')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          8
        </button>
        <button
          onClick={() => insert('9')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          9
        </button>
        <button
          onClick={() => insert('×')}
          className="py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold transition-colors"
        >
          ×
        </button>

        {/* Row 3: Hyperbolic & Logs */}
        <button
          onClick={() => insert('sinh(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          sinh
        </button>
        <button
          onClick={() => insert('cosh(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          cosh
        </button>
        <button
          onClick={() => insert('tanh(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          tanh
        </button>
        <button
          onClick={() => insert('4')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          4
        </button>
        <button
          onClick={() => insert('5')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          5
        </button>
        <button
          onClick={() => insert('6')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          6
        </button>
        <button
          onClick={() => insert('−')}
          className="py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold transition-colors"
        >
          −
        </button>

        {/* Row 4: Exponentials & Powers */}
        <button
          onClick={() => insert(isSecondActive ? 'Math.E^(' : 'ln(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          {isSecondActive ? 'eˣ' : 'ln'}
        </button>
        <button
          onClick={() => insert(isSecondActive ? '10^(' : 'log10(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          {isSecondActive ? '10ˣ' : 'log'}
        </button>
        <button
          onClick={() => insert('^')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          xʸ
        </button>
        <button
          onClick={() => insert('1')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          1
        </button>
        <button
          onClick={() => insert('2')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          2
        </button>
        <button
          onClick={() => insert('3')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          3
        </button>
        <button
          onClick={() => insert('+')}
          className="py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold transition-colors"
        >
          +
        </button>

        {/* Row 5: Roots, Constants & Equals */}
        <button
          onClick={() => insert(isSecondActive ? 'cbrt(' : 'sqrt(')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          {isSecondActive ? '∛x' : '√x'}
        </button>
        <button
          onClick={handleFactorial}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          x!
        </button>
        <button
          onClick={() => insert('π')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          π
        </button>
        <button
          onClick={() => insert('e')}
          className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
        >
          e
        </button>
        <button
          onClick={() => insert('0')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          0
        </button>
        <button
          onClick={() => insert('.')}
          className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          .
        </button>
        <button
          onClick={handleCalculate}
          className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-xs transition-colors"
        >
          =
        </button>
      </div>

      {/* Physics & Math Constants quick bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
          Constants:
        </span>
        <button
          onClick={() => insert('3.1415926535')}
          className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono shrink-0 transition-colors"
          title="Pi (3.14159...)"
        >
          π
        </button>
        <button
          onClick={() => insert('2.7182818284')}
          className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono shrink-0 transition-colors"
          title="Euler's Number (2.71828...)"
        >
          e
        </button>
        <button
          onClick={() => insert('1.6180339887')}
          className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono shrink-0 transition-colors"
          title="Golden Ratio φ (1.61803...)"
        >
          φ
        </button>
        <button
          onClick={() => insert('299792458')}
          className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono shrink-0 transition-colors"
          title="Speed of Light c (2.99792 × 10⁸ m/s)"
        >
          c (Light)
        </button>
        <button
          onClick={() => insert('6.67430e-11')}
          className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono shrink-0 transition-colors"
          title="Gravitational Constant G (6.6743 × 10⁻¹¹)"
        >
          G (Gravity)
        </button>
        <button
          onClick={() => insert('6.62607e-34')}
          className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono shrink-0 transition-colors"
          title="Planck Constant h (6.62607 × 10⁻³⁴ J·s)"
        >
          h (Planck)
        </button>
      </div>
    </div>
  );
};
