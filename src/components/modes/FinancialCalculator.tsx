import React, { useState, useMemo } from 'react';
import { Scale, Copy, Check, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import {
  calculateLoanAmortization,
  calculateCompoundInterest,
} from '../../utils/mathEngine';

export const FinancialCalculator: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  const [tool, setTool] = useState<'loan' | 'compound' | 'goal' | 'roi'>('loan');

  // Tool 1: Loan / Mortgage
  const [loanAmount, setLoanAmount] = useState('300000');
  const [loanRate, setLoanRate] = useState('6.5');
  const [loanYears, setLoanYears] = useState('30');

  // Tool 2: Compound Interest
  const [initialDeposit, setInitialDeposit] = useState('10000');
  const [monthlyAddition, setMonthlyAddition] = useState('500');
  const [compoundRate, setCompoundRate] = useState('8.0');
  const [compoundYears, setCompoundYears] = useState('20');

  // Tool 3: Savings Goal
  const [targetGoal, setTargetGoal] = useState('100000');
  const [startSavings, setStartSavings] = useState('5000');
  const [goalYears, setGoalYears] = useState('10');
  const [goalRate, setGoalRate] = useState('7.0');

  // Tool 4: ROI
  const [initialInv, setInitialInv] = useState('25000');
  const [finalInv, setFinalInv] = useState('42000');
  const [roiYears, setRoiYears] = useState('5');

  const [copied, setCopied] = useState(false);

  // 1. Loan results
  const loanResult = useMemo(() => {
    const p = parseFloat(loanAmount);
    const r = parseFloat(loanRate);
    const y = parseFloat(loanYears);
    if (isNaN(p) || isNaN(r) || isNaN(y) || p <= 0 || y <= 0) return null;
    return calculateLoanAmortization(p, r, y);
  }, [loanAmount, loanRate, loanYears]);

  // 2. Compound results
  const compoundResult = useMemo(() => {
    const p = parseFloat(initialDeposit);
    const m = parseFloat(monthlyAddition);
    const r = parseFloat(compoundRate);
    const y = parseFloat(compoundYears);
    if (isNaN(p) || isNaN(m) || isNaN(r) || isNaN(y) || y <= 0) return null;
    return calculateCompoundInterest(p, m, r, y);
  }, [initialDeposit, monthlyAddition, compoundRate, compoundYears]);

  // 3. Goal results: Required PMT = (FV - PV*(1+r)^n) * (r / ((1+r)^n - 1))
  const goalResult = useMemo(() => {
    const fv = parseFloat(targetGoal);
    const pv = parseFloat(startSavings);
    const y = parseFloat(goalYears);
    const rAnnual = parseFloat(goalRate) / 100;
    if (isNaN(fv) || isNaN(pv) || isNaN(y) || isNaN(rAnnual) || y <= 0) return null;

    const n = y * 12;
    const rMonthly = rAnnual / 12;

    const futureValueOfPV = pv * Math.pow(1 + rMonthly, n);
    const remainingNeeded = Math.max(0, fv - futureValueOfPV);

    let monthlyNeeded = 0;
    if (rMonthly === 0) {
      monthlyNeeded = remainingNeeded / n;
    } else {
      monthlyNeeded = (remainingNeeded * rMonthly) / (Math.pow(1 + rMonthly, n) - 1);
    }

    return {
      monthlySavings: Math.max(0, monthlyNeeded),
      totalDeposited: pv + monthlyNeeded * n,
      interestEarned: Math.max(0, fv - (pv + monthlyNeeded * n)),
    };
  }, [targetGoal, startSavings, goalYears, goalRate]);

  // 4. ROI results
  const roiResult = useMemo(() => {
    const initial = parseFloat(initialInv);
    const finalVal = parseFloat(finalInv);
    const y = parseFloat(roiYears);
    if (isNaN(initial) || isNaN(finalVal) || isNaN(y) || initial <= 0 || y <= 0)
      return null;

    const netProfit = finalVal - initial;
    const totalRoi = (netProfit / initial) * 100;
    // CAGR = (Final / Initial)^(1 / Years) - 1
    const cagr = (Math.pow(finalVal / initial, 1 / y) - 1) * 100;

    return { netProfit, totalRoi, cagr };
  }, [initialInv, finalInv, roiYears]);

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Copied ${title}`);
    setTimeout(() => setCopied(false), 2000);

    addHistory({
      mode: 'financial',
      modeName: 'Financial Calculator',
      expression: title,
      result: text,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Tool Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setTool('loan')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            tool === 'loan'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Mortgage & Loan
        </button>
        <button
          onClick={() => setTool('compound')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            tool === 'compound'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Compound Interest
        </button>
        <button
          onClick={() => setTool('goal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            tool === 'goal'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Savings Goal
        </button>
        <button
          onClick={() => setTool('roi')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            tool === 'roi'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          ROI & CAGR
        </button>
      </div>

      {/* Tool 1: Mortgage & Loan */}
      {tool === 'loan' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Loan Amount ($)
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full p-2.5 font-mono text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.01"
                value={loanRate}
                onChange={(e) => setLoanRate(e.target.value)}
                className="w-full p-2.5 font-mono text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Loan Term (Years)
              </label>
              <input
                type="number"
                value={loanYears}
                onChange={(e) => setLoanYears(e.target.value)}
                className="w-full p-2.5 font-mono text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {loanResult && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                    Monthly Payment
                  </div>
                  <div className="text-3xl font-bold font-mono text-indigo-950 dark:text-indigo-100 mt-1">
                    ${loanResult.monthlyPayment.toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleCopy(`$${loanResult.monthlyPayment.toFixed(2)}/mo`, 'Monthly loan payment')
                  }
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  Copy
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="text-slate-400 font-sans">Total Payments</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    ${loanResult.totalPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="text-slate-400 font-sans">Total Interest Cost</div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                    ${loanResult.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool 2: Compound Interest */}
      {tool === 'compound' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Initial Principal ($)
              </label>
              <input
                type="number"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                className="w-full p-2.5 font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Monthly Add ($)
              </label>
              <input
                type="number"
                value={monthlyAddition}
                onChange={(e) => setMonthlyAddition(e.target.value)}
                className="w-full p-2.5 font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Annual Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={compoundRate}
                onChange={(e) => setCompoundRate(e.target.value)}
                className="w-full p-2.5 font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Time Horizon (Yrs)
              </label>
              <input
                type="number"
                value={compoundYears}
                onChange={(e) => setCompoundYears(e.target.value)}
                className="w-full p-2.5 font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {compoundResult && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                    Projected Future Value
                  </div>
                  <div className="text-3xl font-bold font-mono text-emerald-950 dark:text-emerald-100 mt-1">
                    ${Math.round(compoundResult.futureValue).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      `$${Math.round(compoundResult.futureValue).toLocaleString()}`,
                      'Future value'
                    )
                  }
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                >
                  Copy
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="text-slate-400 font-sans">Total Contributed</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    ${Math.round(compoundResult.totalPrincipalInvested).toLocaleString()}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="text-slate-400 font-sans">Compound Interest Earned</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    +${Math.round(compoundResult.totalInterestEarned).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool 3: Savings Goal */}
      {tool === 'goal' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Target Amount ($)
              </label>
              <input
                type="number"
                value={targetGoal}
                onChange={(e) => setTargetGoal(e.target.value)}
                className="w-full p-2.5 font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Current Savings ($)
              </label>
              <input
                type="number"
                value={startSavings}
                onChange={(e) => setStartSavings(e.target.value)}
                className="w-full p-2.5 font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Years to Goal</label>
              <input
                type="number"
                value={goalYears}
                onChange={(e) => setGoalYears(e.target.value)}
                className="w-full p-2.5 font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Expected Return (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={goalRate}
                onChange={(e) => setGoalRate(e.target.value)}
                className="w-full p-2.5 font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {goalResult && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
              <div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                  Required Monthly Deposit
                </div>
                <div className="text-3xl font-bold font-mono text-indigo-950 dark:text-indigo-100 mt-1">
                  ${Math.round(goalResult.monthlySavings).toLocaleString()} / month
                </div>
                <div className="text-xs font-mono text-indigo-700/80 dark:text-indigo-300/80 mt-1">
                  Compound interest will generate ${Math.round(goalResult.interestEarned).toLocaleString()} of the total
                </div>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    `$${Math.round(goalResult.monthlySavings)}/month`,
                    'Required monthly savings'
                  )
                }
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tool 4: ROI */}
      {tool === 'roi' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Initial Investment ($)
              </label>
              <input
                type="number"
                value={initialInv}
                onChange={(e) => setInitialInv(e.target.value)}
                className="w-full p-2.5 font-mono text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Ending Value ($)
              </label>
              <input
                type="number"
                value={finalInv}
                onChange={(e) => setFinalInv(e.target.value)}
                className="w-full p-2.5 font-mono text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Investment Length (Years)
              </label>
              <input
                type="number"
                value={roiYears}
                onChange={(e) => setRoiYears(e.target.value)}
                className="w-full p-2.5 font-mono text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {roiResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-2">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                <div className="text-slate-400 font-sans">Total Net Profit</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  ${roiResult.netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Total ROI (%)</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {roiResult.totalRoi >= 0 ? `+${roiResult.totalRoi.toFixed(2)}%` : `${roiResult.totalRoi.toFixed(2)}%`}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-400 font-sans">Annualized CAGR (%)</div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {roiResult.cagr.toFixed(2)}% / yr
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
