import type { O2Instance } from "../../client/instance.js";
import { reservoirSample } from "../sampler.js";
import type { SampleStrategy, InstanceQueryResult } from "../types.js";

const FETCH_SIZE = 1000;
const SAMPLE_SIZE = 50;

export async function runSampleStrategy(
  instance: O2Instance,
  sql: string,
  startTime: number,
  endTime: number,
  strategy: SampleStrategy,
): Promise<InstanceQueryResult> {
  const start = Date.now();

  try {
    const data = await instance.queryLogs({
      sql,
      startTime,
      endTime,
      from: 0,
      size: FETCH_SIZE,
    });

    const { samples, diversity } = reservoirSample(data.hits, SAMPLE_SIZE, strategy);

    return {
      instanceId: instance.id,
      instanceName: instance.name,
      success: true,
      meta: {
        strategy: "sample",
        totalLogs: data.total,
        timeRangeMs: endTime - startTime,
        queryTimeMs: Date.now() - start,
        truncated: data.total > FETCH_SIZE,
      },
      view: { type: "samples", logs: samples, diversity },
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
