import { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { QueryCache } from "../cache.js";
import type { PaginationCursor } from "../types.js";
import { selectStrategy } from "../query/router.js";
import { runAggregateStrategy } from "../query/strategies/aggregate.js";
import { runSampleStrategy } from "../query/strategies/sample.js";
import { runRawStrategy } from "../query/strategies/raw.js";
import type { InstanceQueryResult } from "../query/types.js";
import { parseTime } from "../utils/time.js";

export const SearchLogsInputSchema = z.object({
  instances: z.array(z.string()).min(1).describe("Instance IDs to query"),
  sql: z.string().describe("SQL query to execute"),
  startTime: z.string().describe("Start time (ISO 8601 or Unix ms)"),
  endTime: z.string().describe("End time (ISO 8601 or Unix ms)"),
  limit: z.number().optional().default(100).describe("Results per instance (applies to raw strategy only)"),
  cursor: z.string().optional().describe("Pagination cursor from previous response"),
  bypassCache: z.boolean().optional().default(false).describe("Skip cache lookup"),
});

export type SearchLogsInput = z.infer<typeof SearchLogsInputSchema>;

export type SearchLogsResult = {
  strategy: string;
  results: InstanceQueryResult[];
  cursor?: string;
  hasMore: boolean;
};

function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

function decodeCursor(encoded: string): PaginationCursor {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

export function createSearchLogsHandler(pool: InstancePool, cache: QueryCache<SearchLogsResult>) {
  return async (input: SearchLogsInput): Promise<SearchLogsResult> => {
    const startTime = parseTime(input.startTime);
    const endTime = parseTime(input.endTime);
    const limit = input.limit ?? 100;

    let instanceOffsets: Record<string, number> = {};
    if (input.cursor) {
      const decoded = decodeCursor(input.cursor);
      instanceOffsets = decoded.instanceOffsets;
    }

    const instances = pool.getByIds(input.instances);
    if (instances.length === 0) {
      return { strategy: "raw", results: [], hasMore: false };
    }

    const intent = selectStrategy(input.sql, startTime, endTime);

    const cacheKey = !input.bypassCache
      ? cache.generateKey({
          instances: input.instances,
          sql: input.sql,
          startTime,
          endTime,
          limit,
          offsets: instanceOffsets,
          strategy: intent.kind,
        })
      : null;

    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const queries = instances.map(async (inst): Promise<InstanceQueryResult> => {
      const from = instanceOffsets[inst.id] ?? 0;

      switch (intent.kind) {
        case "aggregate":
          return runAggregateStrategy(inst, input.sql, startTime, endTime, intent.granularity);
        case "sample":
          return runSampleStrategy(inst, input.sql, startTime, endTime, intent.strategy);
        case "raw":
        case "passthrough":
          return runRawStrategy(inst, input.sql, startTime, endTime, from, limit);
      }
    });

    const settled = await Promise.allSettled(queries);
    const results: InstanceQueryResult[] = settled.map((s) =>
      s.status === "fulfilled"
        ? s.value
        : {
            instanceId: "unknown",
            instanceName: "unknown",
            success: false,
            error: String(s.reason),
          },
    );

    let hasMore = false;
    const newOffsets: Record<string, number> = {};

    if (intent.kind === "raw" || intent.kind === "passthrough") {
      for (const result of results) {
        if (result.success && result.view?.type === "full") {
          if (result.view.hasMore) {
            hasMore = true;
            const offset = instanceOffsets[result.instanceId] ?? 0;
            newOffsets[result.instanceId] = offset + result.view.logs.length;
          }
        }
      }
    }

    const nextCursor = hasMore
      ? encodeCursor({ instanceOffsets: newOffsets, limit })
      : undefined;

    const response: SearchLogsResult = {
      strategy: intent.kind,
      results,
      cursor: nextCursor,
      hasMore,
    };

    if (cacheKey) {
      cache.set(cacheKey, response);
    }

    return response;
  };
}
