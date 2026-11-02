import React, { useState } from 'react';
import { Grid3X3, Copy, Check, ArrowRight, RotateCcw } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import {
  Matrix,
  createEmptyMatrix,
  addMatrices,
  subtractMatrices,
  multiplyMatrices,
  transposeMatrix,
  determinantMatrix,
  inverseMatrix,
  scalarMultiplyMatrix,
} from '../../utils/mathEngine';

export const MatrixCalculator: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  // Dimensions
  const [rowsA, setRowsA] = useState(2);
  const [colsA, setColsA] = useState(2);
  const [rowsB, setRowsB] = useState(2);
  const [colsB, setColsB] = useState(2);

  // Matrices
  const [matrixA, setMatrixA] = useState<Matrix>([
    [4, 7],
    [2, 6],
  ]);
  const [matrixB, setMatrixB] = useState<Matrix>([
    [1, 0],
    [3, 5],
  ]);

  const [scalarK, setScalarK] = useState(2);
  const [resultMatrix, setResultMatrix] = useState<Matrix | null>(null);
  const [scalarResult, setScalarResult] = useState<number | null>(null);
  const [operationLabel, setOperationLabel] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Resize Matrix helper
  const resizeMatrix = (
    current: Matrix,
    newRows: number,
    newCols: number,
    setter: (m: Matrix) => void
  ) => {
    const updated = createEmptyMatrix(newRows, newCols, 0);
    for (let r = 0; r < newRows; r++) {
      for (let c = 0; c < newCols; c++) {
        if (current[r] && current[r][c] !== undefined) {
          updated[r][c] = current[r][c];
        }
      }
    }
    setter(updated);
  };

  const handleRowsA = (r: number) => {
    setRowsA(r);
    resizeMatrix(matrixA, r, colsA, setMatrixA);
  };

  const handleColsA = (c: number) => {
    setColsA(c);
    resizeMatrix(matrixA, rowsA, c, setMatrixA);
  };

  const handleRowsB = (r: number) => {
    setRowsB(r);
    resizeMatrix(matrixB, r, colsB, setMatrixB);
  };

  const handleColsB = (c: number) => {
    setColsB(c);
    resizeMatrix(matrixB, rowsB, c, setMatrixB);
  };

  const updateCell = (
    isA: boolean,
    row: number,
    col: number,
    valStr: string
  ) => {
    const num = parseFloat(valStr) || 0;
    if (isA) {
      const copy = matrixA.map((r, rIdx) =>
        r.map((v, cIdx) => (rIdx === row && cIdx === col ? num : v))
      );
      setMatrixA(copy);
    } else {
      const copy = matrixB.map((r, rIdx) =>
        r.map((v, cIdx) => (rIdx === row && cIdx === col ? num : v))
      );
      setMatrixB(copy);
    }
  };

  // Preset generators
  const setIdentity = (isA: boolean) => {
    const size = isA ? Math.min(rowsA, colsA) : Math.min(rowsB, colsB);
    const m = createEmptyMatrix(isA ? rowsA : rowsB, isA ? colsA : colsB, 0);
    for (let i = 0; i < size; i++) m[i][i] = 1;
    if (isA) setMatrixA(m);
    else setMatrixB(m);
    showToast(`Set Identity matrix`);
  };

  const setZero = (isA: boolean) => {
    const m = createEmptyMatrix(isA ? rowsA : rowsB, isA ? colsA : colsB, 0);
    if (isA) setMatrixA(m);
    else setMatrixB(m);
  };

  const setRandom = (isA: boolean) => {
    const r = isA ? rowsA : rowsB;
    const c = isA ? colsA : colsB;
    const m = Array.from({ length: r }, () =>
      Array.from({ length: c }, () => Math.floor(Math.random() * 10) - 4)
    );
    if (isA) setMatrixA(m);
    else setMatrixB(m);
  };

  // Operations
  const handleAdd = () => {
    try {
      const res = addMatrices(matrixA, matrixB);
      setResultMatrix(res);
      setScalarResult(null);
      setOperationLabel('A + B');
      addHistory({
        mode: 'matrix',
        modeName: 'Matrix Calculator',
        expression: 'A + B',
        result: JSON.stringify(res),
      });
    } catch (err: unknown) {
      showToast((err as Error).message);
    }
  };

  const handleSub = () => {
    try {
      const res = subtractMatrices(matrixA, matrixB);
      setResultMatrix(res);
      setScalarResult(null);
      setOperationLabel('A − B');
      addHistory({
        mode: 'matrix',
        modeName: 'Matrix Calculator',
        expression: 'A - B',
        result: JSON.stringify(res),
      });
    } catch (err: unknown) {
      showToast((err as Error).message);
    }
  };

  const handleMultiply = () => {
    try {
      const res = multiplyMatrices(matrixA, matrixB);
      setResultMatrix(res);
      setScalarResult(null);
      setOperationLabel('A × B');
      addHistory({
        mode: 'matrix',
        modeName: 'Matrix Calculator',
        expression: 'A × B',
        result: JSON.stringify(res),
      });
    } catch (err: unknown) {
      showToast((err as Error).message);
    }
  };

  const handleDetA = () => {
    try {
      const det = determinantMatrix(matrixA);
      setScalarResult(parseFloat(det.toFixed(6)));
      setResultMatrix(null);
      setOperationLabel('det(A)');
      addHistory({
        mode: 'matrix',
        modeName: 'Matrix Calculator',
        expression: 'det(A)',
        result: det.toString(),
      });
    } catch (err: unknown) {
      showToast((err as Error).message);
    }
  };

  const handleInverseA = () => {
    try {
      const inv = inverseMatrix(matrixA);
      const rounded = inv.map((r) => r.map((v) => parseFloat(v.toFixed(4))));
      setResultMatrix(rounded);
      setScalarResult(null);
      setOperationLabel('A⁻¹');
      addHistory({
        mode: 'matrix',
        modeName: 'Matrix Calculator',
        expression: 'A⁻¹',
        result: JSON.stringify(rounded),
      });
    } catch (err: unknown) {
      showToast((err as Error).message);
    }
  };

  const handleTransposeA = () => {
    const t = transposeMatrix(matrixA);
    setResultMatrix(t);
    setScalarResult(null);
    setOperationLabel('Aᵀ');
  };

  const handleScalarA = () => {
    const res = scalarMultiplyMatrix(matrixA, scalarK);
    setResultMatrix(res);
    setScalarResult(null);
    setOperationLabel(`${scalarK} · A`);
  };

  const copyResult = () => {
    if (scalarResult !== null) {
      navigator.clipboard.writeText(scalarResult.toString());
      setCopied(true);
      showToast('Copied scalar value');
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    if (resultMatrix) {
      const text = resultMatrix.map((r) => r.join('\t')).join('\n');
      navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Copied matrix to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Matrix Setup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Matrix A Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center justify-center text-xs">
                A
              </span>
              <span>Matrix A</span>
            </h3>

            {/* Dimensions */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <select
                value={rowsA}
                onChange={(e) => handleRowsA(parseInt(e.target.value))}
                className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">×</span>
              <select
                value={colsA}
                onChange={(e) => handleColsA(parseInt(e.target.value))}
                className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matrix Input Grid */}
          <div className="flex justify-center p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="relative px-3 py-1">
              {/* Bracket visuals */}
              <div className="absolute left-0 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-slate-400 rounded-l" />
              <div className="absolute right-0 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-slate-400 rounded-r" />

              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${colsA}, minmax(0, 1fr))` }}
              >
                {matrixA.slice(0, rowsA).map((row, rIdx) =>
                  row.slice(0, colsA).map((val, cIdx) => (
                    <input
                      key={`${rIdx}-${cIdx}`}
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => updateCell(true, rIdx, cIdx, e.target.value)}
                      className="w-14 sm:w-16 p-2 text-center font-mono font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Presets:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIdentity(true)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono"
              >
                Identity
              </button>
              <button
                onClick={() => setZero(true)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono"
              >
                Zero
              </button>
              <button
                onClick={() => setRandom(true)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono"
              >
                Random
              </button>
            </div>
          </div>
        </div>

        {/* Matrix B Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-mono font-bold flex items-center justify-center text-xs">
                B
              </span>
              <span>Matrix B</span>
            </h3>

            {/* Dimensions */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <select
                value={rowsB}
                onChange={(e) => handleRowsB(parseInt(e.target.value))}
                className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">×</span>
              <select
                value={colsB}
                onChange={(e) => handleColsB(parseInt(e.target.value))}
                className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matrix Input Grid */}
          <div className="flex justify-center p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="relative px-3 py-1">
              <div className="absolute left-0 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-slate-400 rounded-l" />
              <div className="absolute right-0 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-slate-400 rounded-r" />

              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${colsB}, minmax(0, 1fr))` }}
              >
                {matrixB.slice(0, rowsB).map((row, rIdx) =>
                  row.slice(0, colsB).map((val, cIdx) => (
                    <input
                      key={`${rIdx}-${cIdx}`}
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => updateCell(false, rIdx, cIdx, e.target.value)}
                      className="w-14 sm:w-16 p-2 text-center font-mono font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Presets:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIdentity(false)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono"
              >
                Identity
              </button>
              <button
                onClick={() => setZero(false)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono"
              >
                Zero
              </button>
              <button
                onClick={() => setRandom(false)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono"
              >
                Random
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-sans font-semibold">Binary:</span>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg transition-colors"
          >
            A + B
          </button>
          <button
            onClick={handleSub}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg transition-colors"
          >
            A − B
          </button>
          <button
            onClick={handleMultiply}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
          >
            A × B
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-sans font-semibold">Unary (A):</span>
          <button
            onClick={handleDetA}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
          >
            det(A)
          </button>
          <button
            onClick={handleInverseA}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
          >
            A⁻¹
          </button>
          <button
            onClick={handleTransposeA}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
          >
            Aᵀ
          </button>
        </div>
      </div>

      {/* Result Display Box */}
      {(resultMatrix || scalarResult !== null) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Result:
              </span>
              <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                {operationLabel}
              </span>
            </div>
            <button
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex justify-center p-4">
            {scalarResult !== null ? (
              <div className="text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {scalarResult}
              </div>
            ) : (
              resultMatrix && (
                <div className="relative px-4 py-2">
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 border-l-2 border-t-2 border-b-2 border-indigo-500 rounded-l" />
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 border-r-2 border-t-2 border-b-2 border-indigo-500 rounded-r" />
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${resultMatrix[0].length}, minmax(0, 1fr))` }}
                  >
                    {resultMatrix.map((row, rIdx) =>
                      row.map((val, cIdx) => (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className="w-16 p-2.5 text-center font-mono font-bold text-base bg-indigo-50/60 dark:bg-indigo-950/40 rounded-lg text-indigo-950 dark:text-indigo-100"
                        >
                          {val}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
