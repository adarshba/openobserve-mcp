import { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { StreamInfo } from "../types.js";

export const ListStreamsInputSchema = z.object({
  instances: z.array(z.string()).min(1).describe("Instance IDs to query"),
});

export type ListStreamsInput = z.infer<typeof ListStreamsInputSchema>;

interface InstanceStreamsResult {
  instanceId: string;
  instanceName: string;
  success: boolean;
  streams?: StreamInfo[];
  error?: string;
}

export function createListStreamsHandler(pool: InstancePool) {
  return async (
    input: ListStreamsInput,
  ): Promise<{ results: InstanceStreamsResult[] }> => {
    const instances = pool.getByIds(input.instances);

    const queries = instances.map(
      async (inst): Promise<InstanceStreamsResult> => {
        try {
          const streams = await inst.listStreams();
          return {
            instanceId: inst.id,
            instanceName: inst.name,
            success: true,
            streams,
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
    const results: InstanceStreamsResult[] = settled.map((s) =>
      s.status === "fulfilled"
        ? s.value
        : {
            instanceId: "unknown",
            instanceName: "unknown",
            success: false,
            error: String(s.reason),
          },
    );

    return { results };
  };
}
