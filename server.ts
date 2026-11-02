import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { detectAndSolveDeterministically } from './src/utils/autoDetector';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Shared GoogleGenAI instance with required aistudio-build telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini API call timed out after 8s')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Helper for resilient Gemini API execution with exponential backoff on transient 503/429
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 1000): Promise<T> {
  try {
    return await withTimeout(fn(), 8000);
  } catch (err: any) {
    const msg = err?.message || '';
    const isTransient =
      msg.includes('503') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand') ||
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('timed out');

    if (retries > 0 && isTransient) {
      console.warn(`[Gemini API] Retrying transient error (${msg})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return callGeminiWithRetry(fn, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

// Server-side response cache (TTL: 1 hour)
interface ServerCacheItem {
  data: any;
  timestamp: number;
}
const serverCache = new Map<string, ServerCacheItem>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ITEMS = 500;

function getFromCache(key: string): any | null {
  const item = serverCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    serverCache.delete(key);
    return null;
  }
  return item.data;
}

function setToCache(key: string, data: any): void {
  if (serverCache.size >= MAX_CACHE_ITEMS) {
    const oldestKey = serverCache.keys().next().value;
    if (oldestKey) serverCache.delete(oldestKey);
  }
  serverCache.set(key, { data, timestamp: Date.now() });
}

// Currency Rates Cache
let cachedCurrencyData: {
  rates: Record<string, number>;
  base: string;
  time_last_update_utc?: string;
  cachedAt: number;
} | null = null;

const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 153.25,
  CAD: 1.38,
  AUD: 1.52,
  CHF: 0.88,
  CNY: 7.24,
  INR: 84.1,
  MXN: 19.85,
  BRL: 5.75,
  SGD: 1.33,
  HKD: 7.78,
  NZD: 1.67,
  KRW: 1378.5,
  SEK: 10.65,
  NOK: 10.98,
  TRY: 34.25,
  ZAR: 17.65,
  AED: 3.67,
  SAR: 3.75,
};

// API: Currency rates endpoint
app.get('/api/currency/rates', async (_req, res) => {
  const now = Date.now();
  if (cachedCurrencyData && now - cachedCurrencyData.cachedAt < 3600 * 1000) {
    return res.json({
      success: true,
      data: cachedCurrencyData,
      source: 'cache',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && data.rates) {
        cachedCurrencyData = {
          rates: data.rates,
          base: data.base_code || 'USD',
          time_last_update_utc: data.time_last_update_utc || new Date().toUTCString(),
          cachedAt: now,
        };
        return res.json({
          success: true,
          data: cachedCurrencyData,
          source: 'live',
        });
      }
    }
    throw new Error('Invalid rate response');
  } catch (err: unknown) {
    console.warn('Currency live fetch fallback used:', (err as Error).message);
    const fallbackData = {
      rates: cachedCurrencyData ? cachedCurrencyData.rates : FALLBACK_RATES,
      base: 'USD',
      time_last_update_utc: new Date().toUTCString(),
      cachedAt: now,
    };
    return res.json({
      success: true,
      data: fallbackData,
      source: 'fallback',
      warning: 'Using verified baseline rates due to network limit',
    });
  }
});

// Cache management endpoints
app.get('/api/cache/stats', (_req, res) => {
  res.json({
    size: serverCache.size,
    maxSize: MAX_CACHE_ITEMS,
    hasKey: !!process.env.GEMINI_API_KEY,
    keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 4) : 'none',
  });
});

app.post('/api/cache/clear', (_req, res) => {
  serverCache.clear();
  cachedCurrencyData = null;
  res.json({ success: true, message: 'Server caches cleared.' });
});

// Helper for model and thinking configuration based on performance mode
function getModelAndThinking(performanceMode?: string): {
  model: string;
  thinkingLevel: ThinkingLevel;
} {
  const mode = (performanceMode || 'balanced').toLowerCase();
  switch (mode) {
    case 'fast':
      return {
        model: 'gemini-3.8-flash',
        thinkingLevel: ThinkingLevel.LOW,
      };
    case 'deep':
      return {
        model: 'gemini-3.8-flash',
        thinkingLevel: ThinkingLevel.HIGH,
      };
    case 'balanced':
    default:
      return {
        model: 'gemini-3.8-flash',
        thinkingLevel: ThinkingLevel.LOW,
      };
  }
}

// Token-optimized concise system instruction for math solver
const SOLVER_SYSTEM_INSTRUCTION = `You are OmniCalc AI's mathematical reasoning engine.
Analyze math problems precisely. Return valid JSON only with this structure:
{
  "problemSummary": "Clean restatement of the problem in concise terms",
  "finalAnswer": "Precise final exact or calculated answer",
  "steps": [
    "Step 1: description and equation",
    "Step 2: simplification..."
  ],
  "explanation": "Clear, friendly high-level intuition of the math principle used",
  "latex": "LaTeX formatted formula if applicable",
  "suggestedMode": "One of: standard, scientific, graphing, unit-converter, currency, percentage, datetime, programmer, geometry, statistics, matrix, equations, financial, fractions",
  "followUpTips": ["Tip 1"]
}`;

// API: AI Math Solver (Synchronous JSON with Caching & Performance Modes)
app.post('/api/gemini/solve', async (req, res) => {
  const startTime = Date.now();
  try {
    const { problem, context, performanceMode = 'balanced' } = req.body;
    if (!problem || typeof problem !== 'string' || problem.trim().length === 0) {
      return res.status(400).json({ error: 'Problem description or expression is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please ensure your secret is attached in Settings > Secrets.',
      });
    }

    // Check cache
    const cacheKey = `solve::${performanceMode}::${problem.trim().toLowerCase()}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        result: cached,
        cached: true,
        durationMs: Date.now() - startTime,
      });
    }

    const { model, thinkingLevel } = getModelAndThinking(performanceMode);

    const promptText = `Solve precisely:
${problem.trim()}
${context ? `Context: ${context}` : ''}
Return strict JSON.`;

    const response = await ai.models.generateContent({
      model,
      contents: promptText,
      config: {
        systemInstruction: SOLVER_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel },
      },
    });

    const responseText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = {
          problemSummary: problem,
          finalAnswer: responseText,
          steps: [responseText],
          explanation: 'Calculated step-by-step solution',
          suggestedMode: null,
        };
      }
    }

    // Cache result
    setToCache(cacheKey, parsed);

    const durationMs = Date.now() - startTime;
    return res.json({
      success: true,
      result: parsed,
      cached: false,
      model,
      durationMs,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Gemini solve error:', err);
    return res.status(500).json({
      error: err.message || 'An error occurred while solving the problem with Gemini.',
    });
  }
});

