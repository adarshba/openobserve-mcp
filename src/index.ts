#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/loader.js";
import { createServer } from "./server.js";

function getConfigPath(): string {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf("--config");
  if (configIdx !== -1 && args[configIdx + 1]) {
    return args[configIdx + 1];
  }
  return process.env.O2_MCP_CONFIG_PATH ?? "./config/openobserve.config.json";
}

async function main(): Promise<void> {
  const configPath = getConfigPath();
  const config = loadConfig(configPath);
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
