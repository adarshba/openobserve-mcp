import { readFileSync } from "node:fs";
import {
  ServerConfigSchema,
  type ServerConfig,
  type InstanceConfig,
} from "./schema.js";

export interface ResolvedInstance extends Omit<InstanceConfig, "auth"> {
  authToken: string;
}

export interface ResolvedConfig extends Omit<ServerConfig, "instances"> {
  instances: ResolvedInstance[];
}

function resolveAuthToken(envVar: string): string {
  const token = process.env[envVar];
  if (!token) {
    throw new Error(`Environment variable ${envVar} not set`);
  }
  return token;
}

export function loadConfig(configPath: string): ResolvedConfig {
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);
  const validated = ServerConfigSchema.parse(parsed);

  const instances: ResolvedInstance[] = validated.instances.map(
    (instance: InstanceConfig) => {
      const { auth, ...rest } = instance;
      return {
        ...rest,
        authToken: resolveAuthToken(auth.envVar),
      };
    },
  );

  return {
    version: validated.version,
    instances,
    batching: validated.batching,
    caching: validated.caching,
  };
}
