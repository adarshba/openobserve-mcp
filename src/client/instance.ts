import type { ResolvedInstance } from "../config/loader.js";
import type { LogQuery, QueryResult, StreamInfo } from "../types.js";

export class O2Instance {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly capabilities: string[];
  readonly tags: string[];
  private readonly authToken: string;
  private readonly defaultOrg: string;
  private readonly defaultTimeout: number;

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

  async queryLogs(query: LogQuery, org?: string): Promise<QueryResult> {
    const endpoint = `${this.url}/api/${org ?? this.defaultOrg}/_search`;

    const body = {
      query: {
        sql: query.sql,
        start_time: this.toMicros(query.startTime),
        end_time: this.toMicros(query.endTime),
        from: query.from ?? 0,
        size: query.size ?? 100,
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

    const data = await response.json();
    return {
      took: data.took,
      hits: data.hits ?? [],
      total: data.total ?? 0,
      from: data.from ?? 0,
      size: data.size ?? 0,
      scanSize: data.scan_size ?? 0,
    };
  }

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

    const data = await response.json();
    return (data.list ?? []).map((s: Record<string, unknown>) => {
      const stats = s.stats as Record<string, unknown> | undefined;
      return {
        name: s.name as string,
        streamType: s.stream_type as string,
        storageType: s.storage_type as string,
        stats: {
          docNum: (stats?.doc_num as number) ?? 0,
          storageSize: (stats?.storage_size as number) ?? 0,
        },
      };
    });
  }

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
