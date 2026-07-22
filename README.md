# OpenObserve MCP Server

[![npm version](https://badge.fury.io/js/openobserve-mcp.svg)](https://www.npmjs.com/package/openobserve-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)

[Model Context Protocol](https://modelcontextprotocol.io) server for querying OpenObserve from AI agents (Claude, Cursor, OpenCode, etc.).

## Features

- **Multi-instance** — query multiple OpenObserve deployments in a single call
- **Adaptive strategy** — raw fetch ≤1 h, reservoir sampling 1–6 h, hourly aggregation 6 h–7 d, daily aggregation >7 d
- **Batch queries** — parallel multi-query execution with configurable concurrency
- **LRU cache** — TTL-based result caching with per-entry size cap
- **Cursor pagination** — stateless pagination across instances via base64 cursors
- **Langfuse tracing** — optional observability for every tool call

## Installation

```bash
npm install -g openobserve-mcp
# or without installing:
npx openobserve-mcp --config /path/to/config.json
```

## Configuration

Create a JSON config file:

```json
{
  "instances": [
    {
      "id": "prod",
      "name": "Production",
      "url": "https://openobserve.example.com",
      "auth": { "type": "env", "envVar": "PROD_O2_TOKEN" },
      "defaults": { "org": "default", "timeout": 30000, "maxResults": 1000 },
      "capabilities": ["logs", "traces", "metrics"],
      "tags": ["production"]
    }
  ],
  "batching": { "maxConcurrent": 5 },
  "caching": { "enabled": true, "ttl": 300, "maxSize": 1000 }
}
```

`auth.envVar` must point to an environment variable containing a Base64-encoded `user:password` string:

```bash
export PROD_O2_TOKEN=$(echo -n "user@example.com:password" | base64)
```

Config can also be passed inline via the `O2_MCP_CONFIG` environment variable (JSON string).

## MCP Client Setup

**Claude Desktop / Cursor** — add to your MCP config:

```json
{
  "mcpServers": {
    "openobserve": {
      "command": "npx",
      "args": ["openobserve-mcp", "--config", "/path/to/config.json"],
      "env": {
        "PROD_O2_TOKEN": "base64token"
      }
    }
  }
}
```

**OpenCode** — add to `.opencode/config.json`:

```json
{
  "mcp": {
    "openobserve": {
      "type": "local",
      "command": ["npx", "openobserve-mcp", "--config", "/path/to/config.json"],
      "environment": {
        "PROD_O2_TOKEN": "base64token"
      },
      "enabled": true
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `search_logs` | Search log streams with SQL across one or more instances. Automatically selects query strategy based on time range. |
| `batch_query` | Execute multiple SQL queries in parallel across instances. |
| `list_instances` | List configured instances with their capabilities and tags. |
| `list_streams` | List available streams on one or more instances. |
| `get_stream_schema` | Return field names and types for one or more streams (cached 10 min). |
| `get_logs_around` | Fetch log records surrounding a specific timestamp without writing SQL. |

### SQL Reference

```sql
-- Basic filter
SELECT * FROM "mystream" WHERE level = 'error'

-- Full-text search
SELECT * FROM "mystream" WHERE match_all('timeout*')

-- Aggregation
SELECT code, COUNT(*) FROM "mystream" GROUP BY code ORDER BY COUNT(*) DESC

-- Time bucketing (do not add _timestamp filters manually)
SELECT histogram(_timestamp, '1 hour') AS ts, COUNT(*) FROM "mystream" GROUP BY ts
```

Supported: `=`, `!=`, `>`, `<`, `>=`, `<=`, `IS NULL`, `IS NOT NULL`, `AND`, `OR`, `NOT`, `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `GROUP BY`, `ORDER BY`, `match_all()`, `histogram()`. String literals use single quotes. Stream names use double quotes.

## Optional: Langfuse Tracing

Set the following environment variables to emit traces to Langfuse:

| Variable | Description |
|----------|-------------|
| `LANGFUSE_O2_ENABLED` | Set to `"true"` to enable |
| `LANGFUSE_O2_PUBLIC_KEY` | Langfuse project public key |
| `LANGFUSE_O2_SECRET_KEY` | Langfuse project secret key |
| `LANGFUSE_O2_BASE_URL` | Langfuse host (default: `https://cloud.langfuse.com`) |

## Requirements

- Node.js ≥ 18.0.0
- OpenObserve instance with API access

## License

MIT © [Adarsh BA](https://github.com/adarshba)
