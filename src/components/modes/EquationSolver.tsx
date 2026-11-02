import React, { useState, useMemo } from 'react';
import { Divide, Copy, Check, ArrowRight } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { solveQuadratic, solveLinearSystem2, QuadraticResult } from '../../utils/mathEngine';

export const EquationSolver: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  const [equationType, setEquationType] = useState<'quadratic' | 'system2' | 'linear'>('quadratic');

  // Quadratic parameters: ax^2 + bx + c = 0
  const [qa, setQa] = useState('1');
  const [qb, setQb] = useState('-5');
  const [qc, setQc] = useState('6');

  // Linear parameters: ax + b = c
  const [la, setLa] = useState('3');
  const [lb, setLb] = useState('7');
  const [lc, setLc] = useState('22');

  // System parameters:
  // a1*x + b1*y = c1
  // a2*x + b2*y = c2
  const [a1, setA1] = useState('2');
  const [b1, setB1] = useState('3');
  const [c1, setC1] = useState('13');
  const [a2, setA2] = useState('1');
  const [b2, setB2] = useState('-1');
  const [c2, setC2] = useState('4');

  const [copied, setCopied] = useState(false);

  // Solve quadratic
  const quadResult = useMemo(() => {
    const a = parseFloat(qa);
    const b = parseFloat(qb);
    const c = parseFloat(qc);
    if (isNaN(a) || isNaN(b) || isNaN(c) || a === 0) return null;
    try {
      return solveQuadratic(a, b, c);
    } catch {
      return null;
    }
  }, [qa, qb, qc]);

  // Solve linear
  const linearResult = useMemo(() => {
    const a = parseFloat(la);
    const b = parseFloat(lb);
    const c = parseFloat(lc);
    if (isNaN(a) || isNaN(b) || isNaN(c) || a === 0) return null;
    const x = (c - b) / a;
    return {
      x: parseFloat(x.toFixed(6)),
      steps: [
        `Given: ${a}x + (${b}) = ${c}`,
        `Subtract ${b} from both sides: ${a}x = ${c - b}`,
        `Divide both sides by ${a}: x = ${c - b} / ${a} = ${x.toFixed(4)}`,
      ],
    };
  }, [la, lb, lc]);

  // Solve system of 2 equations
  const systemResult = useMemo(() => {
    const na1 = parseFloat(a1);
    const nb1 = parseFloat(b1);
    const nc1 = parseFloat(c1);
    const na2 = parseFloat(a2);
    const nb2 = parseFloat(b2);
    const nc2 = parseFloat(c2);

    if (
      isNaN(na1) ||
      isNaN(nb1) ||
      isNaN(nc1) ||
      isNaN(na2) ||
      isNaN(nb2) ||
      isNaN(nc2)
    )
      return null;

    try {
      return solveLinearSystem2(na1, nb1, nc1, na2, nb2, nc2);
    } catch (err: unknown) {
      return { error: (err as Error).message };
    }
  }, [a1, b1, c1, a2, b2, c2]);

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Copied ${title}`);
    setTimeout(() => setCopied(false), 2000);

    addHistory({
      mode: 'equations',
      modeName: 'Equation Solver',
      expression: title,
      result: text,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Selector Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setEquationType('quadratic')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            equationType === 'quadratic'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Quadratic (ax² + bx + c = 0)
        </button>
        <button
          onClick={() => setEquationType('system2')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            equationType === 'system2'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          System of 2 Equations
        </button>
        <button
          onClick={() => setEquationType('linear')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            equationType === 'linear'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Linear (ax + b = c)
        </button>
      </div>

      {/* Mode 1: Quadratic */}
      {equationType === 'quadratic' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="flex flex-wrap items-center gap-2 font-mono text-base font-bold text-slate-900 dark:text-white">
            <input
              type="number"
              step="any"
              value={qa}
              onChange={(e) => setQa(e.target.value)}
              className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <span>x² +</span>
            <input
              type="number"
              step="any"
              value={qb}
              onChange={(e) => setQb(e.target.value)}
              className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <span>x +</span>
            <input
              type="number"
              step="any"
              value={qc}
              onChange={(e) => setQc(e.target.value)}
              className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <span>= 0</span>
          </div>

          {quadResult && (
            <div className="space-y-4 pt-2">
              {/* Roots banner */}
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                    Calculated Roots
                  </div>
                  <div className="text-2xl font-bold font-mono text-indigo-950 dark:text-indigo-100 mt-1">
                    x₁ = {quadResult.x1} &nbsp;·&nbsp; x₂ = {quadResult.x2}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    Discriminant Δ = {quadResult.discriminant} ({quadResult.rootType})
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleCopy(`x1 = ${quadResult.x1}, x2 = ${quadResult.x2}`, 'Quadratic roots')
                  }
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Steps */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-slate-400 font-sans font-semibold mb-1">
                  Derivation Steps:
                </div>
                {quadResult.steps.map((st, idx) => (
                  <div key={idx} className="text-slate-700 dark:text-slate-200">
                    {st}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: System of 2 Equations */}
      {equationType === 'system2' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="space-y-3 font-mono text-sm sm:text-base font-bold">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-16">Eq 1:</span>
              <input
                type="number"
                value={a1}
                onChange={(e) => setA1(e.target.value)}
                className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span>x +</span>
              <input
                type="number"
                value={b1}
                onChange={(e) => setB1(e.target.value)}
                className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span>y =</span>
              <input
                type="number"
                value={c1}
                onChange={(e) => setC1(e.target.value)}
                className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-16">Eq 2:</span>
              <input
                type="number"
                value={a2}
                onChange={(e) => setA2(e.target.value)}
                className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span>x +</span>
              <input
                type="number"
                value={b2}
                onChange={(e) => setB2(e.target.value)}
                className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <span>y =</span>
              <input
                type="number"
                value={c2}
                onChange={(e) => setC2(e.target.value)}
                className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          {systemResult && (
            <div className="space-y-4 pt-2">
              {'error' in systemResult ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 text-xs">
                  {systemResult.error}
                </div>
              ) : (
                <>
                  <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                        Simultaneous Solution
                      </div>
                      <div className="text-2xl font-bold font-mono text-indigo-950 dark:text-indigo-100 mt-1">
                        x = {systemResult.x.toFixed(4)} &nbsp;·&nbsp; y = {systemResult.y.toFixed(4)}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(`x = ${systemResult.x}, y = ${systemResult.y}`, 'System solution')
                      }
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="text-slate-400 font-sans font-semibold mb-1">
                      Cramer's Rule Derivation:
                    </div>
                    {systemResult.steps.map((st, idx) => (
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
      )}

      {/* Mode 3: Simple Linear */}
      {equationType === 'linear' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="flex items-center gap-2 font-mono text-base font-bold text-slate-900 dark:text-white">
            <input
              type="number"
              value={la}
              onChange={(e) => setLa(e.target.value)}
              className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <span>x +</span>
            <input
              type="number"
              value={lb}
              onChange={(e) => setLb(e.target.value)}
              className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
            <span>=</span>
            <input
              type="number"
              value={lc}
              onChange={(e) => setLc(e.target.value)}
              className="w-16 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          {linearResult && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                    Solution
                  </div>
                  <div className="text-3xl font-bold font-mono text-indigo-950 dark:text-indigo-100 mt-1">
                    x = {linearResult.x}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(`x = ${linearResult.x}`, 'Linear solution')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                {linearResult.steps.map((st, idx) => (
                  <div key={idx} className="text-slate-700 dark:text-slate-200">
                    {st}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
