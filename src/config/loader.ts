import { existsSync, readFileSync } from "node:fs";
import { ServerConfigSchema, type ServerConfig } from "./schema.js";
import type {
  ConfigResolutionResult,
  OptionalAuthToken,
  ResolvedInstance,
} from "./types.js";

export type {
  ConfigResolutionResult,
  OptionalAuthToken,
  ResolvedConfig,
  ResolvedInstance,
} from "./types.js";

export function loadConfigFromString(
  configString: string,
): ConfigResolutionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(configString);
  } catch (error) {
    throw new Error(
      `Failed to parse config JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const serverConfig = ServerConfigSchema.parse(parsed);
  return resolveInstances(serverConfig);
}

function resolveAuthToken(envVar: string): OptionalAuthToken {
  const value = process.env[envVar];
  return value && value.trim().length > 0 ? value : undefined;
}

function resolveInstances(serverConfig: ServerConfig): ConfigResolutionResult {
  const warnings: string[] = [];

  const instances = serverConfig.instances.reduce<ResolvedInstance[]>(
    (acc, instance) => {
      const { auth, ...rest } = instance;
      const token = resolveAuthToken(auth.envVar);

      if (token) {
        acc.push({ ...rest, authToken: token });
      } else {
        warnings.push(
          `Instance "${instance.id}": missing environment variable "${auth.envVar}"`,
        );
      }

      return acc;
    },
    [],
  );

  if (instances.length === 0) {
    const warningList = warnings.join("; ");
    throw new Error(
      `Configuration error: No valid instances available. ${warningList}`,
    );
  }

  return {
    config: {
      version: serverConfig.version,
      instances,
      batching: serverConfig.batching,
      caching: serverConfig.caching,
    },
    warnings,
  };
}

export function loadConfig(configPath: string): ConfigResolutionResult {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read configuration file "${configPath}": ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return loadConfigFromString(raw);
}
