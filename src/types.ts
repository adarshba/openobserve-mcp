export interface LogQuery {
  sql: string;
  startTime: number;
  endTime: number;
  from?: number;
  size?: number;
}

export interface QueryResult {
  took: number;
  hits: Record<string, unknown>[];
  total: number;
  from: number;
  size: number;
  scanSize: number;
}

export interface StreamInfo {
  name: string;
  streamType: string;
  storageType: string;
  stats: {
    docNum: number;
    storageSize: number;
  };
}

export interface InstanceQueryResult {
  instanceId: string;
  instanceName: string;
  success: boolean;
  data?: QueryResult;
  error?: string;
}

export interface PaginationCursor {
  instanceOffsets: Record<string, number>;
  limit: number;
}

export interface SearchLogsResult {
  results: InstanceQueryResult[];
  cursor?: string;
  hasMore: boolean;
}

export interface BatchQueryItem {
  instanceId: string;
  sql: string;
  startTime: string;
  endTime: string;
  limit?: number;
}

export interface BatchQueryResult {
  index: number;
  instanceId: string;
  success: boolean;
  data?: QueryResult;
  error?: string;
}
