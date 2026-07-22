import type { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { QueryCache } from "../cache.js";
import type { StreamSchemaEntry, GetStreamSchemaResult } from "$types";
import { GetStreamSchemaInputSchema } from "$schema";

/**
 * Create a handler that retrieves field schemas for one or more streams, with caching.
 * @param pool - Instance pool used to resolve the target instance by ID.
 * @param cache - Cache for storing and retrieving `GetStreamSchemaResult` objects.
 * @returns An async handler that accepts a get-stream-schema input and returns the schema results.
 * @throws When the specified instance ID is not found in the pool.
 */
export function createGetStreamSchemaHandler(pool: InstancePool, cache: QueryCache<GetStreamSchemaResult>) {
  return async (input: z.infer<typeof GetStreamSchemaInputSchema>): Promise<GetStreamSchemaResult> => {
    const [inst] = pool.getByIds([input.instance]);
    if (!inst) {
      throw new Error(`Instance "${input.instance}" not found`);
    }
    const streamNames = Array.isArray(input.streams) ? input.streams : [input.streams];

    const cacheKey = cache.generateKey({ instanceId: inst.id, streams: [...streamNames].sort() });
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const entries = await Promise.all(
      streamNames.map(async (stream): Promise<StreamSchemaEntry> => {
        try {
          const schema = await inst.getStreamSchema(stream);
          return { stream, success: true, schema };
        } catch (err) {
          return { stream, success: false, error: String(err) };
        }
      }),
    );

    const result: GetStreamSchemaResult = {
      instanceId: inst.id,
      instanceName: inst.name,
      schemas: entries,
    };

    cache.set(cacheKey, result);
    return result;
  };
}
