import type { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { GetLogsAroundResult } from "$types";
import { GetLogsAroundInputSchema } from "$schema";
import { parseTime } from "../utils/time.js";

/**
 * Create a handler that fetches log records surrounding a specific timestamp in a stream.
 * @param pool - Instance pool used to resolve the target instance by ID.
 * @returns An async handler that accepts a get-logs-around input and returns the surrounding records.
 * @throws When the specified instance ID is not found in the pool.
 */
export function createGetLogsAroundHandler(pool: InstancePool) {
  return async (input: z.infer<typeof GetLogsAroundInputSchema>): Promise<GetLogsAroundResult> => {
    const [inst] = pool.getByIds([input.instance]);
    if (!inst) {
      throw new Error(`Instance "${input.instance}" not found`);
    }

    try {
      const timestampMs = parseTime(input.timestamp);
      const data = await inst.getLogsAround(input.stream, timestampMs, input.size ?? 20);
      return {
        instanceId: inst.id,
        instanceName: inst.name,
        success: true,
        logs: data.hits,
        total: data.total,
        took: data.took,
      };
    } catch (err) {
      return {
        instanceId: inst.id,
        instanceName: inst.name,
        success: false,
        error: String(err),
      };
    }
  };
}
