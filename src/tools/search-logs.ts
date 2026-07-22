import type { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { PaginationCursor, SearchLogsResult, InstanceQueryResult } from "$types";
import { SearchLogsInputSchema } from "$schema";
import { selectStrategy } from "../query/router.js";
import { runAggregateStrategy } from "../query/strategies/aggregate.js";
import { runSampleStrategy } from "../query/strategies/sample.js";
import { runRawStrategy } from "../query/strategies/raw.js";
import type { QueryCache } from "../cache.js";
import { parseTime } from "../utils/time.js";

function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

function decodeCursor(encoded: string): PaginationCursor {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

/**
 * Create a handler that searches logs across instances using an automatically selected strategy.
 * @param pool - Instance pool used to resolve target instances by ID.
 * @param cache - Cache for storing and retrieving `SearchLogsResult` objects.
 * @returns An async handler that accepts a search-logs input and returns aggregated query results.
 */
export function createSearchLogsHandler(pool: InstancePool, cache: QueryCache<SearchLogsResult>) {
  return async (input: z.infer<typeof SearchLogsInputSchema>): Promise<SearchLogsResult> => {
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
          return runRawStrategy(inst, input.sql, startTime, endTime, from, limit, input.trackTotalHits ?? false);
      }
    });

    const settled = await Promise.allSettled(queries);
    const results: InstanceQueryResult[] = settled.map((s, i) =>
      s.status === "fulfilled"
        ? s.value
        : {
            instanceId: instances[i].id,
            instanceName: instances[i].name,
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
