import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ResolvedConfig, SearchLogsResult, GetStreamSchemaResult } from "$types";
import { InstancePool } from "./client/pool.js";
import { QueryCache } from "./cache.js";
import {
  SearchLogsInputSchema,
  BatchQueryInputSchema,
  ListInstancesInputSchema,
  ListStreamsInputSchema,
  GetStreamSchemaInputSchema,
  GetLogsAroundInputSchema,
} from "$schema";
import { createSearchLogsHandler } from "./tools/search-logs.js";
import { createBatchQueryHandler } from "./tools/batch-query.js";
import { createListInstancesHandler } from "./tools/list-instances.js";
import { createListStreamsHandler } from "./tools/list-streams.js";
import { createGetStreamSchemaHandler } from "./tools/get-stream-schema.js";
import { createGetLogsAroundHandler } from "./tools/get-logs-around.js";
import { initTracing, withTracing } from "./tracing.js";

const MAX_RESPONSE_BYTES = 1024 * 1024;

function safeSerialize(value: unknown): string {
  const text = JSON.stringify(value, null, 2);
  if (Buffer.byteLength(text, "utf-8") > MAX_RESPONSE_BYTES) {
    return JSON.stringify({
      error: "Response too large to serialize",
      hint: "Use a narrower time range or add filters.",
    });
  }
  return text;
}

/**
 * Construct and configure an MCP server with all OpenObserve tools registered.
 * @param config - Fully resolved server configuration including instances, caching, and batching.
 * @returns A configured `McpServer` instance ready to handle tool calls.
 */
export function createServer(config: ResolvedConfig): McpServer {
  const server = new McpServer({
    name: "openobserve-mcp",
    version: config.version,
  });

  const pool = new InstancePool(config.instances);
  const queryCache = new QueryCache<SearchLogsResult>(config.caching);
  const schemaCache = new QueryCache<GetStreamSchemaResult>({ ...config.caching, ttl: 600 });

  initTracing();

  const searchLogs = withTracing("search_logs", createSearchLogsHandler(pool, queryCache));
  const batchQuery = withTracing("batch_query", createBatchQueryHandler(pool, config.batching));
  const listInstances = withTracing("list_instances", createListInstancesHandler(pool));
  const listStreams = withTracing("list_streams", createListStreamsHandler(pool));
  const getStreamSchema = withTracing("get_stream_schema", createGetStreamSchemaHandler(pool, schemaCache));
  const getLogsAround = withTracing("get_logs_around", createGetLogsAroundHandler(pool));

  server.registerTool(
    "search_logs",
    {
      description:
        "Search log streams with SQL across one or more OpenObserve instances. " +
        "Automatically applies the most efficient query strategy based on time range: " +
        "raw fetch for ≤1 h, sampling for 1–6 h, hourly aggregation for 6 h–7 d, daily aggregation beyond 7 d. " +
        "SQL supports =, !=, >, <, >=, <=, IS NULL, IS NOT NULL, AND, OR, NOT, COUNT, SUM, AVG, MIN, MAX, GROUP BY, ORDER BY, histogram(_timestamp). " +
        "String values use single quotes; stream names use double quotes. " +
        "match_all('text') performs full-text search across indexed fields with wildcard support (*). " +
        "Do not add WHERE _timestamp filters — time range is handled by startTime and endTime parameters. " +
        'Examples: SELECT * FROM "mystream" WHERE match_all(\'error*\') | SELECT code, COUNT(*) FROM "mystream" GROUP BY code',
      inputSchema: SearchLogsInputSchema.shape,
    },
    async (args) => {
      const result = await searchLogs(SearchLogsInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  server.registerTool(
    "batch_query",
    {
      description:
        "Execute multiple SQL log queries in parallel across OpenObserve instances and return all results together. " +
        "Each query specifies its own instance, SQL, and time range. " +
        "Useful for comparing data across instances or fetching related signals in a single round trip.",
      inputSchema: BatchQueryInputSchema.shape,
    },
    async (args) => {
      const result = await batchQuery(BatchQueryInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  server.registerTool(
    "list_instances",
    {
      description:
        "List the configured OpenObserve instances available to this server. " +
        "Returns each instance's ID, name, URL, capabilities (logs, traces, metrics), and tags. " +
        "Optionally filter by one or more tags or by a specific capability.",
      inputSchema: ListInstancesInputSchema.shape,
    },
    async (args) => {
      const result = await listInstances(ListInstancesInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  server.registerTool(
    "list_streams",
    {
      description:
        "List all log streams available on one or more OpenObserve instances. " +
        "Returns stream names, types, storage type, and document/storage statistics.",
      inputSchema: ListStreamsInputSchema.shape,
    },
    async (args) => {
      const result = await listStreams(ListStreamsInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  server.registerTool(
    "get_stream_schema",
    {
      description:
        "Return the field names and data types for one or more log streams on an OpenObserve instance. " +
        "Accepts a single stream name or an array; schemas are fetched in parallel. " +
        "Results are cached for 10 minutes.",
      inputSchema: GetStreamSchemaInputSchema.shape,
    },
    async (args) => {
      const result = await getStreamSchema(GetStreamSchemaInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  server.registerTool(
    "get_logs_around",
    {
      description:
        "Fetch log records immediately before and after a specific timestamp in a stream. " +
        "Returns up to size records centered on the anchor timestamp. " +
        "Useful for viewing the context surrounding a known event without writing a SQL query.",
      inputSchema: GetLogsAroundInputSchema.shape,
    },
    async (args) => {
      const result = await getLogsAround(GetLogsAroundInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  return server;
}
