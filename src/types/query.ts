/** Parameters for a log search query including SQL, time range, and pagination. */
export type LogQuery = {
  sql: string;
  startTime: number;
  endTime: number;
  from?: number;
  size?: number;
  trackTotalHits?: boolean;
};

/** Raw query response from an OpenObserve search endpoint. */
export type QueryResult = {
  took: number;
  hits: Record<string, unknown>[];
  total: number;
  from: number;
  size: number;
  scanSize: number;
};

/** A single field descriptor returned from the stream schema endpoint. */
export type StreamFieldInfo = {
  name: string;
  type: string;
};

/** Metadata and statistics for a single log stream. */
export type StreamInfo = {
  name: string;
  streamType: string;
  storageType: string;
  stats: {
    docNum: number;
    storageSize: number;
  };
};

/** Opaque pagination cursor encoding per-instance offsets and page size. */
export type PaginationCursor = {
  instanceOffsets: Record<string, number>;
  limit: number;
};

/** Time bucket granularity used in aggregate query strategies. */
export type Granularity = "hour" | "day";

/** Algorithm used when reservoir-sampling log entries. */
export type SampleStrategy = "recent" | "diverse" | "errors";

/** Discriminated union describing the selected query execution strategy. */
export type QueryIntent =
  | { kind: "aggregate"; granularity: Granularity }
  | { kind: "sample"; strategy: SampleStrategy }
  | { kind: "raw" }
  | { kind: "passthrough" };

/** A single time bucket returned by an aggregate query strategy. */
export type TimeBucket = {
  ts: string;
  count: number;
  errorCount: number;
};

/** A single log record represented as a key-value map. */
export type LogEntry = Record<string, unknown>;

/** Execution metadata attached to every successful instance query result. */
export type QueryMeta = {
  strategy: QueryIntent["kind"];
  granularity?: Granularity;
  totalLogs: number;
  timeRangeMs: number;
  queryTimeMs: number;
  truncated: boolean;
};

/** Result view containing time-bucketed aggregate data. */
export type TimelineView = {
  type: "timeline";
  buckets: TimeBucket[];
};

/** Result view containing a down-sampled subset of log entries with a diversity score. */
export type SamplesView = {
  type: "samples";
  logs: LogEntry[];
  diversity: number;
};

/** Result view containing a full page of log entries with a pagination indicator. */
export type FullView = {
  type: "full";
  logs: LogEntry[];
  hasMore: boolean;
};

/** Union of all possible result view shapes returned by query strategies. */
export type QueryView = TimelineView | SamplesView | FullView;

/** The result of executing a query against a single OpenObserve instance. */
export type InstanceQueryResult = {
  instanceId: string;
  instanceName: string;
  success: boolean;
  meta?: QueryMeta;
  view?: QueryView;
  error?: string;
};
