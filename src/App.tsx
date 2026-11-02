import React from 'react';
import { CalculatorProvider, useCalculator } from './context/CalculatorContext';
import { Header } from './components/Header';
import { ModeNavigation } from './components/ModeNavigation';
import { CommandPalette } from './components/CommandPalette';
import { HistoryDrawer } from './components/HistoryDrawer';

// 15 Calculator Modes + Smart Auto Mode
import { AutoCalculator } from './components/modes/AutoCalculator';
import { StandardCalculator } from './components/modes/StandardCalculator';
import { ScientificCalculator } from './components/modes/ScientificCalculator';
import { GraphingCalculator } from './components/modes/GraphingCalculator';
import { AIMathSolver } from './components/modes/AIMathSolver';
import { UnitConverter } from './components/modes/UnitConverter';
import { CurrencyConverter } from './components/modes/CurrencyConverter';
import { PercentageCalculator } from './components/modes/PercentageCalculator';
import { DateTimeCalculator } from './components/modes/DateTimeCalculator';
import { ProgrammerCalculator } from './components/modes/ProgrammerCalculator';
import { GeometryCalculator } from './components/modes/GeometryCalculator';
import { StatisticsCalculator } from './components/modes/StatisticsCalculator';
import { MatrixCalculator } from './components/modes/MatrixCalculator';
import { EquationSolver } from './components/modes/EquationSolver';
import { FinancialCalculator } from './components/modes/FinancialCalculator';
import { FractionCalculator } from './components/modes/FractionCalculator';

const CalculatorStage: React.FC = () => {
  const { mode, toastMessage } = useCalculator();

  const renderActiveMode = () => {
    switch (mode) {
      case 'auto':
        return <AutoCalculator />;
      case 'standard':
        return <StandardCalculator />;
      case 'scientific':
        return <ScientificCalculator />;
      case 'graphing':
        return <GraphingCalculator />;
      case 'ai-solver':
        return <AIMathSolver />;
      case 'unit-converter':
        return <UnitConverter />;
      case 'currency':
        return <CurrencyConverter />;
      case 'percentage':
        return <PercentageCalculator />;
      case 'datetime':
        return <DateTimeCalculator />;
      case 'programmer':
        return <ProgrammerCalculator />;
      case 'geometry':
        return <GeometryCalculator />;
      case 'statistics':
        return <StatisticsCalculator />;
      case 'matrix':
        return <MatrixCalculator />;
      case 'equations':
        return <EquationSolver />;
      case 'financial':
        return <FinancialCalculator />;
      case 'fractions':
        return <FractionCalculator />;
      default:
        return <StandardCalculator />;
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col justify-center">
      {renderActiveMode()}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 dark:bg-slate-100/90 backdrop-blur-md text-white dark:text-slate-900 text-xs font-medium px-4 py-2 rounded-xl shadow-lg border border-slate-700/50 dark:border-slate-300/50 transition-all pointer-events-none"
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
};

export default function App() {
  return (
    <CalculatorProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <Header />
        <ModeNavigation />
        <CalculatorStage />

        <CommandPalette />
        <HistoryDrawer />

        {/* Clean, quiet footer per design constitution */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>OmniCalc AI</span>
              <span aria-hidden="true">·</span>
              <span>15 Unified Computational Engines</span>
              <span aria-hidden="true">·</span>
              <span>Gemini 3.8 Flash Assisted</span>
            </div>
            <div>
              <span>Press <kbd className="px-1 py-0.5 font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">⌘K</kbd> to search modes</span>
            </div>
          </div>
        </footer>
      </div>
    </CalculatorProvider>
  );
}
