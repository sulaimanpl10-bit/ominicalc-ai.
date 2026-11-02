import React, { useState, useRef } from 'react';
import {
  Wand2,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Sparkles,
  Info,
  Zap,
  Gauge,
  Brain,
  Trash2,
  Camera,
} from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { CalculatorMode } from '../../types/calculator';
import { CALCULATOR_MODES } from '../../utils/modesConfig';
import {
  detectAndSolveDeterministically,
  AutoDetectionResult,
} from '../../utils/autoDetector';
import { clientCache } from '../../utils/performanceCache';
import { CameraMathSolverModal } from '../camera/CameraMathSolverModal';
import { MathRenderer } from '../common/MathRenderer';

const TEST_EXAMPLES = [
  { label: '25% of 800', expected: 'Percentage Calculator' },
  { label: 'Solve 3x + 7 = 22', expected: 'Equation Solver' },
  { label: 'Convert 10 km to miles', expected: 'Unit Converter' },
  { label: 'sin(30°)', expected: 'Scientific Calculator' },
  { label: 'What is the area of a circle with radius 5?', expected: 'Geometry Calculator' },
  { label: 'Mean of 14, 28, 35, 42, 56', expected: 'Statistics Calculator' },
  { label: '3/4 + 2/3', expected: 'Fraction Calculator' },
  { label: 'days between 2026-01-01 and 2026-12-31', expected: 'Date & Time' },
];

