/** An auth token string, or `undefined` when the environment variable is absent. */
export type OptionalAuthToken = string | undefined;

/** Configuration for the query result cache. */
export type CachingConfig = {
  enabled: boolean;
  ttl: number;
  maxSize: number;
};

/** Configuration for parallel batch query execution. */
export type BatchingConfig = {
  maxConcurrent: number;
  maxBatchSize: number;
  timeout: number;
};

/** A fully resolved OpenObserve instance with auth token injected from the environment. */
export type ResolvedInstance = {
  id: string;
  name: string;
  url: string;
  defaults: { org: string; streams: string[]; timeout: number; maxResults: number };
  capabilities: ("logs" | "traces" | "metrics")[];
  tags: string[];
  authToken: string;
};

/** The complete server configuration after all instances and defaults have been resolved. */
export type ResolvedConfig = {
  version: string;
  instances: ResolvedInstance[];
  batching: BatchingConfig;
  caching: CachingConfig;
};

/** The outcome of loading and resolving a configuration file, including any non-fatal warnings. */
export type ConfigResolutionResult = {
  config: ResolvedConfig;
  warnings: string[];
};
