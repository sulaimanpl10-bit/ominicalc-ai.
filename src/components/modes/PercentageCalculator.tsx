import React, { useState } from 'react';
import { Percent, Copy, Check, ArrowRight, TrendingUp, TrendingDown, Tag } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';

export const PercentageCalculator: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  // Tab 1: What is P% of X?
  const [p1, setP1] = useState('15');
  const [x1, setX1] = useState('200');

  // Tab 2: X is what % of Y?
  const [x2, setX2] = useState('45');
  const [y2, setY2] = useState('180');

  // Tab 3: % Change from A to B
  const [a3, setA3] = useState('50');
  const [b3, setB3] = useState('75');

  // Tab 4: Discount & Tax
  const [price, setPrice] = useState('120');
  const [discountPct, setDiscountPct] = useState('20');
  const [taxPct, setTaxPct] = useState('8.5');

  // Tab 5: Margin & Markup
  const [cost, setCost] = useState('80');
  const [marginPct, setMarginPct] = useState('35');

  // Calculations
  const res1 = (parseFloat(p1) / 100) * parseFloat(x1);
  const res2 = parseFloat(y2) !== 0 ? (parseFloat(x2) / parseFloat(y2)) * 100 : 0;
  const changeDiff = parseFloat(b3) - parseFloat(a3);
  const res3Pct = parseFloat(a3) !== 0 ? (changeDiff / parseFloat(a3)) * 100 : 0;

  // Discount calc
  const rawPrice = parseFloat(price) || 0;
  const discAmt = (rawPrice * (parseFloat(discountPct) || 0)) / 100;
  const discountedPrice = Math.max(0, rawPrice - discAmt);
  const taxAmt = (discountedPrice * (parseFloat(taxPct) || 0)) / 100;
  const finalPrice = discountedPrice + taxAmt;

  // Margin calc
  const rawCost = parseFloat(cost) || 0;
  const mPct = parseFloat(marginPct) || 0;
  // Selling Price = Cost / (1 - Margin/100)
  const sellingPrice = mPct < 100 ? rawCost / (1 - mPct / 100) : 0;
  const grossProfit = sellingPrice - rawCost;
  const markupPct = rawCost > 0 ? (grossProfit / rawCost) * 100 : 0;

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${title}`);
    addHistory({
      mode: 'percentage',
      modeName: 'Percentage Calculator',
      expression: title,
      result: text,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 2-Column Grid of percentage widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: What is P% of X? */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Percentage of a Value
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span>What is</span>
            <input
              type="number"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              className="w-20 px-2.5 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
            <span>% of</span>
            <input
              type="number"
              value={x1}
              onChange={(e) => setX1(e.target.value)}
              className="w-24 px-2.5 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
            <span>?</span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Result</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-indigo-950 dark:text-indigo-100">
                {!isNaN(res1) ? res1.toFixed(2).replace(/\.?0+$/, '') : '—'}
              </span>
              <button
                onClick={() => handleCopy(res1.toFixed(2), `${p1}% of ${x1}`)}
                className="p-1 hover:text-indigo-600 text-slate-400"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: X is what % of Y? */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Ratio as Percentage
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="number"
              value={x2}
              onChange={(e) => setX2(e.target.value)}
              className="w-20 px-2.5 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
            <span>is what % of</span>
            <input
              type="number"
              value={y2}
              onChange={(e) => setY2(e.target.value)}
              className="w-24 px-2.5 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
            <span>?</span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Percentage</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-indigo-950 dark:text-indigo-100">
                {!isNaN(res2) ? `${res2.toFixed(2).replace(/\.?0+$/, '')}%` : '—'}
              </span>
              <button
                onClick={() => handleCopy(`${res2.toFixed(2)}%`, `${x2} of ${y2}`)}
                className="p-1 hover:text-indigo-600 text-slate-400"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: % Increase / Decrease */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Percentage Change (Increase / Decrease)
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span>From</span>
            <input
              type="number"
              value={a3}
              onChange={(e) => setA3(e.target.value)}
              className="w-24 px-2.5 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
            <span>to</span>
            <input
              type="number"
              value={b3}
              onChange={(e) => setB3(e.target.value)}
              className="w-24 px-2.5 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {res3Pct >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              )}
              <span className={res3Pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {res3Pct >= 0 ? 'Increase' : 'Decrease'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xl font-bold ${res3Pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {res3Pct >= 0 ? `+${res3Pct.toFixed(2)}%` : `${res3Pct.toFixed(2)}%`}
              </span>
              <button
                onClick={() => handleCopy(`${res3Pct.toFixed(2)}%`, `Change from ${a3} to ${b3}`)}
                className="p-1 hover:text-indigo-600 text-slate-400"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Profit Margin & Markup */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Margin & Markup
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Cost Price ($)</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Target Gross Margin (%)</label>
              <input
                type="number"
                value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="text-slate-400">Selling Price:</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                ${sellingPrice.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Profit:</div>
              <div className="text-emerald-600 font-bold">${grossProfit.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-400">Markup:</div>
              <div className="text-slate-700 dark:text-slate-300 font-bold">
                {markupPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Card 5: Discount & Sales Tax */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Tag className="w-4 h-4 text-indigo-500" />
          <span>Discount, Savings & Sales Tax Calculator</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Original Retail Price ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-2.5 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Discount (%)
            </label>
            <input
              type="number"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              className="w-full p-2.5 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Sales Tax (%)
            </label>
            <input
              type="number"
              value={taxPct}
              onChange={(e) => setTaxPct(e.target.value)}
              className="w-full p-2.5 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Total Savings:</span>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              -${discAmt.toFixed(2)} ({discountPct}%)
            </div>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Discounted Price:</span>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              ${discountedPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Sales Tax:</span>
            <div className="text-base font-bold text-slate-600 dark:text-slate-300">
              +${taxAmt.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Final Out-of-Pocket:</span>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              ${finalPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
