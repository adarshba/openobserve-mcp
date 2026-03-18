import { LRUCache } from "lru-cache";
import { createHash } from "node:crypto";
import type { CachingConfig } from "./config/schema.js";

export class QueryCache {
  private readonly cache: LRUCache<string, object>;
  private readonly enabled: boolean;

  constructor(config: CachingConfig) {
    this.enabled = config.enabled;
    this.cache = new LRUCache<string, object>({
      max: config.maxSize,
      ttl: config.ttl * 1000,
    });
  }

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;
    return this.cache.get(key) as T | undefined;
  }

  set<T extends object>(key: string, value: T): void {
    if (!this.enabled) return;
    this.cache.set(key, value);
  }

  generateKey(params: Record<string, unknown>): string {
    const sorted = JSON.stringify(params, Object.keys(params).sort());
    return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
