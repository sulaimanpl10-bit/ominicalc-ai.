import React, { useState, useMemo } from 'react';
import { Shapes, Copy, Check, Info } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';

type ShapeType =
  | 'circle'
  | 'triangle'
  | 'rectangle'
  | 'trapezoid'
  | 'polygon'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'cube'
  | 'prism';

interface ShapeConfig {
  id: ShapeType;
  name: string;
  dimension: '2D' | '3D';
  inputs: { key: string; label: string; default: number }[];
}

const SHAPES: ShapeConfig[] = [
  {
    id: 'circle',
    name: 'Circle',
    dimension: '2D',
    inputs: [{ key: 'r', label: 'Radius (r)', default: 5 }],
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    dimension: '2D',
    inputs: [
      { key: 'w', label: 'Width (w)', default: 8 },
      { key: 'h', label: 'Height (h)', default: 5 },
    ],
  },
  {
    id: 'triangle',
    name: 'Triangle',
    dimension: '2D',
    inputs: [
      { key: 'b', label: 'Base (b)', default: 6 },
      { key: 'h', label: 'Height (h)', default: 4 },
      { key: 's1', label: 'Side A', default: 5 },
      { key: 's2', label: 'Side B', default: 5 },
    ],
  },
  {
    id: 'trapezoid',
    name: 'Trapezoid',
    dimension: '2D',
    inputs: [
      { key: 'a', label: 'Top Base (a)', default: 4 },
      { key: 'b', label: 'Bottom Base (b)', default: 8 },
      { key: 'h', label: 'Height (h)', default: 5 },
    ],
  },
  {
    id: 'polygon',
    name: 'Regular Polygon',
    dimension: '2D',
    inputs: [
      { key: 'n', label: 'Number of Sides (n)', default: 6 },
      { key: 's', label: 'Side Length (s)', default: 4 },
    ],
  },
  {
    id: 'sphere',
    name: 'Sphere',
    dimension: '3D',
    inputs: [{ key: 'r', label: 'Radius (r)', default: 4 }],
  },
  {
    id: 'cylinder',
    name: 'Cylinder',
    dimension: '3D',
    inputs: [
      { key: 'r', label: 'Radius (r)', default: 3 },
      { key: 'h', label: 'Height (h)', default: 7 },
    ],
  },
  {
    id: 'cone',
    name: 'Cone',
    dimension: '3D',
    inputs: [
      { key: 'r', label: 'Radius (r)', default: 3 },
      { key: 'h', label: 'Height (h)', default: 5 },
    ],
  },
  {
    id: 'cube',
    name: 'Cube',
    dimension: '3D',
    inputs: [{ key: 'a', label: 'Side Length (a)', default: 4 }],
  },
  {
    id: 'prism',
    name: 'Rectangular Prism',
    dimension: '3D',
    inputs: [
      { key: 'l', label: 'Length (l)', default: 6 },
      { key: 'w', label: 'Width (w)', default: 4 },
      { key: 'h', label: 'Height (h)', default: 5 },
    ],
  },
];

