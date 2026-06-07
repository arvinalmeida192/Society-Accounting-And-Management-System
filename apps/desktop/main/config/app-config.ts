import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AppConfigDto, RecentDatabaseEntry } from '@sams/shared-types';

const CONFIG_FILE = 'app-config.json';

const defaultConfig = (): AppConfigDto => ({
  recentDatabases: [],
  explorerExpandedNodes: [],
});

export class AppConfigStore {
  private readonly configPath: string;
  private config: AppConfigDto;

  constructor(userDataPath: string) {
    this.configPath = join(userDataPath, CONFIG_FILE);
    this.config = this.load();
  }

  get(): AppConfigDto {
    return this.config;
  }

  getRecentDatabases(): RecentDatabaseEntry[] {
    return [...this.config.recentDatabases].sort(
      (a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime(),
    );
  }

  rememberDatabase(path: string, label: string): void {
    const now = new Date().toISOString();
    const filtered = this.config.recentDatabases.filter((entry) => entry.path !== path);
    filtered.unshift({ path, label, lastOpened: now });
    this.config.recentDatabases = filtered.slice(0, 10);
    this.save();
  }

  setExplorerExpandedNodes(nodes: string[]): void {
    this.config.explorerExpandedNodes = nodes;
    this.save();
  }

  private load(): AppConfigDto {
    if (!existsSync(this.configPath)) {
      return defaultConfig();
    }

    try {
      const raw = readFileSync(this.configPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AppConfigDto>;
      return {
        recentDatabases: parsed.recentDatabases ?? [],
        explorerExpandedNodes: parsed.explorerExpandedNodes ?? [],
        windowBounds: parsed.windowBounds,
      };
    } catch {
      return defaultConfig();
    }
  }

  private save(): void {
    mkdirSync(dirname(this.configPath), { recursive: true });
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }
}
