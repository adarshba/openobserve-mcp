import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ResolvedConfig } from "./config/loader.js";
import { InstancePool } from "./client/pool.js";
import { QueryCache } from "./cache.js";
import { SearchLogsInputSchema, createSearchLogsHandler, type SearchLogsResult } from "./tools/search-logs.js";
import { BatchQueryInputSchema, createBatchQueryHandler } from "./tools/batch-query.js";
import { ListInstancesInputSchema, createListInstancesHandler } from "./tools/list-instances.js";
import { ListStreamsInputSchema, createListStreamsHandler } from "./tools/list-streams.js";

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

export function createServer(config: ResolvedConfig): McpServer {
  const server = new McpServer({
    name: "openobserve-mcp",
    version: config.version,
  });

  const pool = new InstancePool(config.instances);
  const cache = new QueryCache<SearchLogsResult>(config.caching);

  const searchLogs = createSearchLogsHandler(pool, cache);
  const batchQuery = createBatchQueryHandler(pool, config.batching);
  const listInstances = createListInstancesHandler(pool);
  const listStreams = createListStreamsHandler(pool);

  server.registerTool(
    "o2_search_logs",
    {
      description:
        "Search logs across OpenObserve instances with SQL. Automatically selects the best strategy (timeline aggregation, sampling, or raw) based on time range. For ranges >6h returns a time-bucketed summary with drill-down options.",
      inputSchema: SearchLogsInputSchema.shape,
    },
    async (args) => {
      const result = await searchLogs(SearchLogsInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  server.registerTool(
    "o2_batch_query",
    {
      description:
        "Execute multiple queries in parallel across instances. Ideal for comparing data or running related queries.",
      inputSchema: BatchQueryInputSchema.shape,
    },
    async (args) => {
      const result = await batchQuery(BatchQueryInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  server.registerTool(
    "o2_list_instances",
    {
      description: "List configured OpenObserve instances. Filter by tags or capabilities.",
      inputSchema: ListInstancesInputSchema.shape,
    },
    async (args) => {
      const result = await listInstances(ListInstancesInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  server.registerTool(
    "o2_list_streams",
    {
      description: "List available streams from specified instances.",
      inputSchema: ListStreamsInputSchema.shape,
    },
    async (args) => {
      const result = await listStreams(ListStreamsInputSchema.parse(args));
      return { content: [{ type: "text", text: safeSerialize(result) }] };
    },
  );

  return server;
}
