import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { ResolvedConfig } from "./config/loader.js";
import { InstancePool } from "./client/pool.js";
import { QueryCache } from "./cache.js";
import {
  SearchLogsInputSchema,
  createSearchLogsHandler,
  type SearchLogsInput,
} from "./tools/search-logs.js";
import {
  BatchQueryInputSchema,
  createBatchQueryHandler,
  type BatchQueryInput,
} from "./tools/batch-query.js";
import {
  ListInstancesInputSchema,
  createListInstancesHandler,
  type ListInstancesInput,
} from "./tools/list-instances.js";
import {
  ListStreamsInputSchema,
  createListStreamsHandler,
  type ListStreamsInput,
} from "./tools/list-streams.js";
import { zodToJsonSchema } from "./utils/schema.js";

const TOOLS = [
  {
    name: "o2_search_logs",
    description:
      "Search logs across OpenObserve instances with SQL. Supports parallel multi-instance queries and pagination.",
    inputSchema: zodToJsonSchema(SearchLogsInputSchema),
  },
  {
    name: "o2_batch_query",
    description:
      "Execute multiple queries in parallel across instances. Ideal for comparing data or running related queries.",
    inputSchema: zodToJsonSchema(BatchQueryInputSchema),
  },
  {
    name: "o2_list_instances",
    description:
      "List configured OpenObserve instances. Filter by tags or capabilities.",
    inputSchema: zodToJsonSchema(ListInstancesInputSchema),
  },
  {
    name: "o2_list_streams",
    description: "List available streams from specified instances.",
    inputSchema: zodToJsonSchema(ListStreamsInputSchema),
  },
];

export function createServer(config: ResolvedConfig): Server {
  const server = new Server(
    { name: "openobserve-mcp", version: config.version },
    { capabilities: { tools: {} } },
  );

  const pool = new InstancePool(config.instances);
  const cache = new QueryCache(config.caching);

  const searchLogsHandler = createSearchLogsHandler(pool, cache);
  const batchQueryHandler = createBatchQueryHandler(pool, config.batching);
  const listInstancesHandler = createListInstancesHandler(pool);
  const listStreamsHandler = createListStreamsHandler(pool);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "o2_search_logs": {
          const parsed = SearchLogsInputSchema.parse(args);
          const result = await searchLogsHandler(parsed as SearchLogsInput);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }
        case "o2_batch_query": {
          const parsed = BatchQueryInputSchema.parse(args);
          const result = await batchQueryHandler(parsed as BatchQueryInput);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }
        case "o2_list_instances": {
          const parsed = ListInstancesInputSchema.parse(args);
          const result = await listInstancesHandler(
            parsed as ListInstancesInput,
          );
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }
        case "o2_list_streams": {
          const parsed = ListStreamsInputSchema.parse(args);
          const result = await listStreamsHandler(parsed as ListStreamsInput);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    },
  );

  return server;
}
