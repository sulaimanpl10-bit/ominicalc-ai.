import { CalculatorMode } from '../types/calculator';
import {
  evaluateMathExpression,
  solveLinearSystem2,
  solveQuadratic,
  calculateStatistics,
  gcd,
  lcm,
} from './mathEngine';

export interface AutoDetectionResult {
  detectedMode: CalculatorMode;
  modeName: string;
  confidence: 'high' | 'medium';
  finalAnswer: string;
  steps: string[];
  explanation: string;
  formula?: string;
  prefillExpression?: string;
  isDeterministic: boolean;
  engine?: 'local' | 'cache' | 'ai-stream' | 'ai-direct';
  durationMs?: number;
  ttftMs?: number;
}

// Unit conversion factors to base SI units
const LENGTH_FACTORS: Record<string, number> = {
  m: 1,
  meter: 1,
  meters: 1,
  km: 1000,
  kilometer: 1000,
  kilometers: 1000,
  cm: 0.01,
  centimeter: 0.01,
  centimeters: 0.01,
  mm: 0.001,
  millimeter: 0.001,
  millimeters: 0.001,
  mi: 1609.344,
  mile: 1609.344,
  miles: 1609.344,
  yd: 0.9144,
  yard: 0.9144,
  yards: 0.9144,
  ft: 0.3048,
  foot: 0.3048,
  feet: 0.3048,
  in: 0.0254,
  inch: 0.0254,
  inches: 0.0254,
};

const MASS_FACTORS: Record<string, number> = {
  kg: 1,
  kilogram: 1,
  kilograms: 1,
  g: 0.001,
  gram: 0.001,
  grams: 0.001,
  mg: 0.000001,
  milligram: 0.000001,
  milligrams: 0.000001,
  lb: 0.45359237,
  lbs: 0.45359237,
  pound: 0.45359237,
  pounds: 0.45359237,
  oz: 0.02834952,
  ounce: 0.02834952,
  ounces: 0.02834952,
};

/**
 * Deterministic detection and computation engine for OmniCalc Auto Mode.
 * Returns null if the expression needs to be passed to Gemini AI.
 */
