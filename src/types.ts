export type LogQuery = {
  sql: string;
  startTime: number;
  endTime: number;
  from?: number;
  size?: number;
};

export type QueryResult = {
  took: number;
  hits: Record<string, unknown>[];
  total: number;
  from: number;
  size: number;
  scanSize: number;
};

export type StreamFieldInfo = {
  name: string;
  type: string;
};

export type StreamInfo = {
  name: string;
  streamType: string;
  storageType: string;
  stats: {
    docNum: number;
    storageSize: number;
  };
};

export type PaginationCursor = {
  instanceOffsets: Record<string, number>;
  limit: number;
};

export type BatchQueryResult = {
  index: number;
  instanceId: string;
  success: boolean;
  data?: QueryResult;
  error?: string;
};
