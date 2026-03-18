import { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { BatchingConfig } from "../config/schema.js";
import type { BatchQueryItem, BatchQueryResult } from "../types.js";

export const BatchQueryInputSchema = z.object({
  queries: z
    .array(
      z.object({
        instanceId: z.string(),
        sql: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        limit: z.number().optional().default(100),
      }),
    )
    .min(1)
    .describe("Array of queries to execute"),
});

export type BatchQueryInput = z.infer<typeof BatchQueryInputSchema>;

function parseTime(value: string): number {
  const num = Number(value);
  if (!isNaN(num)) return num;
  return new Date(value).getTime();
}

async function executeQuery(
  pool: InstancePool,
  query: BatchQueryItem,
  index: number,
): Promise<BatchQueryResult> {
  const instance = pool.getById(query.instanceId);
  if (!instance) {
    return {
      index,
      instanceId: query.instanceId,
      success: false,
      error: `Instance ${query.instanceId} not found`,
    };
  }

  try {
    const data = await instance.queryLogs({
      sql: query.sql,
      startTime: parseTime(query.startTime),
      endTime: parseTime(query.endTime),
      size: query.limit,
    });
    return { index, instanceId: query.instanceId, success: true, data };
  } catch (err) {
    return {
      index,
      instanceId: query.instanceId,
      success: false,
      error: String(err),
    };
  }
}

export function createBatchQueryHandler(
  pool: InstancePool,
  config: BatchingConfig,
) {
  return async (
    input: BatchQueryInput,
  ): Promise<{ results: BatchQueryResult[] }> => {
    const { queries } = input;
    const batchSize = config.maxBatchSize;
    const results: BatchQueryResult[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchPromises = batch.map((q: BatchQueryItem, idx: number) =>
        executeQuery(pool, q, i + idx),
      );
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            index: -1,
            instanceId: "unknown",
            success: false,
            error: String(result.reason),
          });
        }
      }
    }

    return { results };
  };
}
