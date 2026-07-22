import type { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { BatchingConfig, BatchQueryResult } from "$types";
import { BatchQueryInputSchema } from "$schema";
import { parseTime } from "../utils/time.js";

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
  query: z.infer<typeof BatchQueryInputSchema>["queries"][number],
  index: number,
): Promise<BatchQueryResult> {
  const instance = pool.getById(query.instanceId);
  if (!instance) {
    return { index, instanceId: query.instanceId, success: false, error: `Instance ${query.instanceId} not found` };
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
    return { index, instanceId: query.instanceId, success: false, error: String(err) };
  }
}

/**
 * Create a handler that executes multiple log queries in parallel with concurrency limiting.
 * @param pool - Instance pool used to resolve query targets by ID.
 * @param config - Batching configuration controlling maximum concurrent queries.
 * @returns An async handler that accepts a batch query input and returns all results.
 */
export function createBatchQueryHandler(pool: InstancePool, config: BatchingConfig) {
  const acquire = makeSemaphore(config.maxConcurrent);

  return async (input: z.infer<typeof BatchQueryInputSchema>): Promise<{ results: BatchQueryResult[] }> => {
    const promises = input.queries.map((query, index) =>
      acquire(() => executeQuery(pool, query, index)),
    );

    const settled = await Promise.allSettled(promises);
    const results: BatchQueryResult[] = settled.map((s, index) =>
      s.status === "fulfilled"
        ? s.value
        : { index, instanceId: "unknown", success: false, error: String(s.reason) },
    );

    return { results };
  };
}
