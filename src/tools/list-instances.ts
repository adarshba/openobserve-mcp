import type { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { O2Instance } from "../client/instance.js";
import { ListInstancesInputSchema } from "$schema";

function toMetadata(inst: O2Instance) {
  return {
    id: inst.id,
    name: inst.name,
    url: inst.url,
    capabilities: inst.capabilities,
    tags: inst.tags,
  };
}

/**
 * Create a handler that lists configured OpenObserve instances with optional tag and capability filters.
 * @param pool - Instance pool to query for registered instances.
 * @returns An async handler that accepts a list-instances input and returns filtered instance metadata.
 */
export function createListInstancesHandler(pool: InstancePool) {
  return async (input: z.infer<typeof ListInstancesInputSchema>) => {
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
