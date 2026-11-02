import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Table, Eye, EyeOff } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { evaluateMathExpression } from '../../utils/mathEngine';

interface FunctionCurve {
  id: string;
  label: string;
  expression: string;
  color: string;
  visible: boolean;
}

export const GraphingCalculator: React.FC = () => {
  const { showToast } = useCalculator();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Curves state
  const [fExpr, setFExpr] = useState('sin(x)');
  const [gExpr, setGExpr] = useState('0.5 * x^2 - 2');
  const [showG, setShowG] = useState(false);
  const [showDerivative, setShowDerivative] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Viewport transformation: center in math coordinates & scale (pixels per math unit)
  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);
  const [scale, setScale] = useState(40); // 40px per 1 unit

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; fVal: number | null } | null>(
    null
  );

  // Evaluate function safely at math x
  const evalFunc = useCallback((exprStr: string, xVal: number): number | null => {
    try {
      const sanitized = exprStr.replace(/\bx\b/g, `(${xVal})`);
      const val = evaluateMathExpression(sanitized, 'rad');
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return val;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Canvas drawing loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Determine math bounding box
    const halfW = width / 2;
    const halfH = height / 2;
    const originCanvasX = halfW - centerX * scale;
    const originCanvasY = halfH + centerY * scale;

    const isDark = document.documentElement.classList.contains('dark');

    // 1. Draw Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? '#1e293b' : '#f1f5f9';

    // Unit step sizing
    let unitStep = 1;
    if (scale < 15) unitStep = 5;
    else if (scale < 30) unitStep = 2;
    else if (scale > 100) unitStep = 0.5;

    const xMin = centerX - halfW / scale;
    const xMax = centerX + halfW / scale;
    const yMin = centerY - halfH / scale;
    const yMax = centerY + halfH / scale;

    const startX = Math.floor(xMin / unitStep) * unitStep;
    const endX = Math.ceil(xMax / unitStep) * unitStep;
    const startY = Math.floor(yMin / unitStep) * unitStep;
    const endY = Math.ceil(yMax / unitStep) * unitStep;

    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';

    // Vertical grid lines & X ticks
    for (let x = startX; x <= endX; x += unitStep) {
      const cx = originCanvasX + x * scale;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();

      if (Math.abs(x) > 1e-6) {
        ctx.fillText(x.toFixed(unitStep < 1 ? 1 : 0), cx + 4, Math.min(Math.max(originCanvasY + 14, 20), height - 10));
      }
    }

    // Horizontal grid lines & Y ticks
    for (let y = startY; y <= endY; y += unitStep) {
      const cy = originCanvasY - y * scale;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();

      if (Math.abs(y) > 1e-6) {
        ctx.fillText(y.toFixed(unitStep < 1 ? 1 : 0), Math.min(Math.max(originCanvasX + 4, 10), width - 35), cy - 4);
      }
    }

    // 2. Draw Main Axes (X and Y)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';

    // X Axis
    ctx.beginPath();
    ctx.moveTo(0, originCanvasY);
    ctx.lineTo(width, originCanvasY);
    ctx.stroke();

    // Y Axis
    ctx.beginPath();
    ctx.moveTo(originCanvasX, 0);
    ctx.lineTo(originCanvasX, height);
    ctx.stroke();

    // Origin label (0,0)
    ctx.fillText('0', originCanvasX + 4, originCanvasY - 4);

    // 3. Plot Curve f(x)
    const plotCurve = (expr: string, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5 * dpr;
      ctx.beginPath();

      let isDrawing = false;
      const stepPixels = 1; // 1 pixel resolution for crisp curves

      for (let px = 0; px <= width; px += stepPixels) {
        const mathX = (px - originCanvasX) / scale;
        const mathY = evalFunc(expr, mathX);

        if (mathY !== null) {
          const py = originCanvasY - mathY * scale;
          if (py >= -height && py <= height * 2) {
            if (!isDrawing) {
              ctx.moveTo(px, py);
              isDrawing = true;
            } else {
              ctx.lineTo(px, py);
            }
          } else {
            isDrawing = false;
          }
        } else {
          isDrawing = false;
        }
      }
      ctx.stroke();
    };

    // Plot secondary curve g(x) if active
    if (showG && gExpr.trim()) {
      plotCurve(gExpr, '#f59e0b'); // amber-500
    }

    // Plot primary curve f(x)
    if (fExpr.trim()) {
      plotCurve(fExpr, '#6366f1'); // indigo-500
    }

    // 4. Draw Tangent Line (Derivative) & Crosshair point if hovering
    if (hoverCoord && hoverCoord.fVal !== null) {
      const hMathX = hoverCoord.x;
      const hMathY = hoverCoord.fVal;
      const hCanvasX = originCanvasX + hMathX * scale;
      const hCanvasY = originCanvasY - hMathY * scale;

      // Draw point on curve
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(hCanvasX, hCanvasY, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tangent line if requested
      if (showDerivative) {
        const delta = 0.0001;
        const yPlus = evalFunc(fExpr, hMathX + delta);
        const yMinus = evalFunc(fExpr, hMathX - delta);
        if (yPlus !== null && yMinus !== null) {
          const slope = (yPlus - yMinus) / (2 * delta);
          ctx.strokeStyle = '#10b981'; // emerald-500
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);

          const span = 4; // math units
          const x1 = hMathX - span;
          const y1 = hMathY - slope * span;
          const x2 = hMathX + span;
          const y2 = hMathY + slope * span;

          ctx.beginPath();
          ctx.moveTo(originCanvasX + x1 * scale, originCanvasY - y1 * scale);
          ctx.lineTo(originCanvasX + x2 * scale, originCanvasY - y2 * scale);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    ctx.restore();
  }, [centerX, centerY, scale, fExpr, gExpr, showG, showDerivative, hoverCoord, evalFunc]);

  // Sync canvas dimensions to container size
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      draw();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse wheel zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setScale((prev) => Math.max(8, Math.min(600, prev * zoomFactor)));
  };

  // Mouse drag panning
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (isDraggingRef.current) {
      const dx = (e.clientX - lastMousePosRef.current.x) * dpr;
      const dy = (e.clientY - lastMousePosRef.current.y) * dpr;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      setCenterX((prev) => prev - dx / scale);
      setCenterY((prev) => prev + dy / scale);
    } else {
      // Hover coordinate calculation
      const canvasX = (e.clientX - rect.left) * dpr;
      const halfW = canvas.width / 2;
      const halfH = canvas.height / 2;
      const originCanvasX = halfW - centerX * scale;
      const mathX = (canvasX - originCanvasX) / scale;
      const fVal = evalFunc(fExpr, mathX);

      setHoverCoord({
        x: mathX,
        y: (halfH + centerY * scale - (e.clientY - rect.top) * dpr) / scale,
        fVal,
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const resetView = () => {
    setCenterX(0);
    setCenterY(0);
    setScale(40);
    showToast('Reset view to origin');
  };

  // Presets
  const applyPreset = (presetName: string, f: string, g = '') => {
    setFExpr(f);
    if (g) {
      setGExpr(g);
      setShowG(true);
    } else {
      setShowG(false);
    }
    setCenterX(0);
    setCenterY(0);
    setScale(40);
    showToast(`Loaded preset: ${presetName}`);
  };

  // Table of Values computation
  const tableData = [];
  if (showTable) {
    for (let x = -5; x <= 5; x += 1) {
      const yF = evalFunc(fExpr, x);
      const yG = showG ? evalFunc(gExpr, x) : null;
      tableData.push({ x, yF, yG });
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Control Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          {/* Function 1 Input */}
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 shrink-0">
              f(x) =
            </span>
            <input
              type="text"
              value={fExpr}
              onChange={(e) => setFExpr(e.target.value)}
              placeholder="e.g. sin(x), x^2 - 4"
              className="w-full px-3 py-1.5 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Function 2 Input */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowG(!showG)}
              className="text-amber-500 font-mono font-bold text-sm shrink-0 flex items-center gap-1"
              title="Toggle secondary function"
            >
              {showG ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
              <span>g(x) =</span>
            </button>
            <input
              type="text"
              value={gExpr}
              disabled={!showG}
              onChange={(e) => setGExpr(e.target.value)}
              placeholder="e.g. cos(x), 0.5*x + 1"
              className="w-full px-3 py-1.5 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Presets and Viewport Toolbars */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Presets:
            </span>
            <button
              onClick={() => applyPreset('Sine & Cosine', 'sin(x)', 'cos(x)')}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap"
            >
              Trig Wave
            </button>
            <button
              onClick={() => applyPreset('Parabola', 'x^2 - 3', '2*x - 3')}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap"
            >
              Parabola & Tangent
            </button>
            <button
              onClick={() => applyPreset('Bell Curve', 'Math.E^(-(x^2))')}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap"
            >
              Gaussian Bell
            </button>
            <button
              onClick={() => applyPreset('Damped Oscillation', 'Math.E^(-0.2*x) * sin(3*x)')}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap"
            >
              Damped Wave
            </button>
          </div>

          {/* Interactive View Tools */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setShowDerivative(!showDerivative)}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                showDerivative
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Tangent / Slope
            </button>
            <button
              onClick={() => setShowTable(!showTable)}
              className={`p-1.5 rounded border transition-colors ${
                showTable
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 text-indigo-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
              title="Toggle Table of Values"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScale((prev) => Math.min(600, prev * 1.25))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScale((prev) => Math.max(8, prev * 0.8))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              title="Reset View to Origin"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Plot Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas Area */}
        <div className={`relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${showTable ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <canvas
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              isDraggingRef.current = false;
              setHoverCoord(null);
            }}
            className="w-full h-[460px] cursor-crosshair block"
          />

          {/* Coordinate HUD Overlay */}
          <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-300 shadow-xs pointer-events-none">
            {hoverCoord && hoverCoord.fVal !== null ? (
              <div className="space-y-0.5">
                <div>
                  <span className="text-slate-400">Point: </span>({hoverCoord.x.toFixed(3)}, {hoverCoord.fVal.toFixed(3)})
                </div>
                {showDerivative && (
                  <div className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                    f'(x) ≈{' '}
                    {((evalFunc(fExpr, hoverCoord.x + 0.001)! - evalFunc(fExpr, hoverCoord.x - 0.001)!) / 0.002).toFixed(3)}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <span className="text-slate-400">Center: </span>({centerX.toFixed(2)}, {centerY.toFixed(2)}) · Zoom: {(scale / 40).toFixed(1)}x
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="w-2.5 h-0.5 bg-indigo-500 rounded" />
              f(x)
            </span>
            {showG && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-500 rounded" />
                g(x)
              </span>
            )}
            <span className="text-slate-400 text-[10px]">Click & drag to pan · Scroll to zoom</span>
          </div>
        </div>

        {/* Table of Values Panel */}
        {showTable && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 overflow-y-auto max-h-[460px]">
            <div className="flex items-center justify-between font-semibold text-xs text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
              <span>Table of Values</span>
              <span className="text-[10px] text-slate-400 font-mono">Δx = 1</span>
            </div>
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-1">x</th>
                  <th className="py-1 text-indigo-600 dark:text-indigo-400">f(x)</th>
                  {showG && <th className="py-1 text-amber-500">g(x)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tableData.map((row) => (
                  <tr key={row.x} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-1 text-slate-600 dark:text-slate-300 font-medium">{row.x}</td>
                    <td className="py-1 text-slate-900 dark:text-white">
                      {row.yF !== null ? row.yF.toFixed(3) : 'undef'}
                    </td>
                    {showG && (
                      <td className="py-1 text-slate-900 dark:text-white">
                        {row.yG !== null ? row.yG.toFixed(3) : 'undef'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
