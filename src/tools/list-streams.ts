import type { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { InstanceStreamsResult } from "$types";
import { ListStreamsInputSchema } from "$schema";

/**
 * Create a handler that lists all streams available on the specified instances in parallel.
 * @param pool - Instance pool used to resolve target instances by ID.
 * @returns An async handler that accepts a list-streams input and returns per-instance stream listings.
 */
export function createListStreamsHandler(pool: InstancePool) {
  return async (
    input: z.infer<typeof ListStreamsInputSchema>,
  ): Promise<{ results: InstanceStreamsResult[] }> => {
    const instances = pool.getByIds(input.instances);

    const queries = instances.map(
      async (inst): Promise<InstanceStreamsResult> => {
        try {
          const streams = await inst.listStreams();
          return { instanceId: inst.id, instanceName: inst.name, success: true, streams };
        } catch (err) {
          return { instanceId: inst.id, instanceName: inst.name, success: false, error: String(err) };
        }
      },
    );

    const settled = await Promise.allSettled(queries);
    const results: InstanceStreamsResult[] = settled.map((s, i) =>
      s.status === "fulfilled"
        ? s.value
        : { instanceId: instances[i].id, instanceName: instances[i].name, success: false, error: String(s.reason) },
    );

    return { results };
  };
}
