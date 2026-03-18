import type { ResolvedInstance } from "../config/loader.js";
import { O2Instance } from "./instance.js";

export class InstancePool {
  private readonly instances: Map<string, O2Instance> = new Map();

  constructor(configs: ResolvedInstance[]) {
    for (const config of configs) {
      this.instances.set(config.id, new O2Instance(config));
    }
  }

  getById(id: string): O2Instance | undefined {
    return this.instances.get(id);
  }

  getByIds(ids: string[]): O2Instance[] {
    return ids
      .map((id) => this.instances.get(id))
      .filter((inst): inst is O2Instance => inst !== undefined);
  }

  getByTags(tags: string[]): O2Instance[] {
    return Array.from(this.instances.values()).filter((inst) =>
      tags.some((tag) => inst.tags.includes(tag)),
    );
  }

  getByCapability(capability: string): O2Instance[] {
    return Array.from(this.instances.values()).filter((inst) =>
      inst.capabilities.includes(capability),
    );
  }

  getAll(): O2Instance[] {
    return Array.from(this.instances.values());
  }

  getMetadata(): Array<{
    id: string;
    name: string;
    url: string;
    capabilities: string[];
    tags: string[];
  }> {
    return this.getAll().map((inst) => ({
      id: inst.id,
      name: inst.name,
      url: inst.url,
      capabilities: inst.capabilities,
      tags: inst.tags,
    }));
  }

  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const checks = this.getAll().map(async (inst) => {
      const healthy = await inst.healthCheck();
      results.set(inst.id, healthy);
    });
    await Promise.allSettled(checks);
    return results;
  }
}
