import type { O2Instance } from "../../client/instance.js";
import type { InstanceQueryResult } from "../types.js";

const RAW_CAP = 200;

export async function runRawStrategy(
  instance: O2Instance,
  sql: string,
  startTime: number,
  endTime: number,
  from: number,
  limit: number,
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
