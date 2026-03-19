import { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { O2Instance } from "../client/instance.js";

export const ListInstancesInputSchema = z.object({
  tags: z.array(z.string()).optional().describe("Filter by tags"),
  capability: z
    .string()
    .optional()
    .describe("Filter by capability (logs, traces, metrics)"),
});

export type ListInstancesInput = z.infer<typeof ListInstancesInputSchema>;

function toMetadata(inst: O2Instance) {
  return {
    id: inst.id,
    name: inst.name,
    url: inst.url,
    capabilities: inst.capabilities,
    tags: inst.tags,
  };
}

export function createListInstancesHandler(pool: InstancePool) {
  return async (input: ListInstancesInput) => {
    let instances =
      input.tags && input.tags.length > 0
        ? pool.getByTags(input.tags)
        : pool.getAll();

    if (input.capability) {
      instances = instances.filter((inst) =>
        inst.capabilities.includes(input.capability!),
      );
    }

    return { instances: instances.map(toMetadata) };
  };
}
