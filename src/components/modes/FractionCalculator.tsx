import React, { useState, useMemo } from 'react';
import { Hash, Copy, Check, Plus, Minus, X, Divide, ArrowRight } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { gcd, lcm } from '../../utils/mathEngine';

type FractionOp = '+' | '-' | '×' | '÷';

export const FractionCalculator: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  // Fraction 1: Whole + Num / Den
  const [w1, setW1] = useState('0');
  const [n1, setN1] = useState('3');
  const [d1, setD1] = useState('4');

  // Operator
  const [op, setOp] = useState<FractionOp>('+');

  // Fraction 2: Whole + Num / Den
  const [w2, setW2] = useState('0');
  const [n2, setN2] = useState('2');
  const [d2, setD2] = useState('3');

  const [copied, setCopied] = useState(false);

  // Compute arithmetic & step derivation
  const calculation = useMemo(() => {
    const whole1 = parseInt(w1) || 0;
    const num1Raw = parseInt(n1) || 0;
    const den1 = parseInt(d1) || 1;

    const whole2 = parseInt(w2) || 0;
    const num2Raw = parseInt(n2) || 0;
    const den2 = parseInt(d2) || 1;

    if (den1 === 0 || den2 === 0) {
      return { error: 'Denominator cannot be zero' };
    }

    // Convert mixed to improper fractions
    const num1 = whole1 >= 0 ? whole1 * den1 + num1Raw : whole1 * den1 - num1Raw;
    const num2 = whole2 >= 0 ? whole2 * den2 + num2Raw : whole2 * den2 - num2Raw;

    const steps: string[] = [];
    steps.push(`Improper fractions: ${num1}/${den1} and ${num2}/${den2}`);

    let rawNum = 0;
    let rawDen = 1;

    if (op === '+' || op === '-') {
      const commonDen = lcm(den1, den2);
      const factor1 = commonDen / den1;
      const factor2 = commonDen / den2;
      const scaledNum1 = num1 * factor1;
      const scaledNum2 = num2 * factor2;

      steps.push(`Least Common Denominator (LCD) = ${commonDen}`);
      steps.push(`Convert Fraction 1: (${num1} × ${factor1}) / ${commonDen} = ${scaledNum1}/${commonDen}`);
      steps.push(`Convert Fraction 2: (${num2} × ${factor2}) / ${commonDen} = ${scaledNum2}/${commonDen}`);

      if (op === '+') {
        rawNum = scaledNum1 + scaledNum2;
        steps.push(`Add numerators: ${scaledNum1} + ${scaledNum2} = ${rawNum}`);
      } else {
        rawNum = scaledNum1 - scaledNum2;
        steps.push(`Subtract numerators: ${scaledNum1} - ${scaledNum2} = ${rawNum}`);
      }
      rawDen = commonDen;
    } else if (op === '×') {
      rawNum = num1 * num2;
      rawDen = den1 * den2;
      steps.push(`Multiply numerators: ${num1} × ${num2} = ${rawNum}`);
      steps.push(`Multiply denominators: ${den1} × ${den2} = ${rawDen}`);
    } else if (op === '÷') {
      if (num2 === 0) {
        return { error: 'Division by zero fraction is undefined' };
      }
      rawNum = num1 * den2;
      rawDen = den1 * num2;
      steps.push(`Invert divisor and multiply: (${num1}/${den1}) × (${den2}/${num2})`);
      steps.push(`Resulting fraction: ${rawNum}/${rawDen}`);
    }

    // Normalize signs
    if (rawDen < 0) {
      rawNum = -rawNum;
      rawDen = -rawDen;
    }

    // Simplify fraction using GCD
    const divisor = gcd(rawNum, rawDen);
    const simpNum = rawNum / divisor;
    const simpDen = rawDen / divisor;

    if (divisor > 1) {
      steps.push(`Simplify by Greatest Common Divisor (GCD = ${divisor}): ${rawNum}/${rawDen} = ${simpNum}/${simpDen}`);
    }

    // Mixed number format
    let mixedStr = '';
    const absNum = Math.abs(simpNum);
    const wholePart = Math.floor(absNum / simpDen);
    const remNum = absNum % simpDen;
    const sign = simpNum < 0 ? '-' : '';

    if (simpDen === 1) {
      mixedStr = `${simpNum}`;
    } else if (wholePart > 0) {
      mixedStr = `${sign}${wholePart} ${remNum}/${simpDen}`;
    } else {
      mixedStr = `${simpNum}/${simpDen}`;
    }

    const decimalVal = (simpNum / simpDen).toFixed(6).replace(/\.?0+$/, '');
    const percentageVal = ((simpNum / simpDen) * 100).toFixed(4).replace(/\.?0+$/, '');

    return {
      simplified: `${simpNum}/${simpDen}`,
      simpNum,
      simpDen,
      mixedStr,
      decimalVal,
      percentageVal,
      steps,
    };
  }, [w1, n1, d1, op, w2, n2, d2]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied fraction result');
    setTimeout(() => setCopied(false), 2000);

    if (calculation && !('error' in calculation)) {
      addHistory({
        mode: 'fractions',
        modeName: 'Fraction Calculator',
        expression: `(${w1 ? `${w1} ` : ''}${n1}/${d1}) ${op} (${w2 ? `${w2} ` : ''}${n2}/${d2})`,
        result: calculation.simplified,
        details: `Mixed: ${calculation.mixedStr} · Decimal: ${calculation.decimalVal}`,
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Arithmetic Input Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 transition-colors">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Fraction Arithmetic & Mixed Number Simplifier
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {/* Fraction 1 */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={w1}
              onChange={(e) => setW1(e.target.value)}
              placeholder="0"
              title="Whole Number"
              className="w-12 p-2 text-center font-mono font-bold text-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <div className="flex flex-col items-center gap-1">
              <input
                type="number"
                value={n1}
                onChange={(e) => setN1(e.target.value)}
                placeholder="Num"
                className="w-16 p-2 text-center font-mono font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <div className="w-16 h-0.5 bg-slate-400 dark:bg-slate-600 rounded-full" />
              <input
                type="number"
                value={d1}
                onChange={(e) => setD1(e.target.value)}
                placeholder="Den"
                className="w-16 p-2 text-center font-mono font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          {/* Operation Selector */}
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['+', '-', '×', '÷'] as FractionOp[]).map((operator) => (
                <button
                  key={operator}
                  onClick={() => setOp(operator)}
                  className={`w-9 h-9 flex items-center justify-center font-bold text-base rounded-lg transition-colors ${
                    op === operator
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {operator}
                </button>
              ))}
            </div>
          </div>

          {/* Fraction 2 */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={w2}
              onChange={(e) => setW2(e.target.value)}
              placeholder="0"
              title="Whole Number"
              className="w-12 p-2 text-center font-mono font-bold text-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <div className="flex flex-col items-center gap-1">
              <input
                type="number"
                value={n2}
                onChange={(e) => setN2(e.target.value)}
                placeholder="Num"
                className="w-16 p-2 text-center font-mono font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <div className="w-16 h-0.5 bg-slate-400 dark:bg-slate-600 rounded-full" />
              <input
                type="number"
                value={d2}
                onChange={(e) => setD2(e.target.value)}
                placeholder="Den"
                className="w-16 p-2 text-center font-mono font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Results Banner */}
        {calculation && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {'error' in calculation ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 text-xs">
                {calculation.error}
              </div>
            ) : (
              <>
                <div className="p-5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                        Simplified Fraction
                      </div>
                      <div className="text-3xl font-mono font-bold text-indigo-950 dark:text-indigo-100 mt-0.5">
                        {calculation.simplified}
                      </div>
                    </div>

                    <div className="h-10 w-px bg-indigo-200 dark:bg-indigo-800" />

                    <div>
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Mixed Number
                      </div>
                      <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        {calculation.mixedStr}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(calculation.simplified)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 font-sans">Decimal Equivalent:</span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {calculation.decimalVal}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 font-sans">Percentage (%):</span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {calculation.percentageVal}%
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Derivation */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="text-slate-400 font-sans font-semibold mb-1">
                    Step-by-Step LCD & Reduction:
                  </div>
                  {calculation.steps.map((st, idx) => (
                    <div key={idx} className="text-slate-700 dark:text-slate-200">
                      {st}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