export function detectAndSolveDeterministically(rawInput: string): AutoDetectionResult | null {
  let input = rawInput.trim();
  if (!input) return null;

  // Clean trailing conversational filler phrases (e.g. "with full derivation", "step by step")
  input = input
    .replace(/\s+(?:with\s+.*|showing\s+.*|step\s*by\s*step.*|full\s+derivation.*|exact\s+(?:fraction|value).*|as\s+an?\s+.*)$/i, '')
    .trim();

  // Clean conversational prefixes (e.g. "calculate", "compute", "evaluate", "solve for", "find")
  const withoutPrefix = input.replace(/^(?:calculate|compute|find|evaluate)\s+/i, '').trim();

  // 1. PERCENTAGE CALCULATOR
  // Matches: "25% of 800", "what is 15% of 250", "20 percent of 1500"
  const percentOfMatch = input.match(
    /(?:what\s+is\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:of)\s*(\d+(?:\.\d+)?)/i
  );
  if (percentOfMatch) {
    const pct = parseFloat(percentOfMatch[1]);
    const total = parseFloat(percentOfMatch[2]);
    const ans = (pct / 100) * total;
    const formattedAns = parseFloat(ans.toFixed(6)).toString();
    return {
      detectedMode: 'percentage',
      modeName: 'Percentage Calculator',
      confidence: 'high',
      finalAnswer: formattedAns,
      steps: [
        `Convert percentage to decimal: ${pct}% = ${pct} / 100 = ${pct / 100}`,
        `Multiply decimal by base amount: ${pct / 100} × ${total} = ${formattedAns}`,
      ],
      explanation: `Calculates ${pct}% of ${total}.`,
      formula: `(${pct} / 100) × ${total} = ${formattedAns}`,
      prefillExpression: `${pct}% of ${total}`,
      isDeterministic: true,
    };
  }

  // Matches: "% change from 50 to 75", "percentage increase from 100 to 125"
  const pctChangeMatch = input.match(
    /(?:percent(?:age)?\s*(?:change|increase|decrease)?\s*(?:from)?)\s*(\d+(?:\.\d+)?)\s*(?:to)\s*(\d+(?:\.\d+)?)/i
  );
  if (pctChangeMatch) {
    const fromVal = parseFloat(pctChangeMatch[1]);
    const toVal = parseFloat(pctChangeMatch[2]);
    if (fromVal !== 0) {
      const diff = toVal - fromVal;
      const pctChange = (diff / fromVal) * 100;
      const sign = pctChange >= 0 ? '+' : '';
      return {
        detectedMode: 'percentage',
        modeName: 'Percentage Calculator',
        confidence: 'high',
        finalAnswer: `${sign}${pctChange.toFixed(2)}%`,
        steps: [
          `Find absolute difference: ${toVal} - ${fromVal} = ${diff}`,
          `Divide by initial value: ${diff} / ${fromVal} = ${(diff / fromVal).toFixed(4)}`,
          `Multiply by 100: ${sign}${pctChange.toFixed(2)}%`,
        ],
        explanation: `Calculates percentage change from ${fromVal} to ${toVal}.`,
        formula: `((${toVal} - ${fromVal}) / ${fromVal}) × 100%`,
        isDeterministic: true,
      };
    }
  }

  // 2. EQUATION SOLVER
  // Matches: "Solve 3x + 7 = 22", "3x - 5 = 10", "4x = 20", "2x + 10 = 0"
  const linearMatch = input.match(
    /^(?:solve\s+)?([+-]?\s*\d*(?:\.\d+)?)\s*([a-zA-Z])\s*([+-]\s*\d+(?:\.\d+)?)\s*=\s*([+-]?\s*\d+(?:\.\d+)?)\s*$/i
  );
  if (linearMatch) {
    let aStr = linearMatch[1].replace(/\s+/g, '');
    if (aStr === '' || aStr === '+') aStr = '1';
    if (aStr === '-') aStr = '-1';
    const a = parseFloat(aStr);
    const variable = linearMatch[2];
    const b = parseFloat(linearMatch[3].replace(/\s+/g, ''));
    const c = parseFloat(linearMatch[4].replace(/\s+/g, ''));

    if (!isNaN(a) && a !== 0 && !isNaN(b) && !isNaN(c)) {
      const rhs = c - b;
      const solution = rhs / a;
      const formattedSol = parseFloat(solution.toFixed(6)).toString();
      return {
        detectedMode: 'equations',
        modeName: 'Equation Solver',
        confidence: 'high',
        finalAnswer: `${variable} = ${formattedSol}`,
        steps: [
          `Given linear equation: ${a}${variable} + (${b}) = ${c}`,
          `Subtract ${b} from both sides: ${a}${variable} = ${c} - (${b}) = ${rhs}`,
          `Divide both sides by ${a}: ${variable} = ${rhs} / ${a} = ${formattedSol}`,
        ],
        explanation: `Isolated variable ${variable} by inverse arithmetic operations.`,
        formula: `${variable} = (c - b) / a`,
        prefillExpression: `${a}${variable} + ${b} = ${c}`,
        isDeterministic: true,
      };
    }
  }

  // Matches simplified linear: "Solve 5x = 45" or "5x = 45"
  const simpleLinearMatch = input.match(
    /^(?:solve\s+)?([+-]?\s*\d*(?:\.\d+)?)\s*([a-zA-Z])\s*=\s*([+-]?\s*\d+(?:\.\d+)?)\s*$/i
  );
  if (simpleLinearMatch) {
    let aStr = simpleLinearMatch[1].replace(/\s+/g, '');
    if (aStr === '' || aStr === '+') aStr = '1';
    if (aStr === '-') aStr = '-1';
    const a = parseFloat(aStr);
    const variable = simpleLinearMatch[2];
    const c = parseFloat(simpleLinearMatch[3].replace(/\s+/g, ''));

    if (!isNaN(a) && a !== 0 && !isNaN(c)) {
      const solution = c / a;
      const formattedSol = parseFloat(solution.toFixed(6)).toString();
      return {
        detectedMode: 'equations',
        modeName: 'Equation Solver',
        confidence: 'high',
        finalAnswer: `${variable} = ${formattedSol}`,
        steps: [
          `Given equation: ${a}${variable} = ${c}`,
          `Divide both sides by ${a}: ${variable} = ${c} / ${a} = ${formattedSol}`,
        ],
        explanation: `Direct division to isolate ${variable}.`,
        isDeterministic: true,
      };
    }
  }

  // Matches quadratic: "x^2 - 5x + 6 = 0", "Solve 2x^2 + 3x - 5 = 0"
  const quadMatch = input.match(
    /^(?:solve\s+)?([+-]?\s*\d*(?:\.\d+)?)\s*([a-zA-Z])(?:\^2|²)\s*([+-]\s*\d*(?:\.\d+)?)\s*\2\s*([+-]\s*\d+(?:\.\d+)?)\s*=\s*0\s*$/i
  );
  if (quadMatch) {
    let aStr = quadMatch[1].replace(/\s+/g, '');
    if (aStr === '' || aStr === '+') aStr = '1';
    if (aStr === '-') aStr = '-1';
    let bStr = quadMatch[3].replace(/\s+/g, '');
    if (bStr === '' || bStr === '+') bStr = '1';
    if (bStr === '-') bStr = '-1';

    const a = parseFloat(aStr);
    const b = parseFloat(bStr);
    const c = parseFloat(quadMatch[4].replace(/\s+/g, ''));

    if (!isNaN(a) && a !== 0 && !isNaN(b) && !isNaN(c)) {
      const qRes = solveQuadratic(a, b, c);
      return {
        detectedMode: 'equations',
        modeName: 'Equation Solver',
        confidence: 'high',
        finalAnswer: `x₁ = ${qRes.x1}, x₂ = ${qRes.x2}`,
        steps: qRes.steps,
        explanation: `Solved via quadratic formula with discriminant Δ = ${qRes.discriminant}.`,
        formula: `x = (-b ± √(b² - 4ac)) / (2a)`,
        isDeterministic: true,
      };
    }
  }

  // 3. UNIT CONVERTER
  // Matches: "Convert 10 km to miles", "10 km to miles", "50 miles in km", "100 meters to feet"
  const unitMatch = input.match(
    /^(?:convert\s+)?(\d+(?:\.\d+)?)\s*([a-zA-Z°]+)\s+(?:to|in|into)\s+([a-zA-Z°]+)\s*$/i
  );
  if (unitMatch) {
    const val = parseFloat(unitMatch[1]);
    const fromUnit = unitMatch[2].toLowerCase();
    const toUnit = unitMatch[3].toLowerCase();

    // Length conversion
    if (LENGTH_FACTORS[fromUnit] && LENGTH_FACTORS[toUnit]) {
      const inMeters = val * LENGTH_FACTORS[fromUnit];
      const targetVal = inMeters / LENGTH_FACTORS[toUnit];
      const formatted = parseFloat(targetVal.toFixed(5)).toString();
      return {
        detectedMode: 'unit-converter',
        modeName: 'Unit Converter',
        confidence: 'high',
        finalAnswer: `${formatted} ${toUnit}`,
        steps: [
          `Convert ${fromUnit} to base meters: ${val} × ${LENGTH_FACTORS[fromUnit]} = ${inMeters} m`,
          `Convert meters to ${toUnit}: ${inMeters} / ${LENGTH_FACTORS[toUnit]} = ${formatted} ${toUnit}`,
        ],
        explanation: `Standard dimensional conversion between metric and imperial length units.`,
        formula: `${val} ${fromUnit} = ${formatted} ${toUnit}`,
        prefillExpression: `${val} ${fromUnit} to ${toUnit}`,
        isDeterministic: true,
      };
    }

    // Mass conversion
    if (MASS_FACTORS[fromUnit] && MASS_FACTORS[toUnit]) {
      const inKg = val * MASS_FACTORS[fromUnit];
      const targetVal = inKg / MASS_FACTORS[toUnit];
      const formatted = parseFloat(targetVal.toFixed(5)).toString();
      return {
        detectedMode: 'unit-converter',
        modeName: 'Unit Converter',
        confidence: 'high',
        finalAnswer: `${formatted} ${toUnit}`,
        steps: [
          `Convert ${fromUnit} to base kilograms: ${val} × ${MASS_FACTORS[fromUnit]} = ${inKg} kg`,
          `Convert kilograms to ${toUnit}: ${inKg} / ${MASS_FACTORS[toUnit]} = ${formatted} ${toUnit}`,
        ],
        explanation: `Standard mass/weight unit conversion.`,
        isDeterministic: true,
      };
    }

    // Temperature conversion
    if (
      ['c', 'celsius', 'f', 'fahrenheit', 'k', 'kelvin'].includes(fromUnit) &&
      ['c', 'celsius', 'f', 'fahrenheit', 'k', 'kelvin'].includes(toUnit)
    ) {
      let celsius = val;
      if (fromUnit.startsWith('f')) celsius = ((val - 32) * 5) / 9;
      if (fromUnit.startsWith('k')) celsius = val - 273.15;

      let resultTemp = celsius;
      if (toUnit.startsWith('f')) resultTemp = (celsius * 9) / 5 + 32;
      if (toUnit.startsWith('k')) resultTemp = celsius + 273.15;

      const formatted = parseFloat(resultTemp.toFixed(2)).toString();
      return {
        detectedMode: 'unit-converter',
        modeName: 'Unit Converter',
        confidence: 'high',
        finalAnswer: `${formatted} °${toUnit.charAt(0).toUpperCase()}`,
        steps: [
          `Convert input to Celsius: ${val}°${fromUnit.charAt(0).toUpperCase()} = ${celsius.toFixed(2)} °C`,
          `Convert Celsius to ${toUnit}: ${formatted} °${toUnit.charAt(0).toUpperCase()}`,
        ],
        explanation: `Temperature scale translation formula.`,
        isDeterministic: true,
      };
    }
  }

  // 4. SCIENTIFIC CALCULATOR / TRIGONOMETRY
  // Matches: "sin(30°)", "sin(30 deg)", "cos(45°)", "tan(60 deg)", "sin(pi/6)"
  const trigDegMatch = input.match(/^(sin|cos|tan|asin|acos|atan)\s*\(\s*(\d+(?:\.\d+)?)\s*(?:°|deg|degrees)?\s*\)$/i);
  if (trigDegMatch) {
    const fn = trigDegMatch[1].toLowerCase();
    const deg = parseFloat(trigDegMatch[2]);
    const hasDegMarker = input.includes('°') || input.toLowerCase().includes('deg');
    const rad = (deg * Math.PI) / 180;

    let ans = 0;
    if (fn === 'sin') ans = Math.sin(rad);
    else if (fn === 'cos') ans = Math.cos(rad);
    else if (fn === 'tan') ans = Math.tan(rad);

    // Clean common exact trig values like sin(30°) = 0.5
    if (Math.abs(ans - 0.5) < 1e-10) ans = 0.5;
    if (Math.abs(ans + 0.5) < 1e-10) ans = -0.5;
    if (Math.abs(ans) < 1e-10) ans = 0;
    if (Math.abs(ans - 1) < 1e-10) ans = 1;
    if (Math.abs(ans + 1) < 1e-10) ans = -1;

    const formattedAns = parseFloat(ans.toFixed(6)).toString();
    return {
      detectedMode: 'scientific',
      modeName: 'Scientific Calculator',
      confidence: 'high',
      finalAnswer: formattedAns,
      steps: [
        `Identify trigonometric function: ${fn}`,
        hasDegMarker
          ? `Convert degrees to radians: ${deg}° = (${deg} × π) / 180 ≈ ${rad.toFixed(4)} rad`
          : `Angle evaluated in radians: ${rad.toFixed(4)} rad`,
        `Evaluate ${fn}(${deg}°): ${formattedAns}`,
      ],
      explanation: `Calculates trigonometric ratio for ${deg}° angle.`,
      formula: `${fn}(${deg}°) = ${formattedAns}`,
      prefillExpression: `${fn}(${deg})`,
      isDeterministic: true,
    };
  }

  // Compound trig: "sin(30) + cos(60)", "sin(30°) + cos(60°)", "sin(30 degrees) + cos(60 degrees)"
  const compoundTrig = input.match(
    /(?:evaluate\s+)?(sin|cos|tan)\s*\(\s*(\d+(?:\.\d+)?)\s*(?:°|deg|degrees)?\s*\)\s*([+\-*/])\s*(sin|cos|tan)\s*\(\s*(\d+(?:\.\d+)?)\s*(?:°|deg|degrees)?\s*\)/i
  );
  if (compoundTrig) {
    const fn1 = compoundTrig[1].toLowerCase();
    const d1 = parseFloat(compoundTrig[2]);
    const op = compoundTrig[3];
    const fn2 = compoundTrig[4].toLowerCase();
    const d2 = parseFloat(compoundTrig[5]);

    const toRad = (d: number) => (d * Math.PI) / 180;
    const evalFn = (fn: string, r: number) => {
      if (fn === 'sin') return Math.sin(r);
      if (fn === 'cos') return Math.cos(r);
      return Math.tan(r);
    };

    const v1 = evalFn(fn1, toRad(d1));
    const v2 = evalFn(fn2, toRad(d2));
    let ans = 0;
    if (op === '+') ans = v1 + v2;
    else if (op === '-') ans = v1 - v2;
    else if (op === '*') ans = v1 * v2;
    else if (op === '/') ans = v1 / v2;

    const formatted = parseFloat(ans.toFixed(6)).toString();
    return {
      detectedMode: 'scientific',
      modeName: 'Scientific Calculator',
      confidence: 'high',
      finalAnswer: formatted,
      steps: [
        `Evaluate ${fn1}(${d1}°): ${parseFloat(v1.toFixed(4))}`,
        `Evaluate ${fn2}(${d2}°): ${parseFloat(v2.toFixed(4))}`,
        `Perform operation: ${parseFloat(v1.toFixed(4))} ${op} ${parseFloat(v2.toFixed(4))} = ${formatted}`,
      ],
      explanation: `Evaluates trigonometric terms in degrees and calculates exact combined value.`,
      formula: `${fn1}(${d1}°) ${op} ${fn2}(${d2}°) = ${formatted}`,
      isDeterministic: true,
    };
  }

  // Factorials: "5!", "factorial of 6"
  const factorialMatch = input.match(/^(\d+)!$/) || input.match(/^(?:factorial\s+(?:of\s+)?(\d+))$/i);
  if (factorialMatch) {
    const n = parseInt(factorialMatch[1], 10);
    if (n >= 0 && n <= 170) {
      let res = 1;
      const terms = [];
      for (let i = n; i >= 1; i--) {
        res *= i;
        if (terms.length < 5) terms.push(i);
      }
      return {
        detectedMode: 'scientific',
        modeName: 'Scientific Calculator',
        confidence: 'high',
        finalAnswer: res.toString(),
        steps: [
          `Definition of factorial: n! = n × (n - 1) × ... × 1`,
          `${n}! = ${terms.join(' × ')}${n > 5 ? ' × ... × 1' : ''} = ${res}`,
        ],
        explanation: `Product of all positive integers less than or equal to ${n}.`,
        formula: `${n}! = ${res}`,
        isDeterministic: true,
      };
    }
  }

  // Logarithms: "log(100)", "ln(e^2)", "log2(8)"
  const logMatch = input.match(/^(log|ln|log10|log2)\s*\(\s*(\d+(?:\.\d+)?)\s*\)$/i);
  if (logMatch) {
    const fn = logMatch[1].toLowerCase();
    const val = parseFloat(logMatch[2]);
    let ans = 0;
    if (fn === 'ln') ans = Math.log(val);
    else if (fn === 'log2') ans = Math.log2(val);
    else ans = Math.log10(val);

    const formatted = parseFloat(ans.toFixed(6)).toString();
    return {
      detectedMode: 'scientific',
      modeName: 'Scientific Calculator',
      confidence: 'high',
      finalAnswer: formatted,
      steps: [
        `Evaluate ${fn} at base: ${val}`,
        `${fn}(${val}) = ${formatted}`,
      ],
      explanation: `Logarithmic inverse of exponentiation.`,
      isDeterministic: true,
    };
  }

  // 5. GEOMETRY CALCULATOR
  // Matches: "What is the area of a circle with radius 5?", "area of circle radius 5", "circle with r = 5"
  const circleAreaMatch = input.match(
    /(?:area\s+of\s+(?:a\s+)?circle\s+(?:with\s+)?(?:radius|r\s*=?)\s*(\d+(?:\.\d+)?))/i
  );
  if (circleAreaMatch) {
    const r = parseFloat(circleAreaMatch[1]);
    const area = Math.PI * r * r;
    const formatted = parseFloat(area.toFixed(4)).toString();
    const exactPi = parseFloat((r * r).toFixed(4)).toString();
    return {
      detectedMode: 'geometry',
      modeName: 'Geometry Calculator',
      confidence: 'high',
      finalAnswer: `${formatted} sq units (${exactPi}π)`,
      steps: [
        `Circle Area Formula: A = π · r²`,
        `Substitute radius r = ${r}: A = π · (${r})² = ${exactPi}π`,
        `Calculate numerical approximation: ${exactPi} × 3.14159265... ≈ ${formatted}`,
      ],
      explanation: `Area enclosed by a 2D circle of radius ${r}.`,
      formula: `A = π · r²`,
      prefillExpression: `Circle (r=${r})`,
      isDeterministic: true,
    };
  }

  // Matches: "circumference of a circle with radius 5"
  const circleCircumMatch = input.match(
    /(?:circumference\s+of\s+(?:a\s+)?circle\s+(?:with\s+)?(?:radius|r\s*=?)\s*(\d+(?:\.\d+)?))/i
  );
  if (circleCircumMatch) {
    const r = parseFloat(circleCircumMatch[1]);
    const circum = 2 * Math.PI * r;
    const formatted = parseFloat(circum.toFixed(4)).toString();
    return {
      detectedMode: 'geometry',
      modeName: 'Geometry Calculator',
      confidence: 'high',
      finalAnswer: `${formatted} units (${2 * r}π)`,
      steps: [
        `Circle Circumference Formula: C = 2 · π · r`,
        `Substitute r = ${r}: C = 2 × π × ${r} = ${2 * r}π ≈ ${formatted}`,
      ],
      explanation: `Perimeter of a circle with radius ${r}.`,
      formula: `C = 2πr`,
      isDeterministic: true,
    };
  }

  // Matches: "area of rectangle with width 8 and height 5"
  const rectAreaMatch = input.match(
    /(?:area\s+of\s+(?:a\s+)?rectangle\s+(?:with\s+)?(?:width|w\s*=?)\s*(\d+(?:\.\d+)?)\s*(?:and|,)?\s*(?:height|h\s*=?)\s*(\d+(?:\.\d+)?))/i
  );
  if (rectAreaMatch) {
    const w = parseFloat(rectAreaMatch[1]);
    const h = parseFloat(rectAreaMatch[2]);
    const area = w * h;
    return {
      detectedMode: 'geometry',
      modeName: 'Geometry Calculator',
      confidence: 'high',
      finalAnswer: `${area} sq units`,
      steps: [
        `Rectangle Area Formula: A = width × height`,
        `Substitute: A = ${w} × ${h} = ${area}`,
      ],
      explanation: `Calculates 2D planar area of rectangle.`,
      formula: `A = w · h`,
      isDeterministic: true,
    };
  }

  // Matches: "volume of a sphere with radius 4"
  const sphereVolMatch = input.match(
    /(?:volume\s+of\s+(?:a\s+)?sphere\s+(?:with\s+)?(?:radius|r\s*=?)\s*(\d+(?:\.\d+)?))/i
  );
  if (sphereVolMatch) {
    const r = parseFloat(sphereVolMatch[1]);
    const vol = (4 / 3) * Math.PI * Math.pow(r, 3);
    const formatted = parseFloat(vol.toFixed(4)).toString();
    return {
      detectedMode: 'geometry',
      modeName: 'Geometry Calculator',
      confidence: 'high',
      finalAnswer: `${formatted} cubic units`,
      steps: [
        `Sphere Volume Formula: V = (4/3) · π · r³`,
        `Substitute r = ${r}: V = (4/3) × π × (${r})³ ≈ ${formatted}`,
      ],
      explanation: `Calculates 3D internal capacity of sphere.`,
      formula: `V = (4/3)πr³`,
      isDeterministic: true,
    };
  }

  // Matches: "volume of cylinder with radius 3 and height 8"
  const cylinderVolMatch = input.match(
    /(?:volume\s+of\s+(?:a\s+)?cylinder\s+(?:with\s+)?(?:radius|r\s*=?)\s*(\d+(?:\.\d+)?)\s*(?:and|,)?\s*(?:height|h\s*=?)\s*(\d+(?:\.\d+)?))/i
  );
  if (cylinderVolMatch) {
    const r = parseFloat(cylinderVolMatch[1]);
    const h = parseFloat(cylinderVolMatch[2]);
    const vol = Math.PI * r * r * h;
    const formatted = parseFloat(vol.toFixed(4)).toString();
    const exactPi = parseFloat((r * r * h).toFixed(4)).toString();
    return {
      detectedMode: 'geometry',
      modeName: 'Geometry Calculator',
      confidence: 'high',
      finalAnswer: `${formatted} cubic units (${exactPi}π)`,
      steps: [
        `Cylinder Volume Formula: V = π · r² · h`,
        `Substitute r = ${r}, h = ${h}: V = π · (${r})² · ${h} = ${exactPi}π`,
        `Calculate numerical approximation: ${exactPi} × 3.14159265... ≈ ${formatted}`,
      ],
      explanation: `Calculates 3D internal capacity of a cylinder of radius ${r} and height ${h}.`,
      formula: `V = π · r² · h`,
      isDeterministic: true,
    };
  }

  // Matches: "right triangle with legs 6 and 8", "right triangle legs 6 cm and 8 cm", "right-angled triangle has legs of 6 cm and 8 cm"
  const triangleMatch = input.match(
    /(?:right(?:-angled)?\s+triangle\s+(?:(?:with|has)\s+)?(?:leg(?:s)?|sides)?\s*(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:cm|m|units)?\s*(?:and|,)\s*(\d+(?:\.\d+)?)\s*(?:cm|m|units)?)/i
  );
  if (triangleMatch) {
    const a = parseFloat(triangleMatch[1]);
    const b = parseFloat(triangleMatch[2]);
    const c = Math.sqrt(a * a + b * b);
    const area = 0.5 * a * b;
    const perim = a + b + c;
    const formattedC = parseFloat(c.toFixed(4));
    const formattedPerim = parseFloat(perim.toFixed(4));
    return {
      detectedMode: 'geometry',
      modeName: 'Geometry Calculator',
      confidence: 'high',
      finalAnswer: `Hypotenuse: ${formattedC}, Area: ${area} sq units, Perimeter: ${formattedPerim}`,
      steps: [
        `Pythagorean Theorem: c = √(a² + b²) = √(${a}² + ${b}²) = √(${a*a} + ${b*b}) = ${formattedC}`,
        `Right Triangle Area: A = (1/2) · a · b = 0.5 × ${a} × ${b} = ${area} sq units`,
        `Perimeter: P = a + b + c = ${a} + ${b} + ${formattedC} = ${formattedPerim} units`,
      ],
      explanation: `Calculates hypotenuse via Pythagorean theorem and right-triangle planar area.`,
      formula: `c = √(a² + b²), A = ½ab`,
      isDeterministic: true,
    };
  }

  // 6. STATISTICS CALCULATOR
  // Matches: "mean of 10, 20, 30, 40", "average of 12, 18, 25"
  const statsMeanMatch = input.match(
    /(?:mean|average|std dev|standard deviation|median)\s+(?:of\s+)?([0-9.,\s]+)/i
  );
  if (statsMeanMatch) {
    const nums = statsMeanMatch[1]
      .split(/[,\s]+/)
      .map((n) => parseFloat(n.trim()))
      .filter((n) => !isNaN(n));

    if (nums.length >= 2) {
      const stats = calculateStatistics(nums);
      if (stats) {
        return {
          detectedMode: 'statistics',
          modeName: 'Statistics Calculator',
          confidence: 'high',
          finalAnswer: `Mean: ${stats.mean.toFixed(2)} | Median: ${stats.median} | StdDev: ${stats.stdDevSample.toFixed(2)}`,
          steps: [
            `Sample count (N): ${stats.count}`,
            `Sum (∑x): ${stats.sum}`,
            `Mean: ${stats.sum} / ${stats.count} = ${stats.mean.toFixed(4)}`,
            `Sample Standard Deviation (s): ${stats.stdDevSample.toFixed(4)}`,
          ],
          explanation: `Evaluated descriptive statistics for ${nums.length} data points.`,
          prefillExpression: nums.join(', '),
          isDeterministic: true,
        };
      }
    }
  }

  // 7. FRACTION CALCULATOR
  // Matches: "3/4 + 2/3", "5/8 - 1/4", "3/5 * 2/7", "7/8 / 1/2", "Calculate 3/4 + 2/3"
  const fractionMatch = (withoutPrefix || input).match(
    /^\s*(\d+)\s*\/\s*(\d+)\s*([+\-×*÷/])\s*(\d+)\s*\/\s*(\d+)\s*$/
  );
  if (fractionMatch) {
    const n1 = parseInt(fractionMatch[1]);
    const d1 = parseInt(fractionMatch[2]);
    const op = fractionMatch[3];
    const n2 = parseInt(fractionMatch[4]);
    const d2 = parseInt(fractionMatch[5]);

    if (d1 !== 0 && d2 !== 0) {
      let rN = 0;
      let rD = 1;
      if (op === '+') {
        const cd = lcm(d1, d2);
        rN = n1 * (cd / d1) + n2 * (cd / d2);
        rD = cd;
      } else if (op === '-') {
        const cd = lcm(d1, d2);
        rN = n1 * (cd / d1) - n2 * (cd / d2);
        rD = cd;
      } else if (op === '*' || op === '×') {
        rN = n1 * n2;
        rD = d1 * d2;
      } else {
        rN = n1 * d2;
        rD = d1 * n2;
      }

      const divisor = gcd(rN, rD);
      const simpN = rN / divisor;
      const simpD = rD / divisor;
      const dec = (simpN / simpD).toFixed(4).replace(/\.?0+$/, '');

      return {
        detectedMode: 'fractions',
        modeName: 'Fraction Calculator',
        confidence: 'high',
        finalAnswer: `${simpN}/${simpD} (${dec})`,
        steps: [
          `Input fractions: ${n1}/${d1} ${op} ${n2}/${d2}`,
          `Common denominator arithmetic: ${rN}/${rD}`,
          `Simplify using GCD(${divisor}): ${simpN}/${simpD}`,
        ],
        explanation: `Exact rational fraction arithmetic reduced to lowest terms.`,
        isDeterministic: true,
      };
    }
  }

  // 8. DATE & TIME CALCULATOR
  // Matches: "days between 2026-01-01 and 2026-12-31", "days from 2026-03-01 to 2026-06-01"
  const dateDiffMatch = input.match(
    /(?:days|weeks|difference)?\s*(?:between|from)\s*(\d{4}-\d{2}-\d{2})\s*(?:and|to)\s*(\d{4}-\d{2}-\d{2})/i
  );
  if (dateDiffMatch) {
    const d1 = new Date(dateDiffMatch[1]);
    const d2 = new Date(dateDiffMatch[2]);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(days / 7);
      const remDays = days % 7;
      return {
        detectedMode: 'datetime',
        modeName: 'Date & Time Calculator',
        confidence: 'high',
        finalAnswer: `${days} days (${weeks} weeks, ${remDays} days)`,
        steps: [
          `Start Date: ${dateDiffMatch[1]}`,
          `End Date: ${dateDiffMatch[2]}`,
          `Total elapsed duration: ${days} calendar days`,
        ],
        explanation: `Calculates exact calendar day delta.`,
        isDeterministic: true,
      };
    }
  }

  // 9. PROGRAMMER CALCULATOR
  // Matches: "0xff in decimal", "255 in hex", "0b1010 in dec"
  const progHexToDec = input.match(/^(?:0x([0-9a-fA-F]+)|([0-9a-fA-F]+)\s*hex)\s*(?:in|to)?\s*(?:dec|decimal)?$/i);
  if (progHexToDec && (input.toLowerCase().includes('0x') || input.toLowerCase().includes('hex'))) {
    const hex = progHexToDec[1] || progHexToDec[2];
    try {
      const dec = BigInt('0x' + hex).toString(10);
      return {
        detectedMode: 'programmer',
        modeName: 'Programmer Calculator',
        confidence: 'high',
        finalAnswer: `${dec} (DEC)`,
        steps: [`Hexadecimal: 0x${hex.toUpperCase()}`, `Convert to Decimal (Base 10): ${dec}`],
        explanation: `Base 16 to Base 10 integer conversion.`,
        isDeterministic: true,
      };
    } catch {
      // ignore
    }
  }

  const progDecToHex = input.match(/^(\d+)\s*(?:in|to)\s*hex(?:adecimal)?$/i);
  if (progDecToHex) {
    const dec = BigInt(progDecToHex[1]);
    const hex = dec.toString(16).toUpperCase();
    return {
      detectedMode: 'programmer',
      modeName: 'Programmer Calculator',
      confidence: 'high',
      finalAnswer: `0x${hex}`,
      steps: [`Decimal: ${dec.toString(10)}`, `Convert to Hexadecimal (Base 16): 0x${hex}`],
      explanation: `Base 10 to Base 16 integer conversion.`,
      isDeterministic: true,
    };
  }

  // Hex arithmetic: e.g. "0x1A + 0x0F", "0x1A + 0x0F in hex"
  const hexArithMatch = input.match(
    /^0x([0-9a-fA-F]+)\s*([+\-*&|^])\s*0x([0-9a-fA-F]+)(?:\s*(?:in|to)?\s*hex(?:adecimal)?)?$/i
  );
  if (hexArithMatch) {
    const h1 = BigInt('0x' + hexArithMatch[1]);
    const op = hexArithMatch[2];
    const h2 = BigInt('0x' + hexArithMatch[3]);
    let res = 0n;
    if (op === '+') res = h1 + h2;
    else if (op === '-') res = h1 - h2;
    else if (op === '*') res = h1 * h2;
    else if (op === '&') res = h1 & h2;
    else if (op === '|') res = h1 | h2;
    else if (op === '^') res = h1 ^ h2;

    const hexRes = res.toString(16).toUpperCase();
    return {
      detectedMode: 'programmer',
      modeName: 'Programmer Calculator',
      confidence: 'high',
      finalAnswer: `0x${hexRes} (${res.toString(10)})`,
      steps: [
        `Operand 1: 0x${hexArithMatch[1].toUpperCase()} (${h1.toString(10)})`,
        `Operation: ${op}`,
        `Operand 2: 0x${hexArithMatch[3].toUpperCase()} (${h2.toString(10)})`,
        `Result: 0x${hexRes} (Decimal: ${res.toString(10)})`,
      ],
      explanation: `Programmer bitwise/arithmetic calculation.`,
      isDeterministic: true,
    };
  }

  // 10. MATRIX 2x2 DETERMINANT
  // Matches: "det([[1, 2], [3, 4]])" or "determinant [[1, 2], [3, 4]]"
  const matrixDetMatch = input.match(
    /(?:det|determinant)\s*(?:\()?\s*\[\s*\[\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\]\s*,\s*\[\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\]\s*\]/i
  );
  if (matrixDetMatch) {
    const a = parseFloat(matrixDetMatch[1]);
    const b = parseFloat(matrixDetMatch[2]);
    const c = parseFloat(matrixDetMatch[3]);
    const d = parseFloat(matrixDetMatch[4]);
    const det = a * d - b * c;
    return {
      detectedMode: 'matrix',
      modeName: 'Matrix Calculator',
      confidence: 'high',
      finalAnswer: `${det}`,
      steps: [
        `Matrix: [[${a}, ${b}], [${c}, ${d}]]`,
        `Formula: det(A) = ad - bc`,
        `Compute: (${a} × ${d}) - (${b} × ${c}) = ${a * d} - ${b * c} = ${det}`,
      ],
      explanation: `Determinant of 2×2 square matrix.`,
      formula: `det(A) = ad - bc = ${det}`,
      isDeterministic: true,
    };
  }

  // 11. FINANCIAL LOAN PAYMENT
  // Matches: "mortgage 300000 at 6% for 30 years" or "Loan payment on 300000 at 6% for 30 years"
  const loanMatch = input.match(
    /(?:loan|mortgage)(?:\s+payment)?(?:\s+on)?\s*(?:\$)?(\d+)\s*(?:at)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:for)?\s*(\d+)\s*(?:years|yrs)/i
  );
  if (loanMatch) {
    const principal = parseFloat(loanMatch[1]);
    const rate = parseFloat(loanMatch[2]);
    const years = parseFloat(loanMatch[3]);
    const months = years * 12;
    const r = rate / 100 / 12;
    const monthlyPmt = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    const totalPmt = monthlyPmt * months;
    const totalInt = totalPmt - principal;
    return {
      detectedMode: 'financial',
      modeName: 'Financial Calculator',
      confidence: 'high',
      finalAnswer: `$${monthlyPmt.toFixed(2)}/month`,
      steps: [
        `Loan principal: $${principal.toLocaleString()} at ${rate}% for ${years} years (${months} monthly payments)`,
        `Monthly payment formula: M = P[r(1+r)^n] / [(1+r)^n - 1] = $${monthlyPmt.toFixed(2)}`,
        `Total lifetime payments: $${totalPmt.toFixed(2)} (Total interest: $${totalInt.toFixed(2)})`,
      ],
      explanation: `Calculates monthly fixed-rate loan amortization.`,
      formula: `M = $${monthlyPmt.toFixed(2)}/mo`,
      isDeterministic: true,
    };
  }

  // 12. PURE ARITHMETIC / STANDARD CALCULATOR
  // Matches basic expressions like "150 + 250", "48 * 12 - 5", "1000 / 8"
  if (/^[\d\s+\-*/().%^]+$/.test(input) && /\d/.test(input)) {
    try {
      const val = evaluateMathExpression(input, 'deg');
      const formatted = parseFloat(val.toFixed(8)).toString();
      return {
        detectedMode: 'standard',
        modeName: 'Standard Calculator',
        confidence: 'high',
        finalAnswer: formatted,
        steps: [
          `Evaluate arithmetic: ${input}`,
          `Result: = ${formatted}`,
        ],
        explanation: `Evaluated using standard operator precedence (PEMDAS).`,
        prefillExpression: input,
        isDeterministic: true,
      };
    } catch {
      // Pass to AI
    }
  }

  // Did not match deterministic rules; fallback to Gemini AI reasoning
  return null;
}