export const GeometryCalculator: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  const [activeShapeId, setActiveShapeId] = useState<ShapeType>('circle');
  const [params, setParams] = useState<Record<string, number>>({
    r: 5,
    w: 8,
    h: 5,
    b: 6,
    s1: 5,
    s2: 5,
    a: 4,
    n: 6,
    s: 4,
    l: 6,
  });
  const [copied, setCopied] = useState(false);

  const activeShape = SHAPES.find((s) => s.id === activeShapeId) || SHAPES[0];

  const handleParamChange = (key: string, val: string) => {
    const num = parseFloat(val);
    setParams((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  // Shape geometric calculations
  const calculations = useMemo(() => {
    const p = params;
    switch (activeShapeId) {
      case 'circle': {
        const r = p.r || 0;
        const area = Math.PI * r * r;
        const perimeter = 2 * Math.PI * r;
        const diameter = 2 * r;
        return {
          primaryLabel: 'Area',
          primaryValue: area.toFixed(4),
          primaryFormula: 'A = π · r²',
          secondary: [
            { label: 'Circumference (C)', value: perimeter.toFixed(4), formula: 'C = 2πr' },
            { label: 'Diameter (d)', value: diameter.toFixed(4), formula: 'd = 2r' },
          ],
        };
      }
      case 'rectangle': {
        const w = p.w || 0;
        const h = p.h || 0;
        const area = w * h;
        const perimeter = 2 * (w + h);
        const diagonal = Math.sqrt(w * w + h * h);
        return {
          primaryLabel: 'Area',
          primaryValue: area.toFixed(4),
          primaryFormula: 'A = w · h',
          secondary: [
            { label: 'Perimeter (P)', value: perimeter.toFixed(4), formula: 'P = 2(w + h)' },
            { label: 'Diagonal (d)', value: diagonal.toFixed(4), formula: 'd = √(w² + h²)' },
          ],
        };
      }
      case 'triangle': {
        const b = p.b || 0;
        const h = p.h || 0;
        const s1 = p.s1 || 0;
        const s2 = p.s2 || 0;
        const area = 0.5 * b * h;
        const perimeter = b + s1 + s2;
        return {
          primaryLabel: 'Area',
          primaryValue: area.toFixed(4),
          primaryFormula: 'A = ½ · b · h',
          secondary: [
            { label: 'Perimeter (P)', value: perimeter.toFixed(4), formula: 'P = a + b + c' },
          ],
        };
      }
      case 'trapezoid': {
        const a = p.a || 0;
        const b = p.b || 0;
        const h = p.h || 0;
        const area = ((a + b) / 2) * h;
        return {
          primaryLabel: 'Area',
          primaryValue: area.toFixed(4),
          primaryFormula: 'A = ½ · (a + b) · h',
          secondary: [
            { label: 'Median Line', value: ((a + b) / 2).toFixed(4), formula: 'm = (a + b) / 2' },
          ],
        };
      }
      case 'polygon': {
        const n = Math.max(3, Math.round(p.n || 3));
        const s = p.s || 0;
        const perimeter = n * s;
        // Area = (n * s^2) / (4 * tan(pi / n))
        const area = (n * s * s) / (4 * Math.tan(Math.PI / n));
        const interiorAngle = ((n - 2) * 180) / n;
        return {
          primaryLabel: 'Area',
          primaryValue: area.toFixed(4),
          primaryFormula: 'A = (n · s²) / (4 · tan(π/n))',
          secondary: [
            { label: 'Perimeter (P)', value: perimeter.toFixed(4), formula: 'P = n · s' },
            { label: 'Interior Angle', value: `${interiorAngle.toFixed(2)}°`, formula: '(n-2)·180° / n' },
          ],
        };
      }
      case 'sphere': {
        const r = p.r || 0;
        const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
        const surfaceArea = 4 * Math.PI * r * r;
        return {
          primaryLabel: 'Volume',
          primaryValue: volume.toFixed(4),
          primaryFormula: 'V = ⁴⁄₃ · π · r³',
          secondary: [
            { label: 'Surface Area (A)', value: surfaceArea.toFixed(4), formula: 'A = 4πr²' },
          ],
        };
      }
      case 'cylinder': {
        const r = p.r || 0;
        const h = p.h || 0;
        const volume = Math.PI * r * r * h;
        const lateralArea = 2 * Math.PI * r * h;
        const totalArea = lateralArea + 2 * Math.PI * r * r;
        return {
          primaryLabel: 'Volume',
          primaryValue: volume.toFixed(4),
          primaryFormula: 'V = π · r² · h',
          secondary: [
            { label: 'Total Surface Area', value: totalArea.toFixed(4), formula: 'A = 2πr(r + h)' },
            { label: 'Lateral Surface Area', value: lateralArea.toFixed(4), formula: 'A_lat = 2πrh' },
          ],
        };
      }
      case 'cone': {
        const r = p.r || 0;
        const h = p.h || 0;
        const slantHeight = Math.sqrt(r * r + h * h);
        const volume = (1 / 3) * Math.PI * r * r * h;
        const surfaceArea = Math.PI * r * (r + slantHeight);
        return {
          primaryLabel: 'Volume',
          primaryValue: volume.toFixed(4),
          primaryFormula: 'V = ⅓ · π · r² · h',
          secondary: [
            { label: 'Slant Height (s)', value: slantHeight.toFixed(4), formula: 's = √(r² + h²)' },
            { label: 'Surface Area (A)', value: surfaceArea.toFixed(4), formula: 'A = πr(r + s)' },
          ],
        };
      }
      case 'cube': {
        const a = p.a || 0;
        const volume = Math.pow(a, 3);
        const surfaceArea = 6 * a * a;
        const spaceDiagonal = a * Math.sqrt(3);
        return {
          primaryLabel: 'Volume',
          primaryValue: volume.toFixed(4),
          primaryFormula: 'V = a³',
          secondary: [
            { label: 'Surface Area', value: surfaceArea.toFixed(4), formula: 'A = 6a²' },
            { label: 'Space Diagonal', value: spaceDiagonal.toFixed(4), formula: 'd = a√3' },
          ],
        };
      }
      case 'prism': {
        const l = p.l || 0;
        const w = p.w || 0;
        const h = p.h || 0;
        const volume = l * w * h;
        const surfaceArea = 2 * (l * w + l * h + w * h);
        const diagonal = Math.sqrt(l * l + w * w + h * h);
        return {
          primaryLabel: 'Volume',
          primaryValue: volume.toFixed(4),
          primaryFormula: 'V = l · w · h',
          secondary: [
            { label: 'Surface Area', value: surfaceArea.toFixed(4), formula: 'A = 2(lw + lh + wh)' },
            { label: 'Space Diagonal', value: diagonal.toFixed(4), formula: 'd = √(l² + w² + h²)' },
          ],
        };
      }
      default:
        return null;
    }
  }, [activeShapeId, params]);

  const handleCopy = () => {
    if (!calculations) return;
    const text = `${activeShape.name}: ${calculations.primaryLabel} = ${calculations.primaryValue}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied geometry result');
    setTimeout(() => setCopied(false), 2000);

    addHistory({
      mode: 'geometry',
      modeName: 'Geometry Calculator',
      expression: `${activeShape.name} (${calculations.primaryFormula})`,
      result: `${calculations.primaryLabel}: ${calculations.primaryValue}`,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Shapes Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SHAPES.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveShapeId(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeShapeId === s.id
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {s.name} ({s.dimension})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Parameters & Formula Input Column */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              {activeShape.name} Dimensions
            </h3>
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
              {activeShape.dimension}
            </span>
          </div>

          <div className="space-y-3">
            {activeShape.inputs.map((inp) => (
              <div key={inp.key}>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {inp.label}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={params[inp.key] ?? inp.default}
                  onChange={(e) => handleParamChange(inp.key, e.target.value)}
                  className="w-full p-2.5 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>

          {calculations && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-400 font-sans font-semibold">Formula:</div>
              <div className="text-indigo-600 dark:text-indigo-400 font-bold">
                {calculations.primaryFormula}
              </div>
            </div>
          )}
        </div>

        {/* Results & Visual Schematic Column */}
        <div className="md:col-span-7 space-y-4">
          {calculations && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              {/* Primary metric banner */}
              <div className="flex items-center justify-between p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                <div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                    {calculations.primaryLabel}
                  </div>
                  <div className="text-3xl font-bold font-mono text-indigo-950 dark:text-indigo-100 mt-0.5">
                    {calculations.primaryValue}
                  </div>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Secondary metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {calculations.secondary.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-mono"
                  >
                    <div className="text-slate-400 font-sans">{sec.label}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {sec.value}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{sec.formula}</div>
                  </div>
                ))}
              </div>

              {/* Parametric SVG Schematic */}
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Geometric Schematic
                </div>
                <div className="h-44 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-center p-4">
                  <svg className="w-full h-full max-h-36" viewBox="0 0 200 120">
                    {activeShapeId === 'circle' && (
                      <g>
                        <circle cx="100" cy="60" r="42" fill="none" stroke="#6366f1" strokeWidth="2.5" />
                        <line x1="100" y1="60" x2="142" y2="60" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                        <text x="118" y="55" fontSize="9" fill="#f59e0b" fontFamily="JetBrains Mono">
                          r = {params.r}
                        </text>
                      </g>
                    )}
                    {activeShapeId === 'rectangle' && (
                      <g>
                        <rect x="50" y="30" width="100" height="60" fill="none" stroke="#6366f1" strokeWidth="2.5" rx="3" />
                        <text x="100" y="24" fontSize="9" fill="#6366f1" textAnchor="middle" fontFamily="JetBrains Mono">
                          w = {params.w}
                        </text>
                        <text x="40" y="65" fontSize="9" fill="#6366f1" textAnchor="end" fontFamily="JetBrains Mono">
                          h = {params.h}
                        </text>
                      </g>
                    )}
                    {activeShapeId === 'triangle' && (
                      <g>
                        <polygon points="100,20 40,95 160,95" fill="none" stroke="#6366f1" strokeWidth="2.5" />
                        <line x1="100" y1="20" x2="100" y2="95" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                        <text x="105" y="60" fontSize="9" fill="#f59e0b" fontFamily="JetBrains Mono">
                          h = {params.h}
                        </text>
                        <text x="100" y="108" fontSize="9" fill="#6366f1" textAnchor="middle" fontFamily="JetBrains Mono">
                          b = {params.b}
                        </text>
                      </g>
                    )}
                    {activeShapeId === 'sphere' && (
                      <g>
                        <circle cx="100" cy="60" r="42" fill="none" stroke="#6366f1" strokeWidth="2.5" />
                        <ellipse cx="100" cy="60" rx="42" ry="14" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="100" y1="60" x2="142" y2="60" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                        <text x="118" y="55" fontSize="9" fill="#f59e0b" fontFamily="JetBrains Mono">
                          r = {params.r}
                        </text>
                      </g>
                    )}
                    {activeShapeId === 'cylinder' && (
                      <g>
                        <ellipse cx="100" cy="30" rx="40" ry="12" fill="none" stroke="#6366f1" strokeWidth="2" />
                        <line x1="60" y1="30" x2="60" y2="90" stroke="#6366f1" strokeWidth="2" />
                        <line x1="140" y1="30" x2="140" y2="90" stroke="#6366f1" strokeWidth="2" />
                        <ellipse cx="100" cy="90" rx="40" ry="12" fill="none" stroke="#6366f1" strokeWidth="2" />
                        <text x="45" y="65" fontSize="9" fill="#f59e0b" fontFamily="JetBrains Mono">
                          h = {params.h}
                        </text>
                        <line x1="100" y1="30" x2="140" y2="30" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2" />
                        <text x="115" y="25" fontSize="8" fill="#f59e0b" fontFamily="JetBrains Mono">
                          r = {params.r}
                        </text>
                      </g>
                    )}
                    {activeShapeId === 'cube' && (
                      <g>
                        <rect x="65" y="45" width="50" height="50" fill="none" stroke="#6366f1" strokeWidth="2" />
                        <rect x="85" y="25" width="50" height="50" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="2 2" />
                        <line x1="65" y1="45" x2="85" y2="25" stroke="#6366f1" strokeWidth="2" />
                        <line x1="115" y1="45" x2="135" y2="25" stroke="#6366f1" strokeWidth="2" />
                        <line x1="65" y1="95" x2="85" y2="75" stroke="#6366f1" strokeWidth="2" />
                        <line x1="115" y1="95" x2="135" y2="75" stroke="#6366f1" strokeWidth="2" />
                        <text x="90" y="108" fontSize="9" fill="#6366f1" textAnchor="middle" fontFamily="JetBrains Mono">
                          a = {params.a}
                        </text>
                      </g>
                    )}
                    {['trapezoid', 'polygon', 'cone', 'prism'].includes(activeShapeId) && (
                      <g>
                        <polygon points="70,30 130,30 160,90 40,90" fill="none" stroke="#6366f1" strokeWidth="2" />
                        <text x="100" y="65" fontSize="10" fill="#6366f1" textAnchor="middle" fontFamily="JetBrains Mono">
                          {activeShape.name}
                        </text>
                      </g>
                    )}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
