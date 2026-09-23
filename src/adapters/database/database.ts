import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrations } from "./migrations";

let singleton: DatabaseSync | undefined;

function dataDirectory(): string {
  const configured = process.env.LEAD_WORKSPACE_DATA_DIR;
  if (!configured) return path.join(process.cwd(), "data");
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

export function migrate(database: DatabaseSync): void {
  database.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = database.prepare("SELECT version FROM schema_migrations").all() as Array<{ version: number }>;
  const appliedVersions = new Set(applied.map((row) => row.version));
  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration.sql);
      database.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)")
        .run(migration.version, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}

export function getDatabase(): DatabaseSync {
  if (singleton) return singleton;
  const directory = dataDirectory();
  mkdirSync(directory, { recursive: true });
  singleton = new DatabaseSync(path.join(directory, "lead-workspace.sqlite"));
  singleton.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  migrate(singleton);
  return singleton;
}
