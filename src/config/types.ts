import { type InstanceConfig, type ServerConfig } from "./schema.js";

export type OptionalAuthToken = string | undefined;

export interface ResolvedInstance extends Omit<InstanceConfig, "auth"> {
  authToken: string;
}

export interface ResolvedConfig extends Omit<ServerConfig, "instances"> {
  instances: ResolvedInstance[];
}

export interface ConfigResolutionResult {
  config: ResolvedConfig;
  warnings: string[];
}