export const AutoCalculator: React.FC = () => {
  const {
    setMode,
    addHistory,
    showToast,
    setReusedExpression,
    performanceMode,
    setPerformanceMode,
    clearCache,
  } = useCalculator();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [result, setResult] = useState<AutoDetectionResult | null>(null);
  const [selectedOverrideMode, setSelectedOverrideMode] = useState<CalculatorMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Main evaluation pipeline with performance optimization
  const handleProcessQuery = async (queryToRun?: string) => {
    const text = (queryToRun !== undefined ? queryToRun : query).trim();
    if (!text) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setError(null);
    setLoading(true);
    setStreamingText('');
    setSelectedOverrideMode(null);

    const startTime = performance.now();

    // 1. Check client-side memory cache (0ms)
    const cached = clientCache.get<AutoDetectionResult>(text, performanceMode);
    if (cached) {
      const durationMs = Math.max(0.1, parseFloat((performance.now() - startTime).toFixed(2)));
      const resWithPerf: AutoDetectionResult = {
        ...cached.data,
        engine: 'cache',
        durationMs,
      };
      setResult(resWithPerf);
      setLoading(false);
      showToast('Retrieved from local cache (0ms)');
      return;
    }

    // 2. Deterministic local detection (sub-millisecond execution, exact math)
    const localResult = detectAndSolveDeterministically(text);
    if (localResult) {
      const durationMs = Math.max(0.1, parseFloat((performance.now() - startTime).toFixed(2)));
      const finalRes: AutoDetectionResult = {
        ...localResult,
        engine: 'local',
        durationMs,
      };
      setResult(finalRes);
      setLoading(false);

      clientCache.set(text, finalRes, 'local', durationMs, undefined, performanceMode);

      addHistory({
        mode: localResult.detectedMode,
        modeName: localResult.modeName,
        expression: text,
        result: localResult.finalAnswer,
        details: `Local engine (${durationMs}ms)`,
      });
      return;
    }

    // 3. Fallback to progressive streaming Gemini AI
    try {
      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: text,
          context: 'Analyze intent, specify appropriate calculator mode, and calculate exact solution.',
          performanceMode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to connect to AI streaming service.');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response reader is unavailable.');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let ttftMs: number | undefined;
      let modelUsed = 'gemini-3.8-flash';
      let donePayload: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;

            try {
              const payload = JSON.parse(dataStr);
              if (payload.type === 'chunk') {
                if (payload.ttftMs && ttftMs === undefined) {
                  ttftMs = payload.ttftMs;
                }
                if (payload.model) modelUsed = payload.model;
                accumulatedText += payload.text;
                setStreamingText(accumulatedText);
              } else if (payload.type === 'done') {
                donePayload = payload;
              } else if (payload.type === 'error') {
                throw new Error(payload.error);
              }
            } catch {
              // Ignore partial JSON chunks during stream
            }
          }
        }
      }

      // Parse final accumulated JSON
      let parsed: any;
      try {
        parsed = JSON.parse(accumulatedText);
      } catch {
        const match = accumulatedText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else {
          parsed = {
            finalAnswer: accumulatedText,
            steps: [accumulatedText],
            explanation: 'Streaming response',
          };
        }
      }

      const totalDurationMs = Math.round(
        donePayload?.totalDurationMs || performance.now() - startTime
      );
      const detectedMode: CalculatorMode = parsed.suggestedMode || 'ai-solver';
      const meta = CALCULATOR_MODES.find((m) => m.id === detectedMode);

      const aiResult: AutoDetectionResult = {
        detectedMode,
        modeName: meta?.name || 'AI Math Solver',
        confidence: 'medium',
        finalAnswer: parsed.finalAnswer || 'Calculated',
        steps: parsed.steps || [],
        explanation: parsed.explanation || parsed.problemSummary || '',
        formula: parsed.latex,
        prefillExpression: text,
        isDeterministic: false,
        engine: 'ai-stream',
        durationMs: totalDurationMs,
        ttftMs: ttftMs || donePayload?.ttftMs,
      };

      setResult(aiResult);
      clientCache.set(text, aiResult, 'ai-stream', totalDurationMs, ttftMs, performanceMode);

      addHistory({
        mode: detectedMode,
        modeName: meta?.name || 'AI Math Solver',
        expression: text,
        result: parsed.finalAnswer,
        details: `Gemini AI (${totalDurationMs}ms, TTFT: ${ttftMs || 0}ms)`,
      });
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message || 'Calculation error. Please check expression.');
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.finalAnswer);
    setCopied(true);
    showToast('Copied answer to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchToCalculator = (targetMode: CalculatorMode) => {
    if (result?.prefillExpression) {
      setReusedExpression(result.prefillExpression);
    }
    setMode(targetMode);
    showToast(`Switched to ${CALCULATOR_MODES.find((m) => m.id === targetMode)?.name}`);
  };

  const handleClearCache = () => {
    clearCache();
    showToast('Cleared memory and API response cache');
  };

  const effectiveMode = selectedOverrideMode || result?.detectedMode || 'standard';
  const effectiveModeMeta = CALCULATOR_MODES.find((m) => m.id === effectiveMode);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Search & Query Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 transition-colors">
        {/* Performance Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <Wand2 className="w-4 h-4" />
            <span>Smart Auto-Detection & High-Performance Calculation</span>
          </div>

          {/* AI Performance Mode Selector */}
          <div className="flex items-center gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium">
            <button
              onClick={() => setPerformanceMode('fast')}
              title="Fast: Minimal latency with rapid AI reasoning"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                performanceMode === 'fast'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Fast</span>
            </button>
            <button
              onClick={() => setPerformanceMode('balanced')}
              title="Balanced: Optimal speed and reasoning accuracy (Default)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                performanceMode === 'balanced'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Gauge className="w-3 h-3 text-indigo-500" />
              <span>Balanced</span>
            </button>
            <button
              onClick={() => setPerformanceMode('deep')}
              title="Deep: High reasoning effort for multi-step proofs"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                performanceMode === 'deep'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Brain className="w-3 h-3 text-purple-500" />
              <span>Deep</span>
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessQuery();
          }}
          className="relative"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter any expression or question (e.g. '25% of 800', 'Solve 3x + 7 = 22', 'sin(30°)', '10 km to miles')..."
              className="w-full px-4 py-3.5 pr-40 text-sm sm:text-base font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                title="Scan math problem with Camera or upload photo"
                aria-label="Scan with Camera"
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800/60 shadow-2xs"
              >
                <Camera className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Solving...</span>
                  </>
                ) : (
                  <>
                    <span>Calculate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Test Examples Strip & Cache clear */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Test queries:
            </span>
            {TEST_EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(ex.label);
                  handleProcessQuery(ex.label);
                }}
                className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-left flex items-center gap-1.5 group"
              >
                <span>{ex.label}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 font-mono">
                  → {ex.expected.replace(' Calculator', '')}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleClearCache}
            title="Clear stored calculation and AI response caches"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 transition-colors shrink-0 ml-auto"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Cache</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Error: </strong> {error}
          </div>
        </div>
      )}

      {/* Streaming State Live Preview */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Streaming Gemini AI Reasoning...</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Mode: {performanceMode.toUpperCase()}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[80px]">
            {streamingText || 'Analyzing problem intent and streaming solution...'}
            <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse" />
          </div>
        </div>
      )}

      {/* Result Card */}
      {!loading && result && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 transition-colors">
          {/* Top Banner: Detected Mode, Engine Telemetry & Manual Override Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Detected Mode:
              </span>
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>{result.modeName}</span>
              </span>

              {/* Engine Telemetry Badge */}
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                {result.engine === 'cache' && <span>⚡ Cache Hit ({result.durationMs}ms)</span>}
                {result.engine === 'local' && <span>⚡ Local Engine ({result.durationMs}ms)</span>}
                {result.engine === 'ai-stream' && (
                  <span>
                    🤖 Gemini Stream (TTFT: {result.ttftMs || 0}ms · Total: {result.durationMs}ms)
                  </span>
                )}
                {!result.engine && result.isDeterministic && <span>⚡ Deterministic</span>}
              </span>
            </div>

            {/* Manual Override Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Override mode:</span>
              <select
                value={effectiveMode}
                onChange={(e) => {
                  const m = e.target.value as CalculatorMode;
                  setSelectedOverrideMode(m);
                  showToast(`Mode overridden to ${CALCULATOR_MODES.find((x) => x.id === m)?.name}`);
                }}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:outline-none"
              >
                {CALCULATOR_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Calculated Answer Card */}
          <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1">
                Calculated Answer
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-indigo-950 dark:text-indigo-100 break-all">
                {result.finalAnswer}
              </div>
              {result.formula && (
                <div className="mt-1.5 text-xs text-indigo-800/80 dark:text-indigo-300/80 max-w-full overflow-x-auto">
                  <MathRenderer latex={result.formula} displayMode={false} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Result'}</span>
              </button>

              <button
                onClick={() => handleSwitchToCalculator(effectiveMode)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                title={`Open this in full ${effectiveModeMeta?.name}`}
              >
                <span>Open in {effectiveModeMeta?.shortName}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Step-by-Step Explanation Accordion */}
          {result.steps && result.steps.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <span>Step-by-Step Explanation ({result.steps.length} steps)</span>
                {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showSteps && (
                <div className="space-y-2 pt-1">
                  {result.steps.map((st, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 leading-relaxed">
                        <MathRenderer latex={st} displayMode={false} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contextual Intuition Note */}
          {result.explanation && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Explanation: </span>
              {result.explanation}
            </div>
          )}
        </div>
      )}

      {/* AI Camera Solver Modal */}
      <CameraMathSolverModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onApplyMathToSolver={(mathText) => {
          setQuery(mathText);
          handleProcessQuery(mathText);
        }}
      />
    </div>
  );
};
