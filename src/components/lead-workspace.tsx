"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ImportWorkspace } from "./import-workspace";
import {
  safeLink,
  type Snapshot,
  type Lead,
  type WorkspaceCommand,
} from "@/domain/workspace";
import {
  assessmentSchema,
  executionStateSchema,
  actionStateSchema,
} from "@/domain/lead";
const label = (value: string) => value.replaceAll("_", " ");
export function LeadWorkspace() {
  const router = useRouter();
  const [view, setView] = useState("imports");
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [batch, setBatch] = useState("");
  const [lead, setLead] = useState<Lead | null>(null);
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    setData(body);
  }, [router]);
  useEffect(() => {
    const change = () => {
      setView(location.hash.slice(1) || "imports");
      setLead(null);
      setError("");
    };
    change();
    window.addEventListener("hashchange", change);
    void Promise.resolve()
      .then(() => refresh())
      .catch((e) => setError(e.message));
    return () => window.removeEventListener("hashchange", change);
  }, [refresh]);
  async function save(command: WorkspaceCommand) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await refresh();
      setLead(null);
      setSelected([]);
      setNotice(
        "Saved to database. Download a fresh Excel snapshot to include these changes.",
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const visible =
    data?.leads.filter(
      (l) =>
        (!search ||
          `${l.organization} ${l.opportunity} ${l.location} ${l.notes}`
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (filter === "all" || l.assessment === filter) &&
        (view !== "qualified" || l.assessment === "qualified") &&
        (view !== "ready" ||
          (l.assessment === "qualified" && l.execution_state === "ready")) &&
        (!batch ||
          view !== "batches" ||
          data.members.some((m) => m.batch_id === batch && m.lead_id === l.id)),
    ) ?? [];
  const reserved = new Set(data?.members.map((m) => m.lead_id));
  const eligible = visible.filter(
    (l) => !reserved.has(l.id) && l.assessment === "unassessed",
  );
  return (
    <>
      <div className="workspace-banner">
        <strong>Manual pilot</strong> Research and drafts are entered by you. No
        AI calls or automatic outreach. Excel is a downloadable snapshot.
      </div>
      {view === "imports" ? (
        <>
          <ImportWorkspace
            onImported={() => refresh().catch((e) => setError(e.message))}
          />
          <div className="workspace-bottom">
            <a className="button primary" href="#batches">
              Open saved leads {data ? `(${data.leads.length})` : ""}
            </a>
          </div>
        </>
      ) : (
        <div className="processing-grid">
          <section className="work-surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {view === "batches"
                    ? "Review ten at a time"
                    : "Your working record"}
                </p>
                <h1>{label(view).replace(/^./, (s) => s.toUpperCase())}</h1>
                <p className="supporting">
                  {view === "ready"
                    ? "Open an approach link, copy your draft, then record what you actually did."
                    : view === "qualified"
                      ? "Qualified leads move here for approach research and preparation."
                      : view === "activity"
                        ? "Only actions you explicitly record appear here."
                        : view === "settings"
                          ? "Keep your experience and qualification criteria available for reference."
                          : "Select up to ten unassigned leads or resume an existing batch."}
                </p>
              </div>
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  refresh()
                    .then(() => setNotice("Reloaded saved records."))
                    .catch((e) => setError(e.message))
                }
              >
                Refresh
              </button>
            </div>
            {!data ? (
              <p role="status">Loading workspace…</p>
            ) : view === "settings" ? (
              <Settings
                key={data.settings.profile + data.settings.criteria}
                data={data}
                busy={busy}
                save={save}
              />
            ) : view === "activity" ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Lead</th>
                      <th>Action</th>
                      <th>Destination / notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activities.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.occurred_at).toLocaleString()}</td>
                        <td>
                          {data.leads.find((l) => l.id === a.lead_id)
                            ?.opportunity || a.lead_id}
                        </td>
                        <td>{label(a.action_type)}</td>
                        <td className="wrap-cell">
                          {a.destination}
                          <br />
                          {a.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.activities.length && (
                  <p className="empty">No actions recorded yet.</p>
                )}
              </div>
            ) : (
              <>
                <div className="toolbar">
                  <label>
                    Search
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Company, opportunity, location…"
                    />
                  </label>
                  <label>
                    Decision
                    <select
                      value={filter}
                      aria-label="Filter by decision"
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All decisions</option>
                      {assessmentSchema.options.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  {view === "batches" && (
                    <label>
                      Batch
                      <select
                        value={batch}
                        onChange={(e) => {
                          setBatch(e.target.value);
                          setSelected([]);
                        }}
                      >
                        <option value="">All leads</option>
                        {data.batches.map((b, i) => (
                          <option key={b.id} value={b.id}>
                            Batch {data.batches.length - i} ·{" "}
                            {new Date(b.created_at).toLocaleDateString()} ·{" "}
                            {b.id.slice(0, 6)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {view === "batches" && (
                  <div className="batch-actions">
                    <button
                      className="button"
                      disabled={busy || !eligible.length}
                      onClick={() =>
                        setSelected(eligible.slice(0, 10).map((l) => l.id))
                      }
                    >
                      Select next 10
                    </button>
                    <button
                      className="button primary"
                      disabled={busy || !selected.length}
                      onClick={() => save({ type: "batch", ids: selected })}
                    >
                      Start batch ({selected.length}/10)
                    </button>
                    <span>Existing batches resume by choosing them above.</span>
                  </div>
                )}
                {!!selected.length && (
                  <details open className="manifest">
                    <summary>Batch manifest — exact source rows</summary>
                    {selected.map((id) => (
                      <p key={id}>
                        {data.leads.find((l) => l.id === id)?.opportunity ||
                          "Untitled lead"}
                        :{" "}
                        {data.sources
                          .filter((s) => s.lead_id === id)
                          .map(
                            (s) =>
                              `${s.file_name} / ${s.source_sheet} / row ${s.source_row}`,
                          )
                          .join("; ")}
                      </p>
                    ))}
                  </details>
                )}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {view === "batches" && <th>Select</th>}
                        <th>Opportunity</th>
                        <th>Organization</th>
                        <th>Decision / stage</th>
                        <th>Action</th>
                        <th>Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((l) => (
                        <tr
                          key={l.id}
                          className={lead?.id === l.id ? "selected-row" : ""}
                        >
                          {view === "batches" && (
                            <td>
                              <input
                                aria-label={`Select ${l.opportunity || l.organization}`}
                                type="checkbox"
                                checked={selected.includes(l.id)}
                                disabled={
                                  busy ||
                                  reserved.has(l.id) ||
                                  l.assessment !== "unassessed" ||
                                  (!selected.includes(l.id) &&
                                    selected.length >= 10)
                                }
                                onChange={(e) =>
                                  setSelected(
                                    e.target.checked
                                      ? [...selected, l.id]
                                      : selected.filter((id) => id !== l.id),
                                  )
                                }
                              />
                            </td>
                          )}
                          <td className="wrap-cell">
                            <strong>{l.opportunity || "Untitled lead"}</strong>
                            <br />
                            <span className="muted">{l.location}</span>
                          </td>
                          <td className="wrap-cell">
                            {l.organization || "Unknown"}
                          </td>
                          <td>
                            <span className={`badge ${l.assessment}`}>
                              {label(l.assessment)}
                            </span>
                            <br />
                            <small>{label(l.execution_state)}</small>
                          </td>
                          <td>{label(l.action_state)}</td>
                          <td>
                            <button
                              className="button"
                              onClick={() => {
                                setLead(l);
                                setNotice("");
                              }}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="empty">
                      <h2>No leads here yet</h2>
                      <p>
                        {data.leads.length
                          ? "Change the filters or process a lead to move it here."
                          : "Import your CSV/XLSX files to begin."}
                      </p>
                      <a href="#imports">Go to imports</a>
                    </div>
                  )}
                </div>
                <p className="muted">
                  {visible.length} leads · database revision {data.revision}
                </p>
              </>
            )}
          </section>
          <aside className="inspector lead-inspector">
            {lead && data ? (
              <LeadEditor
                key={`${lead.id}-${lead.version}`}
                lead={lead}
                data={data}
                busy={busy}
                save={save}
                close={() => setLead(null)}
              />
            ) : (
              <>
                <p className="eyebrow">Your next step</p>
                <h2>Source → decision → action</h2>
                <p className="supporting">
                  Open a lead to see its original rows, record research, qualify
                  it and prepare your approach.
                </p>
                <ol className="guidance">
                  <li>Import and check field mappings.</li>
                  <li>Select up to ten leads.</li>
                  <li>Research the original source.</li>
                  <li>Record a decision and reason.</li>
                  <li>Add an approach link and draft.</li>
                  <li>Mark ready, act yourself, record the outcome.</li>
                </ol>
                <p className="muted">Nothing is sent automatically.</p>
              </>
            )}
          </aside>
        </div>
      )}
      {(error || notice) && (
        <div className="feedback" role={error ? "alert" : "status"}>
          <span>{error || notice}</span>
          <button
            className="button"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
function Settings({
  data,
  busy,
  save,
}: {
  data: Snapshot;
  busy: boolean;
  save: (c: WorkspaceCommand) => Promise<boolean>;
}) {
  const [profile, setProfile] = useState(data.settings.profile),
    [criteria, setCriteria] = useState(data.settings.criteria);
  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        save({ type: "settings", profile, criteria });
      }}
    >
      <label>
        Your profile / experience
        <textarea
          rows={12}
          maxLength={20000}
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          placeholder="Paste factual experience or your resume text."
        />
      </label>
      <label>
        Workflow and qualification criteria
        <textarea
          rows={8}
          maxLength={20000}
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="Roles, locations, eligibility and what makes a lead worth pursuing."
        />
      </label>
      <button className="button primary" disabled={busy}>
        Save settings
      </button>
      <p className="muted">
        Stored privately in your database. AI processing is deferred.
      </p>
    </form>
  );
}
function LeadEditor({
  lead,
  data,
  busy,
  save,
  close,
}: {
  lead: Lead;
  data: Snapshot;
  busy: boolean;
  save: (c: WorkspaceCommand) => Promise<boolean>;
  close: () => void;
}) {
  const [draft, setDraft] = useState(lead);
  const [action, setAction] = useState<
    | "applied"
    | "email_sent"
    | "whatsapp_sent"
    | "other_contact"
    | "replied"
    | "closed"
  >("applied");
  const [actionNotes, setActionNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState("");
  const [eventId] = useState(() => crypto.randomUUID());
  const sources = data.sources.filter((s) => s.lead_id === lead.id);
  const source = safeLink(lead.source_url),
    approach = safeLink(lead.approach_url);
  const update = (key: keyof Lead, value: string) =>
    setDraft({ ...draft, [key]: value });
  return (
    <>
      <div className="inspector-heading">
        <p className="eyebrow">Lead inspector</p>
        <button className="text-button" onClick={close}>
          Close
        </button>
      </div>
      <h2>{lead.opportunity || lead.organization || "Untitled lead"}</h2>
      <p className="muted">
        {lead.organization} · {lead.location}
      </p>
      {source && (
        <p>
          <a href={source} target="_blank" rel="noreferrer">
            Open original source ↗
          </a>
        </p>
      )}
      <p><a href={`https://www.google.com/search?q=${encodeURIComponent(`${lead.organization} ${lead.opportunity} official`)}`} target="_blank" rel="noreferrer">Research this lead on the web ↗</a></p>
      <details><summary>Profile & qualification criteria</summary><pre>{data.settings.profile || "Add your experience in Settings."}</pre><pre>{data.settings.criteria || "Add your criteria in Settings."}</pre></details>
      <details>
        <summary>Provenance & original data ({sources.length})</summary>
        {sources.map((s) => (
          <div key={s.id} className="source-record">
            <strong>{s.file_name}</strong>
            <p>
              {s.source_sheet} ·{" "}
              {s.file_type === "csv" ? "logical record" : "sheet row"}{" "}
              {s.source_row}
            </p>
            <pre>{JSON.stringify(s.raw_json, null, 2)}</pre>
          </div>
        ))}
      </details>
      <details open={lead.execution_state !== "ready"}>
      <summary>Edit decision and preparation</summary>
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          save({
            type: "lead",
            id: lead.id,
            version: lead.version,
            assessment: draft.assessment,
            execution_state: draft.execution_state,
            notes: draft.notes,
            rationale: draft.rationale,
            approach_url: draft.approach_url,
            draft: draft.draft,
            evidence: draft.evidence,
          });
        }}
      >
        <label>
          Decision
          <select
            value={draft.assessment}
            aria-label="Decision"
            onChange={(e) => update("assessment", e.target.value)}
          >
            {assessmentSchema.options.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reason for decision
          <textarea
            value={draft.rationale}
            maxLength={20000}
            rows={3}
            onChange={(e) => update("rationale", e.target.value)}
          />
        </label>
        <label>
          Research evidence — findings, URLs and date checked
          <textarea
            value={draft.evidence}
            maxLength={20000}
            rows={4}
            onChange={(e) => update("evidence", e.target.value)}
          />
        </label>
        <label>
          Approach URL or mailto address
          <input
            value={draft.approach_url}
            maxLength={2000}
            onChange={(e) => update("approach_url", e.target.value)}
            placeholder="https://… or mailto:…"
          />
        </label>
        <label>
          Draft message / application answers
          <textarea
            value={draft.draft}
            maxLength={20000}
            rows={6}
            onChange={(e) => update("draft", e.target.value)}
          />
        </label>
        <label>
          Private notes / missing information
          <textarea
            value={draft.notes}
            maxLength={20000}
            rows={3}
            onChange={(e) => update("notes", e.target.value)}
          />
        </label>
        <label>
          Processing stage
          <select
            value={draft.execution_state}
            aria-label="Processing stage"
            onChange={(e) => update("execution_state", e.target.value)}
          >
            {executionStateSchema.options.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
        <small>
          Ready requires qualification, a reason, research evidence and an
          approach link.
        </small>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save lead"}
        </button>
      </form>
      </details>
      <section className="action-panel">
        <h2>Use saved preparation</h2>
        {approach && (
          <p>
            <a href={approach} target="_blank" rel="noreferrer">
              Open approach destination ↗
            </a>
          </p>
        )}
        <button
          className="button"
          disabled={!lead.draft}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(lead.draft);
              setCopied("Saved draft copied.");
            } catch {
              setCopied(
                "Clipboard unavailable. Select the draft text to copy it.",
              );
            }
          }}
        >
          Copy saved draft
        </button>
        <p role="status">{copied}</p>
        <button className="button" onClick={() => {
          const content = [`${lead.organization} — ${lead.opportunity}`, `Lead ID: ${lead.id}`, `Approach: ${lead.approach_url}`, `Decision: ${lead.assessment} — ${lead.rationale}`, "", "RESEARCH (user-entered)", lead.evidence, "", "DRAFT", lead.draft, "", "NOTES", lead.notes, "", "Original sources", ...sources.map(s=>`${s.file_name} / ${s.source_sheet} / row ${s.source_row}`)].join("\n");
          const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
          const link = document.createElement("a"); link.href = url; link.download = `Preparation-${lead.id.slice(0,8)}.txt`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
        }}>Download saved preparation</button>
        <h2>Record an action you completed</h2>
        <form
          className="editor"
          onSubmit={(e) => {
            e.preventDefault();
            save({
              type: "activity",
              id: eventId,
              lead_id: lead.id,
              action_type: action,
              destination: lead.approach_url,
              notes: actionNotes,
              confirmed: true,
            });
          }}
        >
          <label>
            Outcome
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
            >
              {actionStateSchema.options
                .filter((s) => s !== "not_actioned")
                .map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Action notes
            <input
              value={actionNotes}
              maxLength={20000}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I performed this action myself.
          </label>
          <button className="button" disabled={busy || !confirmed}>
            Record completed action
          </button>
        </form>
      </section>
      <details>
        <summary>Decision history</summary>
        {data.decisions
          .filter((d) => d.lead_id === lead.id)
          .map((d) => (
            <p key={d.id}>
              {label(d.previous_decision)} → {label(d.decision)}: {d.rationale}
            </p>
          ))}
      </details>
    </>
  );
}
