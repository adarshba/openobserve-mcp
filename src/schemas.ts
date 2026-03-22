import { z } from "zod";

export const QueryResponseSchema = z.object({
  took: z.number().default(0),
  hits: z.array(z.record(z.unknown())).default([]),
  total: z.number().default(0),
  from: z.number().default(0),
  size: z.number().default(0),
  scan_size: z.number().default(0),
});

export const StreamStatsSchema = z.object({
  doc_num: z.number().default(0),
  storage_size: z.number().default(0),
});

export const StreamItemSchema = z.object({
  name: z.string(),
  stream_type: z.string().default(""),
  storage_type: z.string().default(""),
  stats: StreamStatsSchema.optional(),
});

export const StreamsResponseSchema = z.object({
  list: z.array(StreamItemSchema).default([]),
});

export const StreamSchemaResponseSchema = z.object({
  schema: z.array(z.object({ name: z.string(), type: z.string() })).default([]),
});
