"use client";

import { useMemo, useState } from "react";
import type { ParsedFile } from "@/services/imports/types";
import { canonicalFieldSchema, type CanonicalField } from "@/domain/lead";
import { mapRow } from "@/services/imports/mapping";

type ImportSummary = {
  importedSheets: number;
  importedRows: number;
  createdLeads: number;
  linkedDuplicates: number;
  duplicateSheets: number;
};

export function ImportWorkspace({ onImported }: { onImported?: () => void }) {
  const [pasted, setPasted] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ParsedFile[]>([]);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const recordCount = useMemo(
    () =>
      preview
        .flatMap((file) => file.sheets)
        .reduce((sum, sheet) => sum + sheet.records.length, 0),
    [preview],
  );

  async function send(endpoint: "preview" | "commit") {
    setBusy(endpoint);
    setError("");
    setSummary(null);
    try {
      if (
        files.length > 10 ||
        files.reduce((size, file) => size + file.size, 0) > 4 * 1024 * 1024
      )
        throw new Error(
          "Use up to ten files totaling less than 4 MB per upload. Split larger imports into smaller files.",
        );
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      if (endpoint === "commit")
        form.append(
          "mappings",
          JSON.stringify(
            preview.map((file) => ({
              fileHash: file.fileHash,
              sheets: file.sheets.map((sheet) => ({
                name: sheet.name,
                mapping: sheet.mapping,
              })),
            })),
          ),
        );
      const response = await fetch(`/api/imports/${endpoint}`, {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as {
        files?: ParsedFile[];
        summary?: ImportSummary;
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error || "The import could not be processed.");
      if (body.files) setPreview(body.files);
      if (body.summary) {
        setSummary(body.summary);
        onImported?.();
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The import could not be processed.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="workspace-grid">
      <section className="work-surface" aria-labelledby="import-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Source intake</p>
            <h1 id="import-title">Import lead files</h1>
            <p className="supporting">
              Preview uneven CSV and XLSX files before adding them to the master
              record.
            </p>
            <p>
              <a href="/api/sample">Download a clearly labeled sample CSV</a>
            </p>
          </div>
          <span className="sync-status">
            <span aria-hidden="true" /> Excel download available
          </span>
        </div>

        <label className="file-drop">
          <span className="file-drop-title">Choose source files</span>
          <span>
            Up to 10 CSV or XLSX files; keep the combined upload below 4 MB
          </span>
          <input
            type="file"
            accept=".csv,.xlsx"
            multiple
            onChange={(event) => {
              setFiles(Array.from(event.target.files ?? []));
              setPreview([]);
              setSummary(null);
              setError("");
            }}
          />
        </label>
        <details className="paste-intake">
          <summary>Or paste a CSV / tab-separated table</summary>
          <label>
            Include the header row
            <textarea
              rows={6}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
          </label>
          <button
            className="button"
            disabled={!pasted.trim()}
            onClick={() => {
              setFiles([
                new File([pasted], `pasted-table-${Date.now()}.csv`, {
                  type: "text/csv",
                }),
              ]);
              setPreview([]);
              setSummary(null);
            }}
          >
            Use pasted table
          </button>
        </details>

        {files.length > 0 && (
          <div className="selected-files" aria-live="polite">
            <strong>
              {files.length} source {files.length === 1 ? "file" : "files"}
            </strong>
            <span>{files.map((file) => file.name).join(", ")}</span>
            <button
              className="button primary"
              disabled={busy !== null}
              onClick={() => send("preview")}
            >
              {busy === "preview" ? "Reading files…" : "Preview mapping"}
            </button>
          </div>
        )}

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {summary && (
          <div className="notice success" role="status">
            Added {summary.importedRows} source rows and created{" "}
            {summary.createdLeads} leads. {summary.linkedDuplicates} repeated
            observations were linked. {summary.duplicateSheets} previously
            imported sheets skipped. <a href="#batches">Review saved leads →</a>
          </div>
        )}

        {preview.length > 0 && (
          <div className="preview-panel">
            <div className="preview-bar">
              <div>
                <strong>{recordCount} records ready</strong>
                <span>Review source fields and proposed mappings.</span>
              </div>
              <button
                className="button primary"
                disabled={busy !== null}
                onClick={() => send("commit")}
              >
                {busy === "commit" ? "Adding records…" : "Add to master record"}
              </button>
            </div>
            {preview.map((file) =>
              file.sheets.map((sheet) => (
                <article
                  className="sheet-preview"
                  key={`${file.fileHash}-${sheet.name}`}
                >
                  <div className="sheet-title">
                    <strong>{file.fileName}</strong>
                    <span>
                      {sheet.name} · {sheet.records.length} rows
                    </span>
                  </div>
                  <div className="mapping-list">
                    {sheet.mapping.map((item) => (
                      <div key={item.source}>
                        <span>{item.source}</span>
                        <span aria-hidden="true">→</span>
                        <select
                          aria-label={`Map ${file.fileName} ${sheet.name} ${item.source}`}
                          value={item.target ?? ""}
                          onChange={(e) =>
                            setPreview(
                              preview.map((f) =>
                                f.fileHash !== file.fileHash
                                  ? f
                                  : {
                                      ...f,
                                      sheets: f.sheets.map((s) => {
                                        if (s.name !== sheet.name) return s;
                                        const mapping = s.mapping.map((m) =>
                                          m.source === item.source
                                            ? {
                                                ...m,
                                                target: (e.target.value ||
                                                  null) as CanonicalField | null,
                                              }
                                            : m,
                                        );
                                        return {
                                          ...s,
                                          mapping,
                                          records: s.records.map((r) => ({
                                            ...r,
                                            mapped: mapRow(r.raw, mapping),
                                          })),
                                        };
                                      }),
                                    },
                              ),
                            )
                          }
                        >
                          <option value="">Preserve only</option>
                          {canonicalFieldSchema.options.map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {sheet.warnings.map((warning, i) => (
                    <p role="alert" key={i} className="notice error">
                      {warning}
                    </p>
                  ))}
                  {sheet.records.length > 0 && (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Original row</th>
                            <th>Organization</th>
                            <th>Opportunity</th>
                            <th>Location</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sheet.records.slice(0, 5).map((record) => (
                            <tr key={record.sourceRow}>
                              <td>{record.sourceRow}</td>
                              <td>{record.mapped.organization || "—"}</td>
                              <td>{record.mapped.opportunity || "—"}</td>
                              <td>{record.mapped.location || "—"}</td>
                              <td className="truncate">
                                {record.mapped.source_url || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              )),
            )}
          </div>
        )}
      </section>

      <aside className="inspector" aria-label="Import checks">
        <p className="eyebrow">Import checks</p>
        <h2>Nothing is hidden</h2>
        <dl>
          <div>
            <dt>Original rows</dt>
            <dd>Stored with file, sheet, and row references</dd>
          </div>
          <div>
            <dt>Unknown columns</dt>
            <dd>Preserved in the source record</dd>
          </div>
          <div>
            <dt>Duplicates</dt>
            <dd>Linked to one lead when identity is exact</dd>
          </div>
          <div>
            <dt>AI usage</dt>
            <dd>None for parsing or deduplication</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
