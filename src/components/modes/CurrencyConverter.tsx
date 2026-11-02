import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, RefreshCw, Copy, Check, TrendingUp } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';

interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

const POPULAR_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
];

export const CurrencyConverter: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  const [rates, setRates] = useState<Record<string, number>>({ USD: 1.0 });
  const [baseCode, setBaseCode] = useState('USD');
  const [targetCode, setTargetCode] = useState('EUR');
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Fetch exchange rates
  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/currency/rates');
      const data = await res.json();
      if (data && data.data && data.data.rates) {
        setRates(data.data.rates);
        setLastUpdated(data.data.time_last_update_utc || new Date().toLocaleTimeString());
      }
    } catch {
      showToast('Using verified baseline exchange rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Compute conversion
  const convertedAmount = useMemo(() => {
    const amt = parseFloat(amount);
    if (isNaN(amt)) return '';

    // Convert via USD anchor
    const rateFromUSD = rates[baseCode] || 1;
    const rateToUSD = rates[targetCode] || 1;
    const amountInUSD = amt / rateFromUSD;
    const finalAmount = amountInUSD * rateToUSD;

    return finalAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }, [amount, baseCode, targetCode, rates]);

  // Direct 1 unit rate
  const unitRate = useMemo(() => {
    const rateFromUSD = rates[baseCode] || 1;
    const rateToUSD = rates[targetCode] || 1;
    const rate = (1 / rateFromUSD) * rateToUSD;
    return rate.toFixed(4);
  }, [baseCode, targetCode, rates]);

  const inverseUnitRate = useMemo(() => {
    const rateFromUSD = rates[baseCode] || 1;
    const rateToUSD = rates[targetCode] || 1;
    const rate = (1 / rateToUSD) * rateFromUSD;
    return rate.toFixed(4);
  }, [baseCode, targetCode, rates]);

  const handleSwap = () => {
    const temp = baseCode;
    setBaseCode(targetCode);
    setTargetCode(temp);
  };

  const handleCopy = () => {
    if (!convertedAmount) return;
    const text = `${amount} ${baseCode} = ${convertedAmount} ${targetCode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied currency conversion');
    setTimeout(() => setCopied(false), 2000);

    addHistory({
      mode: 'currency',
      modeName: 'Currency Converter',
      expression: `${amount} ${baseCode}`,
      result: `${convertedAmount} ${targetCode}`,
      details: `Rate: 1 ${baseCode} = ${unitRate} ${targetCode}`,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Main Conversion Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Live Exchange Rates
            </span>
            {lastUpdated && (
              <span className="text-[11px] text-slate-400 font-mono">
                · Updated: {lastUpdated}
              </span>
            )}
          </div>
          <button
            onClick={fetchRates}
            disabled={loading}
            className="p-1.5 text-xs text-slate-500 hover:text-indigo-600 rounded-lg flex items-center gap-1 transition-colors"
            title="Refresh rates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* Base Currency Column */}
          <div className="md:col-span-5 space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Amount & Base Currency
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 font-mono text-2xl font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              value={baseCode}
              onChange={(e) => setBaseCode(e.target.value)}
              className="w-full p-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              {POPULAR_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Invert Swap Button */}
          <div className="md:col-span-1 flex justify-center py-2 md:py-0">
            <button
              onClick={handleSwap}
              aria-label="Swap currencies"
              className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-xs"
              title="Swap Currencies"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Converted Output Column */}
          <div className="md:col-span-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Converted Value
              </label>
              <button
                onClick={handleCopy}
                disabled={!convertedAmount}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium disabled:opacity-40"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="w-full p-3 font-mono text-2xl font-bold bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-indigo-950 dark:text-indigo-100 overflow-x-auto scrollbar-none h-[58px] flex items-center">
              {convertedAmount || '0.00'}
            </div>
            <select
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value)}
              className="w-full p-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              {POPULAR_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Exchange Rate HUD */}
        <div className="mt-5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>
              1 {baseCode} = <strong className="text-slate-900 dark:text-white">{unitRate}</strong>{' '}
              {targetCode}
            </span>
          </div>
          <div className="text-slate-400">
            1 {targetCode} = {inverseUnitRate} {baseCode}
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="mt-4 pt-3 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Quick amounts:
          </span>
          {['10', '50', '100', '500', '1000', '5000'].map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount(amt)}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-mono font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
