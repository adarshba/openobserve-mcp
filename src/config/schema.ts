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

export const AuthConfigSchema = z.object({
  type: z.literal("env"),
  envVar: z.string(),
});

export const InstanceDefaultsSchema = z.object({
  org: z.string().default("default"),
  streams: z.array(z.string()).default(["default"]),
  timeout: z.number().default(30000),
  maxResults: z.number().default(1000),
});

export const InstanceConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  auth: AuthConfigSchema,
  defaults: InstanceDefaultsSchema.default({}),
  capabilities: z
    .array(z.enum(["logs", "traces", "metrics"]))
    .default(["logs"]),
  tags: z.array(z.string()).default([]),
});

export const BatchingConfigSchema = z.object({
  maxConcurrent: z.number().default(5),
  maxBatchSize: z.number().default(100),
  timeout: z.number().default(60000),
});

export const CachingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttl: z.number().default(300),
  maxSize: z.number().default(1000),
});

export const ServerConfigSchema = z.object({
  version: z.string().default("1.0.0"),
  instances: z.array(InstanceConfigSchema).min(1),
  batching: BatchingConfigSchema.default({}),
  caching: CachingConfigSchema.default({}),
});

export const SearchLogsInputSchema = z.object({
  instances: z.array(z.string()).min(1).describe("Instance IDs to query"),
  sql: z.string().describe("SQL query to execute"),
  startTime: z.string().describe("Start time (ISO 8601 or Unix ms)"),
  endTime: z.string().describe("End time (ISO 8601 or Unix ms)"),
  limit: z.number().optional().default(100).describe("Results per instance (applies to raw strategy only)"),
  trackTotalHits: z.boolean().optional().default(false).describe("Compute exact total hit count; slower on large streams"),
  cursor: z.string().optional().describe("Pagination cursor from previous response"),
  bypassCache: z.boolean().optional().default(false).describe("Skip cache lookup"),
});

export const BatchQueryInputSchema = z.object({
  queries: z
    .array(
      z.object({
        instanceId: z.string(),
        sql: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        limit: z.number().optional().default(100),
      }),
    )
    .min(1)
    .describe("Array of queries to execute"),
});

export const GetLogsAroundInputSchema = z.object({
  instance: z.string().describe("Instance ID to query"),
  stream: z.string().describe("Stream name to search"),
  timestamp: z.string().describe("Anchor timestamp (ISO 8601 or Unix ms)"),
  size: z.number().optional().default(20).describe("Total number of records to return around the anchor"),
});

export const GetStreamSchemaInputSchema = z.object({
  instance: z.string().describe("Instance ID to query"),
  streams: z
    .union([z.string(), z.array(z.string()).min(1)])
    .describe("Stream name or array of stream names to get schemas for"),
});

export const ListInstancesInputSchema = z.object({
  tags: z.array(z.string()).optional().describe("Filter by tags"),
  capability: z
    .string()
    .optional()
    .describe("Filter by capability (logs, traces, metrics)"),
});

export const ListStreamsInputSchema = z.object({
  instances: z.array(z.string()).min(1).describe("Instance IDs to query"),
});
