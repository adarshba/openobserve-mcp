export type Granularity = "hour" | "day";

export type SampleStrategy = "recent" | "diverse" | "errors";

export type QueryIntent =
  | { kind: "aggregate"; granularity: Granularity }
  | { kind: "sample"; strategy: SampleStrategy }
  | { kind: "raw" }
  | { kind: "passthrough" };

export type TimeBucket = {
  ts: string;
  count: number;
  errorCount: number;
};

export type LogEntry = Record<string, unknown>;

export type QueryMeta = {
  strategy: QueryIntent["kind"];
  granularity?: Granularity;
  totalLogs: number;
  timeRangeMs: number;
  queryTimeMs: number;
  truncated: boolean;
};

export type TimelineView = {
  type: "timeline";
  buckets: TimeBucket[];
};

export type SamplesView = {
  type: "samples";
  logs: LogEntry[];
  diversity: number;
};

export type FullView = {
  type: "full";
  logs: LogEntry[];
  hasMore: boolean;
};

export type QueryView = TimelineView | SamplesView | FullView;

export type InstanceQueryResult = {
  instanceId: string;
  instanceName: string;
  success: boolean;
  meta?: QueryMeta;
  view?: QueryView;
  error?: string;
};
