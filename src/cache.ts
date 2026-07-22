import { LRUCache } from "lru-cache";
import { createHash } from "node:crypto";
import type { CachingConfig } from "$types";

/**
 * LRU cache for query results with configurable TTL, capacity, and per-entry size limits.
 * @template T - The cached value type; must be an object.
 */
export class QueryCache<T extends object> {
  private readonly cache: LRUCache<string, T>;
  private readonly enabled: boolean;

  private static readonly MAX_ENTRY_BYTES = 512 * 1024;

  /**
   * Construct a QueryCache from a caching configuration.
   * @param config - Caching settings including enabled flag, TTL in seconds, and max entry count.
   */
  constructor(config: CachingConfig) {
    this.enabled = config.enabled;
    this.cache = new LRUCache<string, T>({
      max: config.maxSize,
      ttl: config.ttl * 1000,
    });
  }

  /**
   * Retrieve a cached value by key.
   * @param key - Cache key to look up.
   * @returns The cached value, or `undefined` if absent or caching is disabled.
   */
  get(key: string): T | undefined {
    if (!this.enabled) return undefined;
    return this.cache.get(key);
  }

  /**
   * Store a value in the cache, skipping entries that exceed the byte size limit.
   * @param key - Cache key under which to store the value.
   * @param value - Value to cache.
   */
  set(key: string, value: T): void {
    if (!this.enabled) return;
    try {
      const size = Buffer.byteLength(JSON.stringify(value), "utf-8");
      if (size > QueryCache.MAX_ENTRY_BYTES) return;
    } catch {
      return;
    }
    this.cache.set(key, value);
  }

  /**
   * Generate a deterministic 16-character hex cache key from a parameter map.
   * @param params - Key-value pairs to hash; keys are sorted before hashing.
   * @returns A 16-character hex string derived from a SHA-256 digest.
   */
  generateKey(params: Record<string, unknown>): string {
    const sorted = JSON.stringify(params, Object.keys(params).sort());
    return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
  }
}
