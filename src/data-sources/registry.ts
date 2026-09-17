import type { LeagueDataSource, DataSourceRegistryEntry } from "./types";

class DataSourceRegistry {
  private readonly entries = new Map<string, DataSourceRegistryEntry>();

  register(entry: DataSourceRegistryEntry): void {
    if (this.entries.has(entry.sourceId) && process.env.NODE_ENV !== "production") {
      throw new Error(`data source already registered: ${entry.sourceId}`);
    }
    this.entries.set(entry.sourceId, entry);
  }

  get(sourceId: string): DataSourceRegistryEntry | undefined {
    return this.entries.get(sourceId);
  }

  list(): DataSourceRegistryEntry[] {
    return [...this.entries.values()].sort((a, b) =>
      a.sourceId.localeCompare(b.sourceId),
    );
  }

  enabled(): DataSourceRegistryEntry[] {
    return this.list().filter((entry) => entry.enabled);
  }

  byScope(scope: DataSourceRegistryEntry["scope"]): DataSourceRegistryEntry[] {
    return this.list().filter((entry) => entry.scope === scope);
  }

  byPrefecture(slug: string): DataSourceRegistryEntry[] {
    return this.list().filter((entry) => entry.prefectureSlug === slug);
  }

  byRegion(slug: string): DataSourceRegistryEntry[] {
    return this.list().filter((entry) => entry.regionSlug === slug);
  }

  adapters(): Array<DataSourceRegistryEntry & { adapterInstance: LeagueDataSource }> {
    return this.list().filter(
      (entry): entry is DataSourceRegistryEntry & { adapterInstance: LeagueDataSource } =>
        entry.adapterInstance !== null,
    );
  }

  clear(): void {
    this.entries.clear();
  }
}

export const registry = new DataSourceRegistry();
export { DataSourceRegistry };
