#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, loadConfigFromString } from "./config/loader.js";
import { createServer } from "./server.js";
import { shutdownTracing } from "./tracing.js";

const PROGRAM_NAME = "openobserve-mcp";

function getConfigPath(): string {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf("--config");
  if (configIdx !== -1 && args[configIdx + 1]) {
    return args[configIdx + 1];
  }
  return process.env.O2_MCP_CONFIG_PATH ?? "./config/openobserve.config.json";
}

async function main(): Promise<void> {
  const inlineConfig = process.env.O2_MCP_CONFIG;
  
  const { config, warnings } = inlineConfig
    ? loadConfigFromString(inlineConfig)
    : loadConfig(getConfigPath());
  
  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`[${PROGRAM_NAME}] ${warning}`);
    }
  }
  
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(`[${PROGRAM_NAME}] Fatal error:`, err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await shutdownTracing();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdownTracing();
  process.exit(0);
});
