import React, { useState, useMemo } from 'react';
import { BarChart2, Copy, Check, Sparkles } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { calculateStatistics, StatisticsResult } from '../../utils/mathEngine';

const PRESETS = [
  { name: 'Exam Test Scores', data: '88, 72, 95, 64, 82, 91, 78, 85, 90, 76, 88, 94, 60, 85, 92' },
  { name: 'Daily Temperatures (°F)', data: '68, 72, 70, 75, 78, 82, 85, 80, 76, 74, 71, 69, 73, 77' },
  { name: 'Dataset with Outliers', data: '12, 14, 15, 14, 16, 15, 13, 14, 15, 45, 13, 16, 2' },
];

export const StatisticsCalculator: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  const [rawInput, setRawInput] = useState('12, 15, 18, 22, 24, 25, 28, 30, 32, 35, 38, 42');
  const [copied, setCopied] = useState(false);

  // Parse numbers from input
  const parsedNumbers = useMemo(() => {
    return rawInput
      .split(/[\s,;\n]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));
  }, [rawInput]);

  const stats: StatisticsResult | null = useMemo(() => {
    return calculateStatistics(parsedNumbers);
  }, [parsedNumbers]);

  // Histogram bins calculation
  const histogramBins = useMemo(() => {
    if (!stats || stats.count < 3 || stats.range === 0) return [];
    const numBins = Math.min(8, Math.max(4, Math.round(Math.sqrt(stats.count))));
    const binWidth = stats.range / numBins;
    const bins: { label: string; count: number; x0: number; x1: number }[] = [];

    for (let i = 0; i < numBins; i++) {
      const x0 = stats.min + i * binWidth;
      const x1 = stats.min + (i + 1) * binWidth;
      bins.push({
        label: `${x0.toFixed(1)}–${x1.toFixed(1)}`,
        count: 0,
        x0,
        x1,
      });
    }

    parsedNumbers.forEach((val) => {
      let idx = Math.floor((val - stats.min) / binWidth);
      if (idx >= numBins) idx = numBins - 1;
      if (idx >= 0 && bins[idx]) bins[idx].count++;
    });

    return bins;
  }, [stats, parsedNumbers]);

  const handleCopy = () => {
    if (!stats) return;
    const text = `Mean: ${stats.mean.toFixed(2)} | Median: ${stats.median} | StdDev: ${stats.stdDevSample.toFixed(2)} | Min: ${stats.min} | Max: ${stats.max} | N: ${stats.count}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied summary statistics');
    setTimeout(() => setCopied(false), 2000);

    addHistory({
      mode: 'statistics',
      modeName: 'Statistics Calculator',
      expression: `Sample (N=${stats.count})`,
      result: `Mean: ${stats.mean.toFixed(2)}, σ: ${stats.stdDevSample.toFixed(2)}`,
    });
  };

  const maxBinCount = Math.max(...histogramBins.map((b) => b.count), 1);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Input Data Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Enter Numbers (separated by commas, spaces, or lines)
          </label>
          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
            {parsedNumbers.length} data points
          </span>
        </div>

        <textarea
          rows={3}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="e.g. 14, 28, 35, 42, 56, 70..."
          className="w-full p-3 font-mono text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Presets:
          </span>
          {PRESETS.map((pr) => (
            <button
              key={pr.name}
              onClick={() => setRawInput(pr.data)}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              {pr.name}
            </button>
          ))}
        </div>
      </div>

      {stats ? (
        <div className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Descriptive Statistics
              </h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Summary'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                <div className="text-slate-400 font-sans">Mean (Average)</div>
                <div className="text-xl font-bold text-indigo-950 dark:text-indigo-100 mt-1">
                  {stats.mean.toFixed(3)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Median</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {stats.median}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Mode</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {stats.mode.length > 0 ? stats.mode.join(', ') : 'No unique mode'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Sample Std Dev (s)</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {stats.stdDevSample.toFixed(3)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Population Std Dev (σ)</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {stats.stdDevPopulation.toFixed(3)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Sample Variance (s²)</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {stats.varianceSample.toFixed(3)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Min / Max</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {stats.min} / {stats.max}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Range</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {stats.range.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Quartiles & IQR Row */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-400">Q1 (25%): </span>
                <strong className="text-slate-900 dark:text-white">{stats.q1}</strong>
              </div>
              <div>
                <span className="text-slate-400">Median (50%): </span>
                <strong className="text-slate-900 dark:text-white">{stats.median}</strong>
              </div>
              <div>
                <span className="text-slate-400">Q3 (75%): </span>
                <strong className="text-slate-900 dark:text-white">{stats.q3}</strong>
              </div>
              <div>
                <span className="text-slate-400">IQR: </span>
                <strong className="text-indigo-600 dark:text-indigo-400">{stats.iqr}</strong>
              </div>
              <div>
                <span className="text-slate-400">Sum (∑x): </span>
                <strong className="text-slate-900 dark:text-white">{stats.sum}</strong>
              </div>
            </div>

            {/* Outlier Alert if present */}
            {stats.outliers.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <strong>Outliers detected (1.5 × IQR): </strong>
                {stats.outliers.join(', ')}
              </div>
            )}
          </div>

          {/* Visualizations: Histogram and Box Plot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Distribution Histogram */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Frequency Distribution Histogram
              </div>
              <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-slate-800">
                {histogramBins.map((bin, idx) => {
                  const heightPct = Math.round((bin.count / maxBinCount) * 100);
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative"
                    >
                      <div className="text-[10px] font-mono text-slate-400">{bin.count}</div>
                      <div
                        style={{ height: `${Math.max(6, heightPct)}%` }}
                        className="w-full bg-indigo-500 group-hover:bg-indigo-600 rounded-t transition-all"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
                <span>{stats.min}</span>
                <span>Mid: {((stats.min + stats.max) / 2).toFixed(1)}</span>
                <span>{stats.max}</span>
              </div>
            </div>

            {/* Box-and-Whisker Plot */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Box-and-Whisker Plot
              </div>
              <div className="h-44 flex items-center justify-center p-4">
                <svg className="w-full h-24" viewBox="0 0 300 80">
                  {/* Range mapping */}
                  {(() => {
                    const r = stats.range || 1;
                    const mapX = (val: number) => 30 + ((val - stats.min) / r) * 240;
                    const xMin = mapX(stats.min);
                    const xQ1 = mapX(stats.q1);
                    const xMed = mapX(stats.median);
                    const xQ3 = mapX(stats.q3);
                    const xMax = mapX(stats.max);

                    return (
                      <g>
                        {/* Whiskers */}
                        <line x1={xMin} y1="40" x2={xQ1} y2="40" stroke="#94a3b8" strokeWidth="2" />
                        <line x1={xQ3} y1="40" x2={xMax} y2="40" stroke="#94a3b8" strokeWidth="2" />
                        {/* Min & Max caps */}
                        <line x1={xMin} y1="28" x2={xMin} y2="52" stroke="#94a3b8" strokeWidth="2" />
                        <line x1={xMax} y1="28" x2={xMax} y2="52" stroke="#94a3b8" strokeWidth="2" />
                        {/* Interquartile Box */}
                        <rect
                          x={xQ1}
                          y="20"
                          width={Math.max(2, xQ3 - xQ1)}
                          height="40"
                          fill="#e0e7ff"
                          stroke="#6366f1"
                          strokeWidth="2"
                          rx="2"
                        />
                        {/* Median line */}
                        <line x1={xMed} y1="20" x2={xMed} y2="60" stroke="#4338ca" strokeWidth="3" />
                        {/* Labels */}
                        <text x={xMin} y="72" fontSize="8" fill="#64748b" textAnchor="middle" fontFamily="JetBrains Mono">
                          {stats.min}
                        </text>
                        <text x={xMed} y="14" fontSize="8" fill="#4338ca" textAnchor="middle" fontWeight="bold" fontFamily="JetBrains Mono">
                          Med: {stats.median}
                        </text>
                        <text x={xMax} y="72" fontSize="8" fill="#64748b" textAnchor="middle" fontFamily="JetBrains Mono">
                          {stats.max}
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
              <div className="text-[11px] text-slate-400 text-center font-mono">
                Shows Min, Q1, Median, Q3, and Max spread
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          Please enter at least 1 valid number to compute statistics.
        </div>
      )}
    </div>
  );
};
