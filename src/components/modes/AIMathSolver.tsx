import React, { useState, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  CornerDownRight,
  Lightbulb,
  Loader2,
  Zap,
  Gauge,
  Brain,
  Trash2,
  Camera,
} from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { AISolveResponse, CalculatorMode } from '../../types/calculator';
import { CALCULATOR_MODES } from '../../utils/modesConfig';
import { clientCache } from '../../utils/performanceCache';
import { CameraMathSolverModal } from '../camera/CameraMathSolverModal';
import { MathRenderer } from '../common/MathRenderer';

const SAMPLE_PROMPTS = [
  'Solve for x: 3x² - 5x + 2 = 0 with full derivation',
  'What is the monthly mortgage payment on $350,000 at 5.5% interest for 30 years?',
  'Calculate the determinant and inverse of the matrix [[2, 4], [1, 3]]',
  'Find the derivative of f(x) = x³ · sin(x) using the product rule',
  'If a car travels 65 miles in 1 hour 15 minutes, what is its average speed in km/h?',
];

interface SolverTelemetry {
  engine: 'cache' | 'ai-stream';
  durationMs: number;
  ttftMs?: number;
  model?: string;
}

export const AIMathSolver: React.FC = () => {
  const { setMode, addHistory, showToast, performanceMode, setPerformanceMode, clearCache } =
    useCalculator();

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [result, setResult] = useState<AISolveResponse | null>(null);
  const [telemetry, setTelemetry] = useState<SolverTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSolve = async (promptToUse?: string) => {
    const query = (promptToUse || inputPrompt).trim();
    if (!query) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setResult(null);
    setStreamingText('');
    setTelemetry(null);

    const startTime = performance.now();

    // 1. Check client memory cache (0ms hit)
    const cached = clientCache.get<AISolveResponse>(`ai_solve:${query}`, performanceMode);
    if (cached) {
      const durationMs = Math.max(0.1, parseFloat((performance.now() - startTime).toFixed(2)));
      setResult(cached.data);
      setTelemetry({
        engine: 'cache',
        durationMs,
        ttftMs: cached.ttftMs,
      });
      setLoading(false);
      showToast('Retrieved from local cache (0ms)');
      return;
    }

    // 2. Stream solution via Server-Sent Events from Gemini
    try {
      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: query,
          performanceMode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to connect to AI streaming solver.');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response reader is unavailable.');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let ttftMs: number | undefined;
      let modelUsed = performanceMode === 'deep' ? 'gemini-3.8-flash (High Reasoning)' : 'gemini-3.8-flash';
      let donePayload: { totalDurationMs?: number; ttftMs?: number; model?: string } | null = null;

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
              // Ignore partial JSON parsing during streaming
            }
          }
        }
      }

      // Parse final accumulated JSON
      let parsed: {
        problemSummary?: string;
        finalAnswer?: string;
        steps?: string[];
        explanation?: string;
        latex?: string;
        suggestedMode?: CalculatorMode;
      };

      try {
        parsed = JSON.parse(accumulatedText);
      } catch {
        const match = accumulatedText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          parsed = {
            problemSummary: query,
            finalAnswer: accumulatedText,
            steps: [accumulatedText],
            explanation: 'Streaming response generated by AI model.',
          };
        }
      }

      const totalDurationMs = Math.round(
        donePayload?.totalDurationMs || performance.now() - startTime
      );
      const measuredTtft = ttftMs || donePayload?.ttftMs;

      const solvedResult: AISolveResponse = {
        problemSummary: parsed.problemSummary || query,
        finalAnswer: parsed.finalAnswer || 'Computed',
        steps: parsed.steps && parsed.steps.length > 0 ? parsed.steps : [parsed.finalAnswer || ''],
        explanation: parsed.explanation || '',
        latex: parsed.latex,
        suggestedMode: parsed.suggestedMode,
      };

      setResult(solvedResult);
      setTelemetry({
        engine: 'ai-stream',
        durationMs: totalDurationMs,
        ttftMs: measuredTtft,
        model: modelUsed,
      });

      // Cache result locally
      clientCache.set(
        `ai_solve:${query}`,
        solvedResult,
        'ai-stream',
        totalDurationMs,
        measuredTtft,
        performanceMode
      );

      // Save into history
      addHistory({
        mode: 'ai-solver',
        modeName: 'AI Math Solver',
        expression: query,
        result: solvedResult.finalAnswer,
        details: `Gemini AI (${totalDurationMs}ms, TTFT: ${measuredTtft || 0}ms)`,
      });

      showToast('Problem solved with Gemini');
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message || 'Unable to communicate with AI service.');
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const copyAnswer = () => {
    if (!result) return;
    const fullText = `Problem: ${result.problemSummary || inputPrompt}\n\nAnswer: ${result.finalAnswer}\n\nSteps:\n${result.steps.join('\n')}\n\nExplanation: ${result.explanation || ''}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    showToast('Copied full solution');
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestedMeta = result?.suggestedMode
    ? CALCULATOR_MODES.find((m) => m.id === result.suggestedMode)
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Search Input Box & Performance Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <span>Mathematical Reasoning & High-Performance Step-by-Step Solver</span>
          </div>

          {/* Performance Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setPerformanceMode('fast')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                performanceMode === 'fast'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Fast: Low reasoning effort for instant answers"
            >
              <Zap className="w-3 h-3" />
              <span>Fast</span>
            </button>
            <button
              onClick={() => setPerformanceMode('balanced')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                performanceMode === 'balanced'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Balanced: Standard reasoning with optimal speed & clarity"
            >
              <Gauge className="w-3 h-3" />
              <span>Balanced</span>
            </button>
            <button
              onClick={() => setPerformanceMode('deep')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                performanceMode === 'deep'
                  ? 'bg-violet-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Deep: High reasoning effort for complex multi-step proofs"
            >
              <Brain className="w-3 h-3" />
              <span>Deep</span>
            </button>

            <button
              onClick={() => {
                clearCache();
                showToast('Cleared memory cache');
              }}
              className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded transition-colors ml-1"
              title="Clear cache"
              aria-label="Clear cache"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSolve();
          }}
          className="relative"
        >
          <div className="relative">
            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Type or paste any mathematical question, calculus derivation, word problem, or expression..."
              rows={3}
              className="w-full p-3.5 pr-14 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />

            {/* Quick Camera Icon inside textarea */}
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              title="Take photo of math problem or upload image"
              aria-label="Open Camera Math Solver"
              className="absolute top-3 right-3 p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition-all shadow-xs group"
            >
              <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>AI Camera Solver</span>
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Streaming via SSE • Zero-latency caching • Gemini 3.8 Flash
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Solve Step-by-Step</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sample Prompts */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Try an example:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputPrompt(p);
                  handleSolve(p);
                }}
                className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors text-left truncate max-w-xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Streaming In-Progress Preview */}
      {loading && streamingText && (
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-2 animate-pulse">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Streaming response in real-time...
            </span>
            <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded">
              SSE Live
            </span>
          </div>
          <div className="text-xs font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
            {streamingText}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          <span className="font-semibold">Error: </span>
          {error}
        </div>
      )}

      {/* Solution Results View */}
      {result && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5 transition-colors">
          {/* Header & Copy Button */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Problem
                </span>
                {telemetry && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                    {telemetry.engine === 'cache' ? (
                      '⚡ Cache Hit (0ms)'
                    ) : (
                      <>
                        Latency: {telemetry.durationMs}ms
                        {telemetry.ttftMs ? ` • TTFT: ${telemetry.ttftMs}ms` : ''}
                      </>
                    )}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {result.problemSummary || inputPrompt}
              </h3>
            </div>
            <button
              onClick={copyAnswer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Solution'}</span>
            </button>
          </div>

          {/* Final Answer Banner with KaTeX */}
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              Final Answer
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-950 dark:text-indigo-100 break-all">
              {result.finalAnswer}
            </div>
            {result.latex && (
              <div className="mt-2 text-base text-indigo-900 dark:text-indigo-200 bg-white/70 dark:bg-slate-900/70 px-3 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 inline-block max-w-full overflow-x-auto">
                <MathRenderer latex={result.latex} />
              </div>
            )}
          </div>

          {/* Step-by-Step Breakdown with KaTeX */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Step-by-Step Breakdown
            </div>
            <div className="space-y-2">
              {result.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 leading-relaxed font-mono text-xs sm:text-sm whitespace-pre-wrap">
                    <MathRenderer latex={step} displayMode={false} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High-Level Explanation */}
          {result.explanation && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Conceptual Insight: </span>
                {result.explanation}
              </div>
            </div>
          )}

          {/* Mode Recommendation Callout */}
          {suggestedMeta && (
            <div className="flex items-center justify-between p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CornerDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  OmniCalc has a dedicated tool for this:{' '}
                  <strong>{suggestedMeta.name}</strong>.
                </span>
              </div>
              <button
                onClick={() => setMode(suggestedMeta.id)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors shrink-0 ml-2"
              >
                Switch to {suggestedMeta.shortName}
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Camera Solver Modal */}
      <CameraMathSolverModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onApplyMathToSolver={(mathText) => {
          setInputPrompt(mathText);
          handleSolve(mathText);
        }}
      />
    </div>
  );
};
