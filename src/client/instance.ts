import type { ResolvedInstance } from "$types";
import { QueryResponseSchema, StreamSchemaResponseSchema, StreamsResponseSchema } from "$schema";
import type { LogQuery, QueryResult, StreamFieldInfo, StreamInfo } from "$types";

/**
 * HTTP client for a single OpenObserve instance, exposing log query and stream operations.
 */
export class O2Instance {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly capabilities: string[];
  readonly tags: string[];
  private readonly authToken: string;
  private readonly defaultOrg: string;
  private readonly defaultTimeout: number;

  /**
   * Construct an O2Instance from a resolved instance configuration.
   * @param config - Resolved instance settings including URL, auth token, and defaults.
   */
  constructor(config: ResolvedInstance) {
    this.id = config.id;
    this.name = config.name;
    this.url = config.url.replace(/\/$/, "");
    this.capabilities = config.capabilities;
    this.tags = config.tags;
    this.authToken = config.authToken;
    this.defaultOrg = config.defaults.org;
    this.defaultTimeout = config.defaults.timeout;
  }

  /**
   * Execute a SQL log query against the instance search endpoint.
   * @param query - Query parameters including SQL, time range, pagination, and flags.
   * @param org - Organisation slug; falls back to the instance default when omitted.
   * @returns Parsed query result with hits, totals, and timing.
   * @throws When the HTTP response is not OK.
   */
  async queryLogs(query: LogQuery, org?: string): Promise<QueryResult> {
    const endpoint = `${this.url}/api/${org ?? this.defaultOrg}/_search`;

    const body = {
      query: {
        sql: query.sql,
        start_time: this.toMicros(query.startTime),
        end_time: this.toMicros(query.endTime),
        from: query.from ?? 0,
        size: query.size ?? 100,
        track_total_hits: query.trackTotalHits ?? false,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${this.authToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.defaultTimeout),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const parsed = QueryResponseSchema.parse(await response.json());
    return {
      took: parsed.took,
      hits: parsed.hits,
      total: parsed.total,
      from: parsed.from,
      size: parsed.size,
      scanSize: parsed.scan_size,
    };
  }

  /**
   * List all streams available in the given organisation.
   * @param org - Organisation slug; falls back to the instance default when omitted.
   * @returns Array of stream metadata including name, type, and storage statistics.
   * @throws When the HTTP response is not OK.
   */
  async listStreams(org?: string): Promise<StreamInfo[]> {
    const endpoint = `${this.url}/api/${org ?? this.defaultOrg}/streams`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.authToken}`,
      },
      signal: AbortSignal.timeout(this.defaultTimeout),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const parsed = StreamsResponseSchema.parse(await response.json());
    return parsed.list.map((s) => ({
      name: s.name,
      streamType: s.stream_type,
      storageType: s.storage_type,
      stats: {
        docNum: s.stats?.doc_num ?? 0,
        storageSize: s.stats?.storage_size ?? 0,
      },
    }));
  }

  /**
   * Fetch the field schema for a named stream.
   * @param stream - Stream name whose schema to retrieve.
   * @param org - Organisation slug; falls back to the instance default when omitted.
   * @returns Array of field descriptors with name and type.
   * @throws When the HTTP response is not OK.
   */
  async getStreamSchema(stream: string, org?: string): Promise<StreamFieldInfo[]> {
    const endpoint = `${this.url}/api/${org ?? this.defaultOrg}/streams/${encodeURIComponent(stream)}/schema`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.authToken}`,
      },
      signal: AbortSignal.timeout(this.defaultTimeout),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const parsed = StreamSchemaResponseSchema.parse(await response.json());
    return parsed.schema.map((f) => ({ name: f.name, type: f.type }));
  }

  /**
   * Fetch log records surrounding a specific timestamp in a stream.
   * @param stream - Stream name to query.
   * @param timestampMs - Anchor timestamp in milliseconds.
   * @param size - Total number of records to return around the anchor.
   * @param org - Organisation slug; falls back to the instance default when omitted.
   * @returns Query result containing the surrounding log records.
   * @throws When the HTTP response is not OK.
   */
  async getLogsAround(stream: string, timestampMs: number, size: number, org?: string): Promise<QueryResult> {
    const endpoint = `${this.url}/api/${org ?? this.defaultOrg}/${encodeURIComponent(stream)}/_around`;
    const params = new URLSearchParams({
      key: String(this.toMicros(timestampMs)),
      size: String(size),
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${this.authToken}`,
      },
      signal: AbortSignal.timeout(this.defaultTimeout),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const parsed = QueryResponseSchema.parse(await response.json());
    return {
      took: parsed.took,
      hits: parsed.hits,
      total: parsed.total,
      from: parsed.from,
      size: parsed.size,
      scanSize: parsed.scan_size,
    };
  }

  /**
   * Return the field names available in a stream, or an empty array on error.
   * @param stream - Stream name to inspect.
   * @param org - Organisation slug; falls back to the instance default when omitted.
   * @returns Array of field name strings; empty when the schema cannot be retrieved.
   */
  async getStreamFields(stream: string, org?: string): Promise<string[]> {
    try {
      const schema = await this.getStreamSchema(stream, org);
      return schema.map((f) => f.name);
    } catch {
      return [];
    }
  }

  /**
   * Perform a liveness check against the instance health endpoint.
   * @returns `true` when the instance responds with an OK status, `false` otherwise.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const endpoint = `${this.url}/healthz`;
      const response = await fetch(endpoint, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private toMicros(timestampMs: number): number {
    return timestampMs * 1000;
  }
}
