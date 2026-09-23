export const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS imports (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        file_type TEXT NOT NULL,
        sheet_name TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        imported_at TEXT NOT NULL,
        UNIQUE(file_hash, sheet_name)
      );
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        identity_key TEXT NOT NULL UNIQUE,
        organization TEXT NOT NULL DEFAULT '',
        opportunity TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        assessment TEXT NOT NULL DEFAULT 'unassessed',
        execution_state TEXT NOT NULL DEFAULT 'queued',
        action_state TEXT NOT NULL DEFAULT 'not_actioned',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS source_records (
        id TEXT PRIMARY KEY,
        import_id TEXT NOT NULL REFERENCES imports(id),
        lead_id TEXT REFERENCES leads(id),
        source_sheet TEXT NOT NULL,
        source_row INTEGER NOT NULL,
        raw_json TEXT NOT NULL,
        mapped_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(import_id, source_row)
      );
      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        workflow_key TEXT NOT NULL,
        workflow_version TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS batch_members (
        batch_id TEXT NOT NULL REFERENCES batches(id),
        lead_id TEXT NOT NULL REFERENCES leads(id),
        ordinal INTEGER NOT NULL,
        stage TEXT NOT NULL,
        PRIMARY KEY(batch_id, lead_id),
        UNIQUE(batch_id, ordinal)
      );
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL REFERENCES leads(id),
        action_type TEXT NOT NULL,
        destination TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        occurred_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS export_outbox (
        revision INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        exported_at TEXT,
        error TEXT
      );
    `,
  },
] as const;
