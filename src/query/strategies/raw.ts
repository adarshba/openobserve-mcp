import type { O2Instance } from "../../client/instance.js";
import type { InstanceQueryResult } from "$types";

const RAW_CAP = 200;

/**
 * Execute a raw log query, capping results and indicating whether more pages exist.
 * @param instance - Target instance to query.
 * @param sql - SQL query string to execute as-is.
 * @param startTime - Query start time in milliseconds since epoch.
 * @param endTime - Query end time in milliseconds since epoch.
 * @param from - Zero-based offset for pagination.
 * @param limit - Maximum number of results to return; capped internally at `RAW_CAP`.
 * @param trackTotalHits - When `true`, requests an exact total hit count from the server.
 * @returns An `InstanceQueryResult` with a full view on success, or an error description on failure.
 */
export async function runRawStrategy(
  instance: O2Instance,
  sql: string,
  startTime: number,
  endTime: number,
  from: number,
  limit: number,
  trackTotalHits = false,
): Promise<InstanceQueryResult> {
  const start = Date.now();
  const size = Math.min(limit, RAW_CAP);

  try {
    const data = await instance.queryLogs({
      sql,
      startTime,
      endTime,
      from,
      size,
      trackTotalHits,
    });

    const hasMore = data.total > from + data.hits.length;

    return {
      instanceId: instance.id,
      instanceName: instance.name,
      success: true,
      meta: {
        strategy: "raw",
        totalLogs: data.total,
        timeRangeMs: endTime - startTime,
        queryTimeMs: Date.now() - start,
        truncated: size < limit,
      },
      view: { type: "full", logs: data.hits, hasMore },
    };
  } catch (err) {
    return {
      instanceId: instance.id,
      instanceName: instance.name,
      success: false,
      error: String(err),
    };
  }
}
