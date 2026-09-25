import postgres, { type Sql, type TransactionSql } from "postgres";
import type { ImportStore, ImportTransaction } from "@/services/imports/store";
import { migrations } from "./migrations";

let client: Sql | undefined;
let migrationReady: Promise<void> | undefined;

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

async function migrate(sql: Sql): Promise<void> {
  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(724927431)`;
    await transaction.unsafe(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL
      )
    `);
    const applied = await transaction<{ version: number }[]>`SELECT version FROM schema_migrations`;
    const versions = new Set(applied.map((row) => row.version));
    for (const migration of migrations) {
      if (versions.has(migration.version)) continue;
      await transaction.unsafe(migration.sql);
      await transaction`INSERT INTO schema_migrations (version, applied_at) VALUES (${migration.version}, ${new Date().toISOString()})`;
    }
  });
}

export async function getDatabase(): Promise<Sql> {
  if (!client) {
    client = postgres(databaseUrl(), {
      max: 1,
      prepare: false,
      ssl: "require",
      connect_timeout: 10,
      idle_timeout: 20,
    });
  }
  migrationReady ??= migrate(client).catch((error) => { migrationReady = undefined; throw error; });
  await migrationReady;
  return client;
}

function postgresTransaction(sql: TransactionSql): ImportTransaction {
  return {
    async createImportIfNew(input) {
      const inserted = await sql<{ id: string }[]>`
        INSERT INTO imports (id, file_name, file_hash, file_type, sheet_name, record_count, imported_at)
        VALUES (${input.id}, ${input.fileName}, ${input.fileHash}, ${input.fileType}, ${input.sheetName}, ${input.recordCount}, ${input.importedAt})
        ON CONFLICT (file_hash, sheet_name) DO NOTHING
        RETURNING id
      `;
      return inserted.length === 1;
    },
    async getOrCreateLead(input) {
      const inserted = await sql<{ id: string }[]>`
        INSERT INTO leads (id, identity_key, organization, opportunity, location, source_url, created_at, updated_at)
        VALUES (${input.id}, ${input.identityKey}, ${input.organization}, ${input.opportunity}, ${input.location}, ${input.source_url}, ${input.createdAt}, ${input.updatedAt})
        ON CONFLICT (identity_key) DO NOTHING
        RETURNING id
      `;
      if (inserted[0]) return { id: inserted[0].id, created: true };
      const existing = await sql<{ id: string }[]>`SELECT id FROM leads WHERE identity_key = ${input.identityKey}`;
      if (!existing[0]) throw new Error("Lead identity conflict could not be resolved.");
      return { id: existing[0].id, created: false };
    },
    async addSourceRecord(input) {
      await sql`
        INSERT INTO source_records (id, import_id, lead_id, source_sheet, source_row, raw_json, mapped_json, created_at)
        VALUES (${input.id}, ${input.importId}, ${input.leadId}, ${input.sourceSheet}, ${input.sourceRow}, ${sql.json(input.raw)}, ${sql.json(input.mapped)}, ${input.createdAt})
      `;
    },
    async queueWorkbookExport(createdAt) {
      await sql`INSERT INTO export_outbox (status, created_at) VALUES ('pending', ${createdAt})`;
    },
  };
}

export async function getImportStore(): Promise<ImportStore> {
  const database = await getDatabase();
  return {
    async transaction<T>(operation: (transaction: ImportTransaction) => Promise<T>): Promise<T> {
      const result = await database.begin((transaction) => operation(postgresTransaction(transaction)));
      return result as T;
    },
  };
}
