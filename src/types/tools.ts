import type { StreamFieldInfo, StreamInfo, InstanceQueryResult, QueryResult } from "./query.js";

/** The result of a single query within a batch operation. */
export type BatchQueryResult = {
  index: number;
  instanceId: string;
  success: boolean;
  data?: QueryResult;
  error?: string;
};

/** Schema information for a single stream, including success state and field descriptors. */
export type StreamSchemaEntry = {
  stream: string;
  success: boolean;
  schema?: StreamFieldInfo[];
  error?: string;
};

/** Aggregated schema results for one or more streams on a single instance. */
export type GetStreamSchemaResult = {
  instanceId: string;
  instanceName: string;
  schemas: StreamSchemaEntry[];
};

/** The result of fetching log records surrounding a specific timestamp. */
export type GetLogsAroundResult = {
  instanceId: string;
  instanceName: string;
  success: boolean;
  logs?: Record<string, unknown>[];
  total?: number;
  took?: number;
  error?: string;
};

/** The result of listing streams on a single instance. */
export type InstanceStreamsResult = {
  instanceId: string;
  instanceName: string;
  success: boolean;
  streams?: StreamInfo[];
  error?: string;
};

/** The aggregated result of a search-logs tool call across one or more instances. */
export type SearchLogsResult = {
  strategy: string;
  results: InstanceQueryResult[];
  cursor?: string;
  hasMore: boolean;
};