// API: Progressive Streaming AI Endpoint (SSE)
app.post('/api/gemini/stream', async (req, res) => {
  const startTime = Date.now();
  let firstTokenTime: number | null = null;

  const { problem, context, performanceMode = 'balanced' } = req.body;
  if (!problem || typeof problem !== 'string' || problem.trim().length === 0) {
    return res.status(400).json({ error: 'Problem is required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Gemini API key is not configured.' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Check cache first
  const cacheKey = `solve::${performanceMode}::${problem.trim().toLowerCase()}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    res.write(
      `data: ${JSON.stringify({
        type: 'chunk',
        text: JSON.stringify(cached),
        isComplete: true,
        cached: true,
        ttftMs: 1,
        totalDurationMs: Date.now() - startTime,
      })}\n\n`
    );
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  try {
    const { model, thinkingLevel } = getModelAndThinking(performanceMode);

    const promptText = `Solve precisely:
${problem.trim()}
${context ? `Context: ${context}` : ''}
Return strict JSON matching the schema.`;

    const stream = await ai.models.generateContentStream({
      model,
      contents: promptText,
      config: {
        systemInstruction: SOLVER_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel },
      },
    });

    let fullAccumulated = '';

    for await (const chunk of stream) {
      if (firstTokenTime === null) {
        firstTokenTime = Date.now() - startTime;
      }
      const chunkText = chunk.text || '';
      fullAccumulated += chunkText;

      res.write(
        `data: ${JSON.stringify({
          type: 'chunk',
          text: chunkText,
          ttftMs: firstTokenTime,
          model,
        })}\n\n`
      );
    }

    try {
      const parsed = JSON.parse(fullAccumulated);
      setToCache(cacheKey, parsed);
    } catch {
      const jsonMatch = fullAccumulated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          setToCache(cacheKey, JSON.parse(jsonMatch[0]));
        } catch {
          // ignore
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        ttftMs: firstTokenTime || totalDurationMs,
        totalDurationMs,
        model,
      })}\n\n`
    );
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: unknown) {
    const errorMsg = (err as Error).message || 'Streaming failed.';
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
    res.end();
  }
});

// API: Fast AI Mode Recommender (Uses gemini-3.1-flash-lite for minimal latency)
app.post('/api/gemini/suggest-mode', async (req, res) => {
  const startTime = Date.now();
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const cacheKey = `suggest::${query.trim().toLowerCase()}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ success: true, ...cached, cached: true, durationMs: Date.now() - startTime });
    }

    const systemInstruction = `You are a calculator dispatcher. Output JSON with:
{
  "modeId": "standard|scientific|graphing|ai-solver|unit-converter|currency|percentage|datetime|programmer|geometry|statistics|matrix|equations|financial|fractions",
  "reason": "1-sentence reason",
  "extractedInput": "clean math expression"
}`;

    let responseText = '';
    let usedModel = 'gemini-3.1-flash-lite';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Query: "${query}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      responseText = response.text || '{}';
    } catch {
      usedModel = 'gemini-3.8-flash';
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Query: "${query}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      responseText = response.text || '{}';
    }

    const parsed = JSON.parse(responseText);
    setToCache(cacheKey, parsed);

    return res.json({
      success: true,
      ...parsed,
      cached: false,
      model: usedModel,
      durationMs: Date.now() - startTime,
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// API: Camera Math OCR & Expression Extraction
const CAMERA_OCR_SYSTEM_INSTRUCTION = `You are OmniCalc AI's Camera Math Vision and Recognition specialist.
Analyze photos of mathematical problems (printed textbooks, exams, worksheets, or handwritten math).

Rules:
1. Extract the mathematical question or expression with absolute mathematical fidelity (fractions, powers, radicals, integrals, systems of equations, matrices, trigonometry, geometry word problems).
2. If any symbol, digit, or operator is blurry, cropped, smudged, or ambiguous, DO NOT GUESS. Note the uncertainty in the "uncertainties" array with suspected candidates.
3. If the image is completely unreadable or contains no recognizable math, set "isReadable": false and explain in "notes".
4. Provide both a clean plain-text/ASCII expression in "extractedMath" and standard LaTeX notation in "latex".
5. Recommend the best calculator mode from: equations, standard, scientific, graphing, fractions, matrix, geometry, statistics, unit-converter, financial, datetime, programmer, percentage.

Output strict JSON only with this schema:
{
  "extractedMath": "string",
  "latex": "string",
  "isReadable": true,
  "confidence": "high" | "medium" | "low",
  "notes": "string",
  "uncertainties": ["string"],
  "suggestedMode": "string",
  "problemType": "string"
}`;

app.post('/api/gemini/camera-extract', async (req, res) => {
  const startTime = Date.now();
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Image base64 data is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    // Strip data URL header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    // Safely handle empty / 1x1 blank image without wasting tokens or guessing
    if (cleanBase64.length < 200) {
      return res.json({
        success: true,
        result: {
          extractedMath: '',
          latex: '',
          isReadable: false,
          confidence: 'low',
          notes: 'Image is blank or indecipherable. Please align clear math text in camera.',
          uncertainties: ['Image contains no recognizable mathematical text'],
          suggestedMode: 'ai-solver',
          problemType: 'Unreadable Image',
        },
        durationMs: Date.now() - startTime,
      });
    }

    let detectedMime = mimeType;
    if (cleanBase64.startsWith('iVBORw0KGgo')) {
      detectedMime = 'image/png';
    } else if (cleanBase64.startsWith('/9j/')) {
      detectedMime = 'image/jpeg';
    }

    const imagePart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: 'Carefully recognize and extract all mathematical expressions, equations, and questions in this image. Return strict JSON matching the schema.',
    };

    let response: any;
    try {
      response = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: [imagePart, textPart] },
          config: {
            systemInstruction: CAMERA_OCR_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
      });
    } catch (err: any) {
      if (err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE') || err?.message?.includes('high demand')) {
        console.warn('Fallback to gemini-flash-latest for camera extract due to temporary high demand');
        response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: { parts: [imagePart, textPart] },
          config: {
            systemInstruction: CAMERA_OCR_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
          },
        });
      } else {
        throw err;
      }
    }

    const responseText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = {
          extractedMath: responseText,
          latex: responseText,
          isReadable: true,
          confidence: 'medium',
          notes: 'Extracted from image',
          uncertainties: [],
          suggestedMode: 'ai-solver',
          problemType: 'General Math',
        };
      }
    }

    return res.json({
      success: true,
      result: parsed,
      durationMs: Date.now() - startTime,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Camera extract error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to extract mathematical expression from image.',
    });
  }
});

// API: Camera Math Solve (Multimodal solve with optional user-confirmed math)
app.post('/api/gemini/camera-solve', async (req, res) => {
  const startTime = Date.now();
  try {
    // 1. Instant exact deterministic solution if confirmed math matches known formulas
    if (confirmedProblem) {
      const local = detectAndSolveDeterministically(confirmedProblem);
      if (local) {
        return res.json({
          success: true,
          result: {
            problemSummary: confirmedProblem,
            finalAnswer: local.finalAnswer,
            steps: local.steps,
            explanation: local.explanation,
            latex: local.formula,
            suggestedMode: local.detectedMode,
          },
          engine: 'deterministic-instant',
          durationMs: Date.now() - startTime,
        });
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API key is not configured. Please ensure your key is set in Settings > Secrets.' });
    }

    const { model, thinkingLevel } = getModelAndThinking(performanceMode);

    const parts: any[] = [];
    if (imageBase64 && typeof imageBase64 === 'string') {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    const promptText = confirmedProblem
      ? `Solve this confirmed mathematical problem with step-by-step derivation:
${confirmedProblem}
Verify against the image if provided. Return strict JSON.`
      : 'Solve the mathematical problem in the image step by step. Return strict JSON.';

    parts.push({ text: promptText });

    let response: any;
    try {
      response = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
          model,
          contents: parts.length === 1 ? parts[0].text : { parts },
          config: {
            systemInstruction: SOLVER_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel },
          },
        });
      });
    } catch (err: any) {
      // 1. Try fallback model gemini-flash-latest
      if (err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE') || err?.message?.includes('high demand')) {
        console.warn('Fallback to gemini-flash-latest for camera-solve');
        try {
          response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: parts.length === 1 ? parts[0].text : { parts },
            config: {
              systemInstruction: SOLVER_SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
            },
          });
        } catch (innerErr) {
          // 2. If network/model still unavailable and confirmed math exists, use deterministic engine
          if (confirmedProblem) {
            const local = detectAndSolveDeterministically(confirmedProblem);
            if (local) {
              return res.json({
                success: true,
                result: {
                  problemSummary: confirmedProblem,
                  finalAnswer: local.finalAnswer,
                  steps: local.steps,
                  explanation: local.explanation,
                  latex: local.formula,
                  suggestedMode: local.detectedMode,
                },
                engine: 'deterministic-fallback',
                durationMs: Date.now() - startTime,
              });
            }
          }
          throw innerErr;
        }
      } else if (confirmedProblem) {
        const local = detectAndSolveDeterministically(confirmedProblem);
        if (local) {
          return res.json({
            success: true,
            result: {
              problemSummary: confirmedProblem,
              finalAnswer: local.finalAnswer,
              steps: local.steps,
              explanation: local.explanation,
              latex: local.formula,
              suggestedMode: local.detectedMode,
            },
            engine: 'deterministic-fallback',
            durationMs: Date.now() - startTime,
          });
        }
        throw err;
      } else {
        throw err;
      }
    }

    const responseText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else {
        parsed = {
          problemSummary: confirmedProblem || 'Math problem from camera',
          finalAnswer: responseText,
          steps: [responseText],
          explanation: 'Calculated solution from image',
          suggestedMode: 'ai-solver',
        };
      }
    }

    return res.json({
      success: true,
      result: parsed,
      durationMs: Date.now() - startTime,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Camera solve error:', err);
    if (req.body?.confirmedProblem) {
      const local = detectAndSolveDeterministically(req.body.confirmedProblem);
      if (local) {
        return res.json({
          success: true,
          result: {
            problemSummary: req.body.confirmedProblem,
            finalAnswer: local.finalAnswer,
            steps: local.steps,
            explanation: local.explanation,
            latex: local.formula,
            suggestedMode: local.detectedMode,
          },
          engine: 'deterministic-fallback',
          durationMs: Date.now() - startTime,
        });
      }
    }
    return res.status(500).json({
      error: err.message || 'Failed to solve mathematical problem from camera.',
    });
  }
});

// Mount Vite or serve static assets
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OmniCalc AI server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
