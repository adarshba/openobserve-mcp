# OpenObserve MCP Server

[![npm version](https://badge.fury.io/js/openobserve-mcp.svg)](https://www.npmjs.com/package/openobserve-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)

> Model Context Protocol (MCP) server for querying OpenObserve instances from AI agents like Claude, Cursor, and OpenCode.

## What is MCP?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open protocol that enables AI assistants to connect with external tools and data sources. This server implements MCP to let your AI agent query logs, traces, and metrics from OpenObserve.

## Features

- **Multi-instance support** - Query multiple OpenObserve instances in parallel
- **SQL-based querying** - Full PostgreSQL-compatible SQL for logs
- **Batch execution** - Run multiple queries efficiently
- **LRU caching** - Smart caching with TTL for faster results
- **Pagination** - Handle large result sets
- **MCP stdio transport** - Works with any MCP-compatible client

## Installation

```bash
npm install -g openobserve-mcp
```

Or use with npx (no install):

```bash
npx openobserve-mcp --config /path/to/config.json
```

## Quick Start

1. **Set up authentication** (Base64 encoded credentials):
```bash
export PROD_GCP_O2_TOKEN=$(echo -n "user@example.com:password" | base64)
```

2. **Create config file** (`config.json`):
```json
{
  "instances": [{
    "id": "prod-gcp",
    "name": "Production GCP",
    "url": "https://openobserve.example.com",
    "auth": { "type": "env", "envVar": "PROD_GCP_O2_TOKEN" },
    "defaults": { "org": "default", "timeout": 30000, "maxResults": 1000 },
    "capabilities": ["logs", "traces", "metrics"],
    "tags": ["production", "gcp"]
  }]
}
```

3. **Add to your MCP client** (Claude Desktop, Cursor, etc.):
```json
{
  "mcpServers": {
    "openobserve": {
      "command": "npx",
      "args": ["openobserve-mcp", "--config", "/path/to/config.json"],
      "env": { 
        "PROD_GCP_O2_TOKEN": "your_base64_token",
        "PROD_AWS_O2_TOKEN": "your_base64_token"
      }
    }
  }
}
```

4. Example MCP server configuration for OpenCode CLI:

```json
{
  "openobserve": {
    "type": "local",
    "command": [
      "npx",
      "openobserve-mcp",
      "--config",
      "/Users/adarsh.ba/breeze/openobserve_mcp/config/openobserve.config.json"
    ],
    "environment": {
      "PROD_GCP_O2_TOKEN": "your_base64_token",
      "PROD_AWS_O2_TOKEN": "your_base64_token"
    },
    "enabled": true
  }
}
```

## Available Tools

- `o2_search_logs` - Search logs with SQL across instances
- `o2_batch_query` - Execute multiple queries in parallel
- `o2_list_instances` - List configured instances
- `o2_list_streams` - List available streams/indexes

## Documentation

- [Full Documentation & Configuration Guide](https://github.com/adarshba/openobserve-mcp#readme)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [OpenObserve Documentation](https://openobserve.ai/docs)

## Requirements

- Node.js ≥ 18.0.0
- OpenObserve instance(s) with API access

## Keywords

MCP, Model Context Protocol, OpenObserve, observability, logs, traces, metrics, SQL, AI agents, Claude, Cursor, LLM tools

## License

MIT © [Adarsh BA](https://github.com/adarshba)
