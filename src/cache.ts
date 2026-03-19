import { LRUCache } from "lru-cache";
import { createHash } from "node:crypto";
import type { CachingConfig } from "./config/schema.js";

export class QueryCache<T extends object> {
  private readonly cache: LRUCache<string, T>;
  private readonly enabled: boolean;

  private static readonly MAX_ENTRY_BYTES = 512 * 1024;

  constructor(config: CachingConfig) {
    this.enabled = config.enabled;
    this.cache = new LRUCache<string, T>({
      max: config.maxSize,
      ttl: config.ttl * 1000,
    });
  }

  get(key: string): T | undefined {
    if (!this.enabled) return undefined;
    return this.cache.get(key);
  }

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

  generateKey(params: Record<string, unknown>): string {
    const sorted = JSON.stringify(params, Object.keys(params).sort());
    return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
  }
}
