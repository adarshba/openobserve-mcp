import type { ResolvedInstance } from "$types";
import { O2Instance } from "./instance.js";

/**
 * Registry of configured O2Instance objects, indexed by ID and queryable by tags or capabilities.
 */
export class InstancePool {
  private readonly instances: Map<string, O2Instance> = new Map();

  /**
   * Construct an InstancePool from an array of resolved instance configurations.
   * @param configs - Resolved instance configurations to register.
   */
  constructor(configs: ResolvedInstance[]) {
    for (const config of configs) {
      this.instances.set(config.id, new O2Instance(config));
    }
  }

  /**
   * Look up a single instance by its unique identifier.
   * @param id - Instance ID to find.
   * @returns The matching instance, or `undefined` if not registered.
   */
  getById(id: string): O2Instance | undefined {
    return this.instances.get(id);
  }

  /**
   * Retrieve multiple instances by their IDs, silently skipping unknown IDs.
   * @param ids - Array of instance IDs to look up.
   * @returns Array of found instances in the same order as the input IDs.
   */
  getByIds(ids: string[]): O2Instance[] {
    return ids
      .map((id) => this.instances.get(id))
      .filter((inst): inst is O2Instance => inst !== undefined);
  }

  private all(): O2Instance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Return all instances that carry at least one of the specified tags.
   * @param tags - Tags to match against; an instance is included if it has any of them.
   * @returns Filtered array of matching instances.
   */
  getByTags(tags: string[]): O2Instance[] {
    return this.all().filter((inst) => tags.some((tag) => inst.tags.includes(tag)));
  }

  /**
   * Return all instances that declare the specified capability.
   * @param capability - Capability string to match (e.g. `"logs"`, `"metrics"`).
   * @returns Filtered array of instances with the given capability.
   */
  getByCapability(capability: string): O2Instance[] {
    return this.all().filter((inst) => inst.capabilities.includes(capability));
  }

  /**
   * Return every registered instance.
   * @returns Array of all instances in the pool.
   */
  getAll(): O2Instance[] {
    return this.all();
  }
}
