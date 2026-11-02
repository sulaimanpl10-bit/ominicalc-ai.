export type CalculatorMode =
  | 'auto'
  | 'standard'
  | 'scientific'
  | 'graphing'
  | 'ai-solver'
  | 'unit-converter'
  | 'currency'
  | 'percentage'
  | 'datetime'
  | 'programmer'
  | 'geometry'
  | 'statistics'
  | 'matrix'
  | 'equations'
  | 'financial'
  | 'fractions';

export interface ModeMetadata {
  id: CalculatorMode;
  name: string;
  shortName: string;
  category: 'Core' | 'Scientific & Graphing' | 'Applied' | 'Algebra & Advanced' | 'Technical';
  description: string;
  shortcut: string;
  tags: string[];
}

export interface CalculationHistoryItem {
  id: string;
  mode: CalculatorMode;
  modeName: string;
  expression: string;
  result: string;
  timestamp: number;
  details?: string;
}

export interface AISolveResponse {
  problemSummary?: string;
  finalAnswer: string;
  steps: string[];
  explanation?: string;
  latex?: string;
  suggestedMode?: CalculatorMode | null;
  followUpTips?: string[];
}

export interface CameraMathExtraction {
  extractedMath: string;
  latex?: string;
  isReadable: boolean;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
  uncertainties?: string[];
  suggestedMode?: CalculatorMode;
  problemType?: string;
}
