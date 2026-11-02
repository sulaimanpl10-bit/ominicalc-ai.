/**
 * Deterministic math engine for OmniCalc AI
 * Clean, robust algorithms with strict error handling.
 */

// Greatest Common Divisor using Euclidean algorithm
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

// Least Common Multiple
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

// Factorial with integer guard
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial requires non-negative integer');
  if (n > 170) return Infinity; // Overflow boundary for standard IEEE-754
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Safe evaluation of standard and scientific expressions
export function evaluateMathExpression(expr: string, angleUnit: 'deg' | 'rad' = 'rad'): number {
  if (!expr || expr.trim() === '') return 0;

  // Replace visual math symbols
  let sanitized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'Math.PI')
    .replace(/ϕ/g, '((1 + Math.sqrt(5)) / 2)')
    .replace(/\be\b/g, 'Math.E');

  // Handle trig functions according to angle mode
  if (angleUnit === 'deg') {
    sanitized = sanitized
      .replace(/\bsin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)')
      .replace(/\bcos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)')
      .replace(/\btan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)')
      .replace(/\basin\(([^)]+)\)/g, '(Math.asin($1) * 180 / Math.PI)')
      .replace(/\bacos\(([^)]+)\)/g, '(Math.acos($1) * 180 / Math.PI)')
      .replace(/\batan\(([^)]+)\)/g, '(Math.atan($1) * 180 / Math.PI)');
  } else {
    sanitized = sanitized
      .replace(/\bsin\(/g, 'Math.sin(')
      .replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(')
      .replace(/\basin\(/g, 'Math.asin(')
      .replace(/\bacos\(/g, 'Math.acos(')
      .replace(/\batan\(/g, 'Math.atan(');
  }

  // Handle hyperbolic trig
  sanitized = sanitized
    .replace(/\bsinh\(/g, 'Math.sinh(')
    .replace(/\bcosh\(/g, 'Math.cosh(')
    .replace(/\btanh\(/g, 'Math.tanh(');

  // Handle logs, powers, roots, abs
  sanitized = sanitized
    .replace(/\bln\(/g, 'Math.log(')
    .replace(/\blog10\(/g, 'Math.log10(')
    .replace(/\blog2\(/g, 'Math.log2(')
    .replace(/\blog\(/g, 'Math.log10(')
    .replace(/\bsqrt\(/g, 'Math.sqrt(')
    .replace(/\bcbrt\(/g, 'Math.cbrt(')
    .replace(/\babs\(/g, 'Math.abs(')
    .replace(/\^/g, '**');

  // Prevent dangerous code injection
  if (/[^0-9+\-*/().MathPIE,\s<>&|^~*%]/.test(sanitized)) {
    throw new Error('Invalid mathematical characters');
  }

  // Function evaluation using Function constructor in closed scope
  const evalFunc = new Function(`"use strict"; return (${sanitized});`);
  const result = evalFunc();
  if (typeof result !== 'number' || isNaN(result)) {
    throw new Error('Calculation resulted in undefined (NaN)');
  }
  return result;
}

// ----------------- STATISTICS -----------------
export interface StatisticsResult {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  varianceSample: number;
  variancePopulation: number;
  stdDevSample: number;
  stdDevPopulation: number;
  q1: number;
  q3: number;
  iqr: number;
  outliers: number[];
}

export function calculateStatistics(data: number[]): StatisticsResult | null {
  if (!data || data.length === 0) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Median
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Mode
  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  for (const num of sorted) {
    frequency[num] = (frequency[num] || 0) + 1;
    if (frequency[num] > maxFreq) maxFreq = frequency[num];
  }
  const modes: number[] = [];
  if (maxFreq > 1) {
    for (const key in frequency) {
      if (frequency[key] === maxFreq) modes.push(Number(key));
    }
  }

  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // Variances
  const sumSqDiff = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variancePopulation = sumSqDiff / n;
  const varianceSample = n > 1 ? sumSqDiff / (n - 1) : 0;
  const stdDevPopulation = Math.sqrt(variancePopulation);
  const stdDevSample = Math.sqrt(varianceSample);

  // Quartiles
  const lowerHalf = sorted.slice(0, Math.floor(n / 2));
  const upperHalf = n % 2 === 0 ? sorted.slice(Math.floor(n / 2)) : sorted.slice(Math.floor(n / 2) + 1);

  const getHalfMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const m = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
  };

  const q1 = getHalfMedian(lowerHalf);
  const q3 = getHalfMedian(upperHalf);
  const iqr = q3 - q1;

  // Outliers using 1.5 * IQR
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = sorted.filter((v) => v < lowerBound || v > upperBound);

  return {
    count: n,
    sum,
    mean,
    median,
    mode: modes,
    min,
    max,
    range,
    varianceSample,
    variancePopulation,
    stdDevSample,
    stdDevPopulation,
    q1,
    q3,
    iqr,
    outliers,
  };
}

// ----------------- MATRIX ALGEBRA -----------------
export type Matrix = number[][];

export function createEmptyMatrix(rows: number, cols: number, fill = 0): Matrix {
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

export function addMatrices(A: Matrix, B: Matrix): Matrix {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error('Matrix dimensions must match for addition');
  }
  return A.map((row, r) => row.map((val, c) => val + B[r][c]));
}

export function subtractMatrices(A: Matrix, B: Matrix): Matrix {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error('Matrix dimensions must match for subtraction');
  }
  return A.map((row, r) => row.map((val, c) => val - B[r][c]));
}

export function multiplyMatrices(A: Matrix, B: Matrix): Matrix {
  const rA = A.length;
  const cA = A[0].length;
  const rB = B.length;
  const cB = B[0].length;
  if (cA !== rB) {
    throw new Error(`Inner matrix dimensions must agree: (${rA}×${cA}) cannot multiply (${rB}×${cB})`);
  }
  const result = createEmptyMatrix(rA, cB, 0);
  for (let i = 0; i < rA; i++) {
    for (let j = 0; j < cB; j++) {
      let sum = 0;
      for (let k = 0; k < cA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

export function transposeMatrix(A: Matrix): Matrix {
  const rows = A.length;
  const cols = A[0].length;
  const T = createEmptyMatrix(cols, rows, 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      T[c][r] = A[r][c];
    }
  }
  return T;
}

export function scalarMultiplyMatrix(A: Matrix, scalar: number): Matrix {
  return A.map((row) => row.map((v) => v * scalar));
}

export function determinantMatrix(A: Matrix): number {
  const n = A.length;
  if (n !== A[0].length) {
    throw new Error('Determinant requires a square matrix');
  }
  if (n === 1) return A[0][0];
  if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];

  let det = 0;
  for (let j = 0; j < n; j++) {
    const minor = A.slice(1).map((row) => row.filter((_, colIdx) => colIdx !== j));
    const sign = j % 2 === 0 ? 1 : -1;
    det += sign * A[0][j] * determinantMatrix(minor);
  }
  return det;
}

export function inverseMatrix(A: Matrix): Matrix {
  const n = A.length;
  if (n !== A[0].length) {
    throw new Error('Inversion requires a square matrix');
  }
  const det = determinantMatrix(A);
  if (Math.abs(det) < 1e-12) {
    throw new Error('Matrix is singular (determinant is 0) and cannot be inverted');
  }

  if (n === 1) return [[1 / A[0][0]]];

  if (n === 2) {
    return [
      [A[1][1] / det, -A[0][1] / det],
      [-A[1][0] / det, A[0][0] / det],
    ];
  }

  // Adjugate matrix approach
  const adj: Matrix = createEmptyMatrix(n, n, 0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const minor = A.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
      const sign = (i + j) % 2 === 0 ? 1 : -1;
      adj[j][i] = (sign * determinantMatrix(minor)) / det; // Transposed cofactor
    }
  }
  return adj;
}

// ----------------- EQUATION SOLVERS -----------------
export interface QuadraticResult {
  discriminant: number;
  rootType: 'real-distinct' | 'real-repeated' | 'complex';
  x1: string;
  x2: string;
  vertex: { x: number; y: number };
  steps: string[];
}

export function solveQuadratic(a: number, b: number, c: number): QuadraticResult {
  if (a === 0) {
    throw new Error('Coefficient "a" cannot be 0 for a quadratic equation');
  }
  const disc = b * b - 4 * a * c;
  const vx = -b / (2 * a);
  const vy = c - (b * b) / (4 * a);

  const steps: string[] = [
    `Standard form: ${a}x² + (${b})x + (${c}) = 0`,
    `Calculate discriminant Δ = b² - 4ac = (${b})² - 4(${a})(${c}) = ${disc}`,
  ];

  let rootType: QuadraticResult['rootType'];
  let x1: string;
  let x2: string;

  if (Math.abs(disc) < 1e-12) {
    rootType = 'real-repeated';
    const root = vx;
    x1 = root.toFixed(4).replace(/\.?0+$/, '');
    x2 = x1;
    steps.push(`Δ = 0: Exactly one repeated real root: x = -b / (2a) = ${x1}`);
  } else if (disc > 0) {
    rootType = 'real-distinct';
    const r1 = (-b + Math.sqrt(disc)) / (2 * a);
    const r2 = (-b - Math.sqrt(disc)) / (2 * a);
    x1 = r1.toFixed(4).replace(/\.?0+$/, '');
    x2 = r2.toFixed(4).replace(/\.?0+$/, '');
    steps.push(`Δ > 0: Two distinct real roots: x = (-b ± √Δ) / 2a`);
    steps.push(`x₁ = (${-b} + ${Math.sqrt(disc).toFixed(4)}) / ${2 * a} = ${x1}`);
    steps.push(`x₂ = (${-b} - ${Math.sqrt(disc).toFixed(4)}) / ${2 * a} = ${x2}`);
  } else {
    rootType = 'complex';
    const realPart = vx.toFixed(4).replace(/\.?0+$/, '');
    const imagPart = (Math.sqrt(-disc) / (2 * Math.abs(a))).toFixed(4).replace(/\.?0+$/, '');
    x1 = `${realPart} + ${imagPart}i`;
    x2 = `${realPart} - ${imagPart}i`;
    steps.push(`Δ < 0: Two complex conjugate roots: x = (-b ± i√|Δ|) / 2a`);
    steps.push(`x₁ = ${x1}`);
    steps.push(`x₂ = ${x2}`);
  }

  steps.push(`Parabola vertex: (${vx.toFixed(4)}, ${vy.toFixed(4)})`);

  return {
    discriminant: disc,
    rootType,
    x1,
    x2,
    vertex: { x: vx, y: vy },
    steps,
  };
}

export function solveLinearSystem2(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number
): { x: number; y: number; steps: string[] } {
  // Cramer's rule:
  // a1*x + b1*y = c1
  // a2*x + b2*y = c2
  const D = a1 * b2 - a2 * b1;
  const Dx = c1 * b2 - c2 * b1;
  const Dy = a1 * c2 - a2 * c1;

  if (Math.abs(D) < 1e-12) {
    if (Math.abs(Dx) < 1e-12 && Math.abs(Dy) < 1e-12) {
      throw new Error('System has infinitely many solutions (coincident lines)');
    }
    throw new Error('System has no solution (parallel lines)');
  }

  const x = Dx / D;
  const y = Dy / D;

  const steps = [
    `Equation 1: ${a1}x + ${b1}y = ${c1}`,
    `Equation 2: ${a2}x + ${b2}y = ${c2}`,
    `Determinant D = (${a1})(${b2}) - (${a2})(${b1}) = ${D}`,
    `Dx = (${c1})(${b2}) - (${c2})(${b1}) = ${Dx}`,
    `Dy = (${a1})(${c2}) - (${a2})(${c1}) = ${Dy}`,
    `x = Dx / D = ${Dx} / ${D} = ${x.toFixed(4)}`,
    `y = Dy / D = ${Dy} / ${D} = ${y.toFixed(4)}`,
  ];

  return { x, y, steps };
}

// ----------------- FINANCIAL CALCULATIONS -----------------
export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export function calculateLoanAmortization(
  principal: number,
  annualRatePct: number,
  years: number
): {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: AmortizationRow[];
} {
  const months = years * 12;
  const monthlyRate = annualRatePct / 100 / 12;

  let monthlyPayment = 0;
  if (monthlyRate === 0) {
    monthlyPayment = principal / months;
  } else {
    monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
  }

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let m = 1; m <= months; m++) {
    const interest = balance * monthlyRate;
    const principalPaid = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    if (m <= 60 || m % 12 === 0 || m === months) {
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: principalPaid,
        interest,
        remainingBalance: balance,
      });
    }
  }

  return {
    monthlyPayment,
    totalPayment: principal + totalInterest,
    totalInterest,
    schedule,
  };
}

export function calculateCompoundInterest(
  principal: number,
  monthlyContribution: number,
  annualRatePct: number,
  years: number,
  compoundsPerYear = 12
): {
  futureValue: number;
  totalPrincipalInvested: number;
  totalInterestEarned: number;
  growthTimeline: { year: number; principal: number; total: number; interest: number }[];
} {
  const r = annualRatePct / 100;
  const n = compoundsPerYear;
  const timeline = [];

  let currentTotal = principal;
  let totalContributed = principal;

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      currentTotal = currentTotal * (1 + r / n) + monthlyContribution;
      totalContributed += monthlyContribution;
    }
    timeline.push({
      year: y,
      principal: Math.round(totalContributed),
      total: Math.round(currentTotal),
      interest: Math.round(currentTotal - totalContributed),
    });
  }

  return {
    futureValue: currentTotal,
    totalPrincipalInvested: totalContributed,
    totalInterestEarned: currentTotal - totalContributed,
    growthTimeline: timeline,
  };
}
