import React, { useState, useMemo } from 'react';
import { Calendar, Clock, ArrowRight, Copy, Check, Plus, Minus } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';

export const DateTimeCalculator: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  const [activeTab, setActiveTab] = useState<'diff' | 'add-sub' | 'duration'>('diff');

  // Tab 1: Date Difference
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Tab 2: Add/Subtract
  const [baseDate, setBaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [direction, setDirection] = useState<'add' | 'sub'>('add');
  const [addYears, setAddYears] = useState('0');
  const [addMonths, setAddMonths] = useState('1');
  const [addWeeks, setAddWeeks] = useState('0');
  const [addDays, setAddDays] = useState('15');

  // Tab 3: Time Duration
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('17:30:00');

  const [copied, setCopied] = useState(false);

  // Date difference computation
  const diffResults = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const absDays = Math.abs(diffDays);

    // Business days count (excluding Sat/Sun)
    let businessDays = 0;
    const cur = new Date(start);
    const step = start < end ? 1 : -1;
    while ((step > 0 && cur < end) || (step < 0 && cur > end)) {
      cur.setDate(cur.getDate() + step);
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }

    const weeks = Math.floor(absDays / 7);
    const remainingDays = absDays % 7;

    return {
      totalDays: absDays,
      weeks,
      remainingDays,
      businessDays,
      totalHours: absDays * 24,
      isNegative: diffDays < 0,
    };
  }, [startDate, endDate]);

  // Add/Sub computation
  const calculatedTargetDate = useMemo(() => {
    const d = new Date(baseDate);
    if (isNaN(d.getTime())) return null;

    const mult = direction === 'add' ? 1 : -1;
    const y = parseInt(addYears) || 0;
    const m = parseInt(addMonths) || 0;
    const w = parseInt(addWeeks) || 0;
    const days = parseInt(addDays) || 0;

    d.setFullYear(d.getFullYear() + y * mult);
    d.setMonth(d.getMonth() + m * mult);
    d.setDate(d.getDate() + (w * 7 + days) * mult);

    return {
      iso: d.toISOString().split('T')[0],
      formatted: d.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  }, [baseDate, direction, addYears, addMonths, addWeeks, addDays]);

  // Time duration computation
  const durationResult = useMemo(() => {
    const parseTime = (str: string) => {
      const parts = str.split(':').map((p) => parseInt(p, 10) || 0);
      return parts[0] * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    };

    let sSec = parseTime(startTime);
    let eSec = parseTime(endTime);
    if (eSec < sSec) eSec += 24 * 3600; // Next day rollover

    const diff = eSec - sSec;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    const decimalHours = (diff / 3600).toFixed(2);

    return { hours, minutes, seconds, decimalHours };
  }, [startTime, endTime]);

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Copied ${title}`);
    setTimeout(() => setCopied(false), 2000);

    addHistory({
      mode: 'datetime',
      modeName: 'Date & Time Calculator',
      expression: title,
      result: text,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Tab Selector */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('diff')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'diff'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Date Difference
        </button>
        <button
          onClick={() => setActiveTab('add-sub')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'add-sub'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Add / Subtract Time
        </button>
        <button
          onClick={() => setActiveTab('duration')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'duration'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Time Duration
        </button>
      </div>

      {/* Tab 1: Date Difference */}
      {activeTab === 'diff' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-3 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-3 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {diffResults && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                <div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                    Total Difference
                  </div>
                  <div className="text-3xl font-bold font-mono text-indigo-950 dark:text-indigo-100 mt-0.5">
                    {diffResults.totalDays} Days
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(`${diffResults.totalDays} days`, 'Date difference')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="text-slate-400">Weeks & Days</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {diffResults.weeks}w {diffResults.remainingDays}d
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="text-slate-400">Business Days</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {diffResults.businessDays} days
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="text-slate-400">Total Hours</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {diffResults.totalHours.toLocaleString()} hrs
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="text-slate-400">Direction</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {diffResults.isNegative ? 'Past' : 'Future'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Add or Subtract Time from Date */}
      {activeTab === 'add-sub' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Starting Base Date
              </label>
              <input
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                className="w-full p-3 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Operation
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => setDirection('add')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                    direction === 'add'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
                <button
                  onClick={() => setDirection('sub')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                    direction === 'sub'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  Sub
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Years</label>
              <input
                type="number"
                min="0"
                value={addYears}
                onChange={(e) => setAddYears(e.target.value)}
                className="w-full p-2.5 font-mono text-center font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Months</label>
              <input
                type="number"
                min="0"
                value={addMonths}
                onChange={(e) => setAddMonths(e.target.value)}
                className="w-full p-2.5 font-mono text-center font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Weeks</label>
              <input
                type="number"
                min="0"
                value={addWeeks}
                onChange={(e) => setAddWeeks(e.target.value)}
                className="w-full p-2.5 font-mono text-center font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Days</label>
              <input
                type="number"
                min="0"
                value={addDays}
                onChange={(e) => setAddDays(e.target.value)}
                className="w-full p-2.5 font-mono text-center font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {calculatedTargetDate && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
              <div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                  Resulting Date
                </div>
                <div className="text-xl sm:text-2xl font-bold text-indigo-950 dark:text-indigo-100 mt-1">
                  {calculatedTargetDate.formatted}
                </div>
                <div className="text-xs font-mono text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                  ISO: {calculatedTargetDate.iso}
                </div>
              </div>
              <button
                onClick={() => handleCopy(calculatedTargetDate.formatted, 'Calculated date')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Time Duration */}
      {activeTab === 'duration' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                step="1"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                End Time
              </label>
              <input
                type="time"
                step="1"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-3 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                Elapsed Duration
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-indigo-950 dark:text-indigo-100 mt-0.5">
                {durationResult.hours}h {durationResult.minutes}m {durationResult.seconds}s
              </div>
              <div className="text-xs font-mono text-indigo-700/80 dark:text-indigo-300/80 mt-1">
                Decimal Hours: {durationResult.decimalHours} hrs
              </div>
            </div>
            <button
              onClick={() =>
                handleCopy(
                  `${durationResult.hours}h ${durationResult.minutes}m ${durationResult.seconds}s`,
                  'Time duration'
                )
              }
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
