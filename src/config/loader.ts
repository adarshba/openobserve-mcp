import { existsSync, readFileSync } from "node:fs";
import { ServerConfigSchema } from "./schema.js";
import type { ConfigResolutionResult, OptionalAuthToken, ResolvedInstance } from "$types";

/**
 * Parse and validate a JSON configuration string, resolving auth tokens from environment variables.
 * @param configString - Raw JSON string conforming to the server configuration schema.
 * @returns Resolved configuration and any non-fatal warnings.
 * @throws When the JSON is malformed, fails schema validation, or no instances resolve successfully.
 */
export function loadConfigFromString(configString: string): ConfigResolutionResult {
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

function resolveInstances(serverConfig: ReturnType<typeof ServerConfigSchema.parse>): ConfigResolutionResult {
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

/**
 * Read a configuration file from disk and resolve it via `loadConfigFromString`.
 * @param configPath - Absolute or relative path to the JSON configuration file.
 * @returns Resolved configuration and any non-fatal warnings.
 * @throws When the file does not exist, cannot be read, or fails validation.
 */
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
