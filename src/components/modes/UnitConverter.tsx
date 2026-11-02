import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Copy, Check } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';

interface UnitCategory {
  id: string;
  name: string;
  units: { id: string; name: string; ratioToBase: number; offset?: number }[];
  baseUnit: string;
}

const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    baseUnit: 'm',
    units: [
      { id: 'm', name: 'Meters (m)', ratioToBase: 1 },
      { id: 'km', name: 'Kilometers (km)', ratioToBase: 1000 },
      { id: 'cm', name: 'Centimeters (cm)', ratioToBase: 0.01 },
      { id: 'mm', name: 'Millimeters (mm)', ratioToBase: 0.001 },
      { id: 'mi', name: 'Miles (mi)', ratioToBase: 1609.344 },
      { id: 'yd', name: 'Yards (yd)', ratioToBase: 0.9144 },
      { id: 'ft', name: 'Feet (ft)', ratioToBase: 0.3048 },
      { id: 'in', name: 'Inches (in)', ratioToBase: 0.0254 },
      { id: 'nmi', name: 'Nautical Miles', ratioToBase: 1852 },
    ],
  },
  {
    id: 'mass',
    name: 'Mass & Weight',
    baseUnit: 'kg',
    units: [
      { id: 'kg', name: 'Kilograms (kg)', ratioToBase: 1 },
      { id: 'g', name: 'Grams (g)', ratioToBase: 0.001 },
      { id: 'mg', name: 'Milligrams (mg)', ratioToBase: 0.000001 },
      { id: 't', name: 'Metric Tons (t)', ratioToBase: 1000 },
      { id: 'lb', name: 'Pounds (lb)', ratioToBase: 0.45359237 },
      { id: 'oz', name: 'Ounces (oz)', ratioToBase: 0.02834952 },
      { id: 'st', name: 'Stone (st)', ratioToBase: 6.35029318 },
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    baseUnit: 'C',
    units: [
      { id: 'C', name: 'Celsius (°C)', ratioToBase: 1 },
      { id: 'F', name: 'Fahrenheit (°F)', ratioToBase: 1 }, // Handled specially
      { id: 'K', name: 'Kelvin (K)', ratioToBase: 1 },
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    baseUnit: 'mps',
    units: [
      { id: 'mps', name: 'Meters / sec (m/s)', ratioToBase: 1 },
      { id: 'kph', name: 'Kilometers / hour (km/h)', ratioToBase: 0.277778 },
      { id: 'mph', name: 'Miles / hour (mph)', ratioToBase: 0.44704 },
      { id: 'knot', name: 'Knots (kn)', ratioToBase: 0.514444 },
      { id: 'fps', name: 'Feet / sec (ft/s)', ratioToBase: 0.3048 },
      { id: 'mach', name: 'Mach (speed of sound)', ratioToBase: 343 },
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    baseUnit: 'l',
    units: [
      { id: 'l', name: 'Liters (L)', ratioToBase: 1 },
      { id: 'ml', name: 'Milliliters (mL)', ratioToBase: 0.001 },
      { id: 'm3', name: 'Cubic Meters (m³)', ratioToBase: 1000 },
      { id: 'gal_us', name: 'Gallons (US)', ratioToBase: 3.78541 },
      { id: 'qt_us', name: 'Quarts (US)', ratioToBase: 0.946353 },
      { id: 'pt_us', name: 'Pints (US)', ratioToBase: 0.473176 },
      { id: 'cup_us', name: 'Cups (US)', ratioToBase: 0.236588 },
      { id: 'floz_us', name: 'Fluid Ounces (US)', ratioToBase: 0.0295735 },
    ],
  },
  {
    id: 'area',
    name: 'Area',
    baseUnit: 'm2',
    units: [
      { id: 'm2', name: 'Square Meters (m²)', ratioToBase: 1 },
      { id: 'km2', name: 'Square Kilometers (km²)', ratioToBase: 1000000 },
      { id: 'ha', name: 'Hectares (ha)', ratioToBase: 10000 },
      { id: 'acre', name: 'Acres (ac)', ratioToBase: 4046.85642 },
      { id: 'sqft', name: 'Square Feet (ft²)', ratioToBase: 0.092903 },
      { id: 'sqyd', name: 'Square Yards (yd²)', ratioToBase: 0.836127 },
      { id: 'sqmi', name: 'Square Miles (mi²)', ratioToBase: 2589988 },
    ],
  },
  {
    id: 'storage',
    name: 'Digital Storage',
    baseUnit: 'b',
    units: [
      { id: 'b', name: 'Bytes (B)', ratioToBase: 1 },
      { id: 'kb', name: 'Kilobytes (KB - 1000)', ratioToBase: 1000 },
      { id: 'kib', name: 'Kibibytes (KiB - 1024)', ratioToBase: 1024 },
      { id: 'mb', name: 'Megabytes (MB)', ratioToBase: 1000000 },
      { id: 'mib', name: 'Mebibytes (MiB)', ratioToBase: 1048576 },
      { id: 'gb', name: 'Gigabytes (GB)', ratioToBase: 1000000000 },
      { id: 'gib', name: 'Gibibytes (GiB)', ratioToBase: 1073741824 },
      { id: 'tb', name: 'Terabytes (TB)', ratioToBase: 1e12 },
    ],
  },
  {
    id: 'energy',
    name: 'Energy',
    baseUnit: 'j',
    units: [
      { id: 'j', name: 'Joules (J)', ratioToBase: 1 },
      { id: 'kj', name: 'Kilojoules (kJ)', ratioToBase: 1000 },
      { id: 'cal', name: 'Calories (cal)', ratioToBase: 4.184 },
      { id: 'kcal', name: 'Kilocalories / Food Cal (kcal)', ratioToBase: 4184 },
      { id: 'wh', name: 'Watt-hours (Wh)', ratioToBase: 3600 },
      { id: 'kwh', name: 'Kilowatt-hours (kWh)', ratioToBase: 3600000 },
      { id: 'btu', name: 'BTU', ratioToBase: 1055.06 },
    ],
  },
  {
    id: 'pressure',
    name: 'Pressure',
    baseUnit: 'pa',
    units: [
      { id: 'pa', name: 'Pascals (Pa)', ratioToBase: 1 },
      { id: 'kpa', name: 'Kilopascals (kPa)', ratioToBase: 1000 },
      { id: 'bar', name: 'Bar', ratioToBase: 100000 },
      { id: 'psi', name: 'Pound / sq inch (psi)', ratioToBase: 6894.76 },
      { id: 'atm', name: 'Standard Atmospheres (atm)', ratioToBase: 101325 },
      { id: 'torr', name: 'Torr (mmHg)', ratioToBase: 133.322 },
    ],
  },
];

export const UnitConverter: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  const [activeCategoryId, setActiveCategoryId] = useState('length');
  const [inputValue, setInputValue] = useState<string>('1');
  const [fromUnitId, setFromUnitId] = useState<string>('m');
  const [toUnitId, setToUnitId] = useState<string>('ft');
  const [copied, setCopied] = useState(false);

  const activeCategory =
    UNIT_CATEGORIES.find((c) => c.id === activeCategoryId) || UNIT_CATEGORIES[0];

  // When changing category, set reasonable default units
  const handleCategoryChange = (catId: string) => {
    setActiveCategoryId(catId);
    const cat = UNIT_CATEGORIES.find((c) => c.id === catId);
    if (cat && cat.units.length >= 2) {
      setFromUnitId(cat.units[0].id);
      setToUnitId(cat.units[1].id);
    }
  };

  // Convert function
  const convertedValue = useMemo(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return '';

    if (activeCategory.id === 'temperature') {
      let celsius = val;
      if (fromUnitId === 'F') celsius = ((val - 32) * 5) / 9;
      else if (fromUnitId === 'K') celsius = val - 273.15;

      if (toUnitId === 'C') return parseFloat(celsius.toFixed(4)).toString();
      if (toUnitId === 'F') return parseFloat(((celsius * 9) / 5 + 32).toFixed(4)).toString();
      if (toUnitId === 'K') return parseFloat((celsius + 273.15).toFixed(4)).toString();
      return '';
    }

    const fromUnit = activeCategory.units.find((u) => u.id === fromUnitId);
    const toUnit = activeCategory.units.find((u) => u.id === toUnitId);
    if (!fromUnit || !toUnit) return '';

    const baseVal = val * fromUnit.ratioToBase;
    const targetVal = baseVal / toUnit.ratioToBase;

    // Format nicely without scientific jitter
    if (Math.abs(targetVal) >= 1e9 || (Math.abs(targetVal) < 1e-6 && targetVal !== 0)) {
      return targetVal.toExponential(6);
    }
    return parseFloat(targetVal.toFixed(6)).toString();
  }, [inputValue, fromUnitId, toUnitId, activeCategory]);

  const handleSwap = () => {
    const temp = fromUnitId;
    setFromUnitId(toUnitId);
    setToUnitId(temp);
  };

  const handleCopy = () => {
    if (!convertedValue) return;
    const fromUnitName = activeCategory.units.find((u) => u.id === fromUnitId)?.name;
    const toUnitName = activeCategory.units.find((u) => u.id === toUnitId)?.name;
    const text = `${inputValue} ${fromUnitName} = ${convertedValue} ${toUnitName}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied conversion');
    setTimeout(() => setCopied(false), 2000);

    addHistory({
      mode: 'unit-converter',
      modeName: 'Unit Converter',
      expression: `${inputValue} ${fromUnitId}`,
      result: `${convertedValue} ${toUnitId}`,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {UNIT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategoryId === cat.id
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Conversion Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* Source Input Column */}
          <div className="md:col-span-5 space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              From
            </label>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="0"
              className="w-full p-3 font-mono text-xl font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              value={fromUnitId}
              onChange={(e) => setFromUnitId(e.target.value)}
              className="w-full p-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              {activeCategory.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center py-2 md:py-0">
            <button
              onClick={handleSwap}
              aria-label="Swap units"
              className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-xs"
              title="Swap Units"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Target Output Column */}
          <div className="md:col-span-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                To (Converted)
              </label>
              <button
                onClick={handleCopy}
                disabled={!convertedValue}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium disabled:opacity-40"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="w-full p-3 font-mono text-xl font-bold bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-indigo-950 dark:text-indigo-100 overflow-x-auto scrollbar-none h-[54px] flex items-center">
              {convertedValue || '0'}
            </div>
            <select
              value={toUnitId}
              onChange={(e) => setToUnitId(e.target.value)}
              className="w-full p-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              {activeCategory.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Multi-Unit Reference Table */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Equivalent Values in Other {activeCategory.name} Units
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {activeCategory.units
              .filter((u) => u.id !== toUnitId)
              .slice(0, 8)
              .map((u) => {
                const val = parseFloat(inputValue);
                let eqStr = '—';
                if (!isNaN(val)) {
                  if (activeCategory.id === 'temperature') {
                    let c = val;
                    if (fromUnitId === 'F') c = ((val - 32) * 5) / 9;
                    else if (fromUnitId === 'K') c = val - 273.15;
                    if (u.id === 'C') eqStr = c.toFixed(2) + ' °C';
                    else if (u.id === 'F') eqStr = ((c * 9) / 5 + 32).toFixed(2) + ' °F';
                    else if (u.id === 'K') eqStr = (c + 273.15).toFixed(2) + ' K';
                  } else {
                    const fromUnit = activeCategory.units.find((x) => x.id === fromUnitId);
                    if (fromUnit) {
                      const res = (val * fromUnit.ratioToBase) / u.ratioToBase;
                      eqStr = parseFloat(res.toFixed(4)).toString() + ' ' + u.id;
                    }
                  }
                }
                return (
                  <div
                    key={u.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs"
                  >
                    <div className="text-slate-400 font-medium truncate">{u.name}</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {eqStr}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
