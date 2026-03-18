import { z } from "zod";
import type { InstancePool } from "../client/pool.js";

export const ListInstancesInputSchema = z.object({
  tags: z.array(z.string()).optional().describe("Filter by tags"),
  capability: z
    .string()
    .optional()
    .describe("Filter by capability (logs, traces, metrics)"),
});

export type ListInstancesInput = z.infer<typeof ListInstancesInputSchema>;

export function createListInstancesHandler(pool: InstancePool) {
  return async (input: ListInstancesInput) => {
    let instances = pool.getAll();

    if (input.tags && input.tags.length > 0) {
      instances = instances.filter((inst) =>
        input.tags!.some((tag: string) => inst.tags.includes(tag)),
      );
    }

    if (input.capability) {
      instances = instances.filter((inst) =>
        inst.capabilities.includes(input.capability!),
      );
    }

    return {
      instances: instances.map((inst) => ({
        id: inst.id,
        name: inst.name,
        url: inst.url,
        capabilities: inst.capabilities,
        tags: inst.tags,
      })),
    };
  };
}
