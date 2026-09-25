import { randomUUID } from "node:crypto";
import { getDatabase } from "@/adapters/database/database";
import {
  validateReadiness,
  type WorkspaceCommand,
  type Snapshot,
  type Lead,
  type Source,
  type Batch,
  type Member,
  type Activity,
  type Decision,
} from "@/domain/workspace";

export async function snapshot(): Promise<Snapshot> {
  const db = await getDatabase();
  const result = await db.begin(
    "isolation level repeatable read read only",
    async (sql) => {
      const leads = await sql<
        Lead[]
      >`SELECT * FROM leads ORDER BY created_at, id`;
      const sources = await sql<
        Source[]
      >`SELECT s.*, i.file_name, i.file_type FROM source_records s JOIN imports i ON i.id=s.import_id ORDER BY i.imported_at, s.source_row`;
      const batches = await sql<
        Batch[]
      >`SELECT * FROM batches ORDER BY created_at DESC`;
      const members = await sql<
        Member[]
      >`SELECT * FROM batch_members ORDER BY ordinal`;
      const activities = await sql<
        Activity[]
      >`SELECT * FROM activities ORDER BY occurred_at DESC`;
      const decisions = await sql<
        Decision[]
      >`SELECT * FROM decision_history ORDER BY occurred_at`;
      const settings =
        await sql`SELECT profile, criteria FROM workspace_settings WHERE id=1`;
      const revision =
        await sql`SELECT coalesce(max(revision),0)::text as value FROM export_outbox`;
      return {
        leads,
        sources,
        batches,
        members,
        activities,
        decisions,
        settings: settings[0] ?? { profile: "", criteria: "" },
        revision: revision[0]!.value,
      };
    },
  );
  return result as unknown as Snapshot;
}
export async function execute(input: WorkspaceCommand) {
  const db = await getDatabase();
  return db.begin(async (sql) => {
    // Serialize workspace edits and reservations; imports remain independent.
    await sql`SELECT pg_advisory_xact_lock(724927432)`;
    if (input.type === "batch") {
      const rows =
        await sql`SELECT id FROM leads WHERE id IN ${sql(input.ids)} AND assessment='unassessed' AND NOT EXISTS (SELECT 1 FROM batch_members m WHERE m.lead_id=leads.id) FOR UPDATE`;
      if (rows.length !== input.ids.length)
        throw new Error(
          "Some selected leads are already batched or assessed. Refresh and select again.",
        );
      const id = randomUUID();
      await sql`INSERT INTO batches(id,workflow_key,workflow_version,status,created_at,updated_at) VALUES(${id},'manual','1','active',now(),now())`;
      for (const [index, lead] of input.ids.entries())
        await sql`INSERT INTO batch_members(batch_id,lead_id,ordinal,stage) VALUES(${id},${lead},${index + 1},'researching')`;
      await sql`UPDATE leads SET execution_state='researching', version=version+1, updated_at=now() WHERE id IN ${sql(input.ids)}`;
    } else if (input.type === "lead") {
      const reason = validateReadiness(input);
      if (reason) throw new Error(reason);
      const previous = await sql<
        Lead[]
      >`SELECT * FROM leads WHERE id=${input.id} FOR UPDATE`;
      if (!previous[0] || previous[0].version !== input.version)
        throw new Error(
          "This lead changed in another window. Refresh before saving.",
        );
      await sql`UPDATE leads SET assessment=${input.assessment},execution_state=${input.execution_state},notes=${input.notes},rationale=${input.rationale},approach_url=${input.approach_url},draft=${input.draft},evidence=${input.evidence},version=version+1,updated_at=now() WHERE id=${input.id}`;
      if (
        previous[0].assessment !== input.assessment ||
        previous[0].rationale !== input.rationale
      ) {
        await sql`INSERT INTO decision_history(id,lead_id,previous_decision,decision,rationale,version) VALUES(${randomUUID()},${input.id},${previous[0].assessment},${input.assessment},${input.rationale},${input.version + 1})`;
      }
      await sql`UPDATE batch_members SET stage=${input.execution_state} WHERE lead_id=${input.id}`;
    } else if (input.type === "activity") {
      const exists =
        await sql`SELECT id FROM leads WHERE id=${input.lead_id} FOR UPDATE`;
      if (!exists.length) throw new Error("Lead no longer exists.");
      const inserted =
        await sql`INSERT INTO activities(id,lead_id,action_type,destination,notes,occurred_at) VALUES(${input.id},${input.lead_id},${input.action_type},${input.destination},${input.notes},now()) ON CONFLICT(id) DO NOTHING RETURNING id`;
      if (inserted.length)
        await sql`UPDATE leads SET action_state=${input.action_type},version=version+1,updated_at=now() WHERE id=${input.lead_id}`;
    } else {
      await sql`INSERT INTO workspace_settings(id,profile,criteria) VALUES(1,${input.profile},${input.criteria}) ON CONFLICT(id) DO UPDATE SET profile=excluded.profile,criteria=excluded.criteria,updated_at=now()`;
    }
    await sql`INSERT INTO export_outbox(status,created_at) VALUES('pending',now())`;
    return { saved: true };
  });
}
