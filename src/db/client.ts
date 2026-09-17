import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "app.db");

export function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH;
  if (configured && configured.length > 0) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
  }
  return DEFAULT_DB_PATH;
}

declare global {
  var __hsj_sqlite__: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const dbPath = resolveDatabasePath();
  // The database lives outside the bundle; exclude it from output tracing.
  fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(/* turbopackIgnore: true */ dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

export function getSqlite(): Database.Database {
  if (!globalThis.__hsj_sqlite__) {
    globalThis.__hsj_sqlite__ = createConnection();
  }
  return globalThis.__hsj_sqlite__;
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
