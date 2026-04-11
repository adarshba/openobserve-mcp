import { z } from "zod";
import type { InstancePool } from "../client/pool.js";
import type { StreamFieldInfo } from "../types.js";

export const GetStreamSchemaInputSchema = z.object({
  instance: z.string().describe("Instance ID to query"),
  streams: z
    .union([z.string(), z.array(z.string()).min(1)])
    .describe("Stream name or array of stream names to get schemas for"),
});

export type GetStreamSchemaInput = z.infer<typeof GetStreamSchemaInputSchema>;

interface StreamSchemaEntry {
  stream: string;
  success: boolean;
  schema?: StreamFieldInfo[];
  error?: string;
}

interface GetStreamSchemaResult {
  instanceId: string;
  instanceName: string;
  schemas: StreamSchemaEntry[];
}

export function createGetStreamSchemaHandler(pool: InstancePool) {
  return async (input: GetStreamSchemaInput): Promise<GetStreamSchemaResult> => {
    const [inst] = pool.getByIds([input.instance]);
    if (!inst) {
      throw new Error(`Instance "${input.instance}" not found`);
    }
    const streamNames = Array.isArray(input.streams) ? input.streams : [input.streams];

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

    return {
      instanceId: inst.id,
      instanceName: inst.name,
      schemas: entries,
    };
  };
}
