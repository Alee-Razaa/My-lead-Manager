export const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS imports (
        id UUID PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
        sheet_name TEXT NOT NULL,
        record_count INTEGER NOT NULL CHECK (record_count >= 0),
        imported_at TIMESTAMPTZ NOT NULL,
        UNIQUE(file_hash, sheet_name)
      );
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY,
        identity_key TEXT NOT NULL UNIQUE,
        organization TEXT NOT NULL DEFAULT '',
        opportunity TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        assessment TEXT NOT NULL DEFAULT 'unassessed',
        execution_state TEXT NOT NULL DEFAULT 'queued',
        action_state TEXT NOT NULL DEFAULT 'not_actioned',
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS source_records (
        id UUID PRIMARY KEY,
        import_id UUID NOT NULL REFERENCES imports(id),
        lead_id UUID REFERENCES leads(id),
        source_sheet TEXT NOT NULL,
        source_row INTEGER NOT NULL CHECK (source_row > 0),
        raw_json JSONB NOT NULL,
        mapped_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE(import_id, source_row)
      );
      CREATE TABLE IF NOT EXISTS batches (
        id UUID PRIMARY KEY,
        workflow_key TEXT NOT NULL,
        workflow_version TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS batch_members (
        batch_id UUID NOT NULL REFERENCES batches(id),
        lead_id UUID NOT NULL REFERENCES leads(id),
        ordinal INTEGER NOT NULL CHECK (ordinal > 0),
        stage TEXT NOT NULL,
        PRIMARY KEY(batch_id, lead_id),
        UNIQUE(batch_id, ordinal)
      );
      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY,
        lead_id UUID NOT NULL REFERENCES leads(id),
        action_type TEXT NOT NULL,
        destination TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        occurred_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS export_outbox (
        revision BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        exported_at TIMESTAMPTZ,
        error TEXT
      );
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE source_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
      ALTER TABLE batch_members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
      ALTER TABLE export_outbox ENABLE ROW LEVEL SECURITY;

      REVOKE ALL PRIVILEGES ON TABLE schema_migrations FROM anon, authenticated;
      REVOKE ALL PRIVILEGES ON TABLE imports FROM anon, authenticated;
      REVOKE ALL PRIVILEGES ON TABLE leads FROM anon, authenticated;
      REVOKE ALL PRIVILEGES ON TABLE source_records FROM anon, authenticated;
      REVOKE ALL PRIVILEGES ON TABLE batches FROM anon, authenticated;
      REVOKE ALL PRIVILEGES ON TABLE batch_members FROM anon, authenticated;
      REVOKE ALL PRIVILEGES ON TABLE activities FROM anon, authenticated;
      REVOKE ALL PRIVILEGES ON TABLE export_outbox FROM anon, authenticated;
      REVOKE ALL PRIVILEGES ON SEQUENCE export_outbox_revision_seq FROM anon, authenticated;
    `,
  },
] as const;
