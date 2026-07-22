import type { O2Instance } from "../../client/instance.js";
import { rewriteToAggregate } from "../rewriter.js";
import type { Granularity, InstanceQueryResult, TimeBucket } from "$types";

const BUCKET_LIMIT = 500;

/**
 * Execute a time-bucketed aggregate query against an OpenObserve instance.
 * @param instance - Target instance to query.
 * @param sql - Original SQL string to rewrite into an aggregate form.
 * @param startTime - Query start time in milliseconds since epoch.
 * @param endTime - Query end time in milliseconds since epoch.
 * @param granularity - Histogram bucket size: `"hour"` or `"day"`.
 * @returns An `InstanceQueryResult` with a timeline view on success, or an error description on failure.
 */
export async function runAggregateStrategy(
  instance: O2Instance,
  sql: string,
  startTime: number,
  endTime: number,
  granularity: Granularity,
): Promise<InstanceQueryResult> {
  const start = Date.now();
  const aggregateSql = await rewriteToAggregate(sql, granularity, instance);

  try {
    const data = await instance.queryLogs({
      sql: aggregateSql,
      startTime,
      endTime,
      from: 0,
      size: BUCKET_LIMIT,
    });

    const buckets: TimeBucket[] = data.hits.map((row) => ({
      ts: String(row["ts"] ?? row["histogram(_timestamp)"] ?? ""),
      count: Number(row["count"] ?? 0),
      errorCount: Number(row["error_count"] ?? 0),
    }));

    return {
      instanceId: instance.id,
      instanceName: instance.name,
      success: true,
      meta: {
        strategy: "aggregate",
        granularity,
        totalLogs: buckets.reduce((s, b) => s + b.count, 0),
        timeRangeMs: endTime - startTime,
        queryTimeMs: Date.now() - start,
        truncated: data.hits.length === BUCKET_LIMIT,
      },
      view: { type: "timeline", buckets },
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
