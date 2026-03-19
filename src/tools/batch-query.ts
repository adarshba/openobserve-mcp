import { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { BatchingConfig } from "../config/schema.js";
import type { BatchQueryResult } from "../types.js";
import { parseTime } from "../utils/time.js";

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

function makeSemaphore(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  function release() {
    active--;
    if (queue.length > 0) {
      active++;
      queue.shift()!();
    }
  }

  return async function acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (active < max) {
      active++;
      try {
        return await fn();
      } finally {
        release();
      }
    }
    return new Promise<T>((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        } finally {
          release();
        }
      });
    });
  };
}

async function executeQuery(
  pool: InstancePool,
  query: BatchQueryInput["queries"][number],
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

export function createBatchQueryHandler(pool: InstancePool, config: BatchingConfig) {
  const acquire = makeSemaphore(config.maxConcurrent);

  return async (input: BatchQueryInput): Promise<{ results: BatchQueryResult[] }> => {
    const promises = input.queries.map((query, index) =>
      acquire(() => executeQuery(pool, query, index)),
    );

    const settled = await Promise.allSettled(promises);
    const results: BatchQueryResult[] = settled.map((s, index) =>
      s.status === "fulfilled"
        ? s.value
        : {
            index,
            instanceId: "unknown",
            success: false,
            error: String(s.reason),
          },
    );

    return { results };
  };
}
