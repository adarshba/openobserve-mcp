import { z } from "zod";

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

export type InstanceConfig = z.infer<typeof InstanceConfigSchema>;
export type BatchingConfig = z.infer<typeof BatchingConfigSchema>;
export type CachingConfig = z.infer<typeof CachingConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
