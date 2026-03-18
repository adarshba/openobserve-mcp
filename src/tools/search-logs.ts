import { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { QueryCache } from "../cache.js";
import type {
  InstanceQueryResult,
  PaginationCursor,
  SearchLogsResult,
} from "../types.js";

export const SearchLogsInputSchema = z.object({
  instances: z.array(z.string()).min(1).describe("Instance IDs to query"),
  sql: z.string().describe("SQL query to execute"),
  startTime: z.string().describe("Start time (ISO 8601 or Unix ms)"),
  endTime: z.string().describe("End time (ISO 8601 or Unix ms)"),
  limit: z.number().optional().default(100).describe("Results per instance"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor from previous response"),
  bypassCache: z
    .boolean()
    .optional()
    .default(false)
    .describe("Skip cache lookup"),
});

export type SearchLogsInput = z.infer<typeof SearchLogsInputSchema>;

function parseTime(value: string): number {
  const num = Number(value);
  if (!isNaN(num)) return num;
  return new Date(value).getTime();
}

function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

function decodeCursor(encoded: string): PaginationCursor {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

export function createSearchLogsHandler(pool: InstancePool, cache: QueryCache) {
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
      return { results: [], hasMore: false };
    }

    const cacheKey = !input.bypassCache
      ? cache.generateKey({
          instances: input.instances,
          sql: input.sql,
          startTime,
          endTime,
          limit,
          offsets: instanceOffsets,
        })
      : null;

    if (cacheKey) {
      const cached = cache.get<SearchLogsResult>(cacheKey);
      if (cached) return cached;
    }

    const queries = instances.map(
      async (inst): Promise<InstanceQueryResult> => {
        const from = instanceOffsets[inst.id] ?? 0;
        try {
          const data = await inst.queryLogs({
            sql: input.sql,
            startTime,
            endTime,
            from,
            size: limit,
          });
          return {
            instanceId: inst.id,
            instanceName: inst.name,
            success: true,
            data,
          };
        } catch (err) {
          return {
            instanceId: inst.id,
            instanceName: inst.name,
            success: false,
            error: String(err),
          };
        }
      },
    );

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

    const newOffsets: Record<string, number> = {};
    let hasMore = false;

    for (const result of results) {
      if (result.success && result.data) {
        const currentOffset = instanceOffsets[result.instanceId] ?? 0;
        const returned = result.data.hits.length;
        if (
          returned === limit &&
          result.data.total > currentOffset + returned
        ) {
          hasMore = true;
          newOffsets[result.instanceId] = currentOffset + returned;
        }
      }
    }

    const nextCursor = hasMore
      ? encodeCursor({ instanceOffsets: newOffsets, limit })
      : undefined;
    const response: SearchLogsResult = { results, cursor: nextCursor, hasMore };

    if (cacheKey) {
      cache.set(cacheKey, response);
    }

    return response;
  };
}
