/**
 * Client-side Performance Cache & Benchmark Timing Utility for OmniCalc AI
 */

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  engine: 'local' | 'cache' | 'ai-stream' | 'ai-direct';
  durationMs: number;
  ttftMs?: number;
}

class PerformanceCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries = 200;
  private ttlMs = 1000 * 60 * 60; // 1 hour

  private normalizeKey(rawKey: string, extra = ''): string {
    return `${rawKey.toLowerCase().trim()}::${extra.toLowerCase().trim()}`;
  }

  get<T>(key: string, extra = ''): CacheEntry<T> | null {
    const k = this.normalizeKey(key, extra);
    const entry = this.cache.get(k);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(k);
      return null;
    }
    return entry as CacheEntry<T>;
  }

  set<T>(
    key: string,
    data: T,
    engine: CacheEntry['engine'],
    durationMs: number,
    ttftMs?: number,
    extra = ''
  ): void {
    const k = this.normalizeKey(key, extra);
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(k, {
      data,
      timestamp: Date.now(),
      engine,
      durationMs,
      ttftMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const clientCache = new PerformanceCache();
