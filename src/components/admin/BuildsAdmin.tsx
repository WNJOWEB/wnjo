"use client";

import { openFileTab } from "@/lib/open-tab";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  staffStageLabel,
  APPROVALS,
  APPROVAL_ORDER,
  PROPOSAL_STATUSES,
  approvalState,
  stagePath,
  type ApprovalKind,
  type ApprovalRecord,
  type ProposalLine,
  type ProposalStatus,
  type Route,
  type Stage,
} from "@/lib/build-journey";
import { REVISION_STATUSES, isUnfinished, type RevisionRow } from "@/lib/build-revisions";
import { CUSTOMERS, FIRST_ACTIONS, GOALS, STYLES, TONES, type WebsiteBrief } from "@/lib/website-brief";
import { SECTOR_PRESETS } from "@/lib/site-template/presets";
import { extrasRows } from "@/lib/brief-extras";

type BriefRow = {
  id: string;
  reference: string;
  name: string;
  business_name: string;
  email: string;
  route: Route;
  stage: Stage;
  version: number;
  brief: WebsiteBrief;
  figures: { package?: string; mode?: string; monthly?: number; setup?: number; oneOffTotal?: number; requiresQuote?: boolean; quoteReasons?: string[] };
  expected_by: string | null;
  balance_paid_at: string | null;
  handed_over_at: string | null;
  created_at: string;
};
type EventRow = { id: string; kind: string; detail: Record<string, unknown>; actor_type: string; actor_email: string | null; created_at: string };
type Approval = ApprovalRecord & { id: string; note: string; decided_by_email: string; decided_by_role: string; proposal_id: string | null };
type Proposal = {
  id: string;
  reference: string;
  status: ProposalStatus;
  source: string;
  summary: string;
  lines: ProposalLine[];
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
  customer_note: string;
  created_at: string;
};

const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
const pounds = (n?: number) => (typeof n === "number" ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n) : "–");
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Call = (payload: Record<string, unknown>, url?: string) => Promise<{ ok: boolean; json: Record<string, unknown> }>;

/**
 * Website builds for staff: each brief, its stage, the four approvals and (for bespoke briefs) the proposal. Reads
 * through row-level security; every change goes through the server, which records who made it.
 */
export function BuildsAdmin({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<BriefRow[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // The detail is shown under the table, so bring it into view when a brief is opened (on a phone it is far below).
  const detailRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selected) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  const load = useCallback(() => {
    client
      .from("website_briefs")
      .select("id, reference, name, business_name, email, route, stage, version, brief, figures, expected_by, balance_paid_at, handed_over_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: err }) => {
        setError(Boolean(err));
        setRows(err ? null : ((data as BriefRow[]) ?? []));
      });
  }, [client]);
  useEffect(load, [load]);

  const call: Call = async (payload, url = "/api/admin/briefs") => {
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, json: { error: "Please sign in again." } };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  };

  if (error) return <p role="alert">Website builds couldn&apos;t be loaded.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) return <p className="lede">No briefs yet. They appear here when someone sends one from Get started.</p>;

  const current = rows.find((r) => r.id === selected) ?? null;
  return (
    <div className="stack" style={{ "--stack": "var(--space-6)", minWidth: 0 } as React.CSSProperties}>
      <div className="table-wrap" role="region" aria-label="Website briefs" tabIndex={0}>
      <table className="admin-table admin-table--list">
        <thead>
          <tr>
            <th scope="col">Website</th>
            <th scope="col">Plan</th>
            <th scope="col">Stage</th>
            <th scope="col" className="admin-table__end">Received</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} aria-selected={r.id === selected} className="admin-table__row" onClick={() => setSelected(r.id === selected ? null : r.id)}>
              <td>
                <button
                  type="button"
                  className="admin-table__open"
                  aria-expanded={r.id === selected}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(r.id === selected ? null : r.id);
                  }}
                >
                  {r.business_name || r.name}
                </button>
                <span className="admin-table__sub">{r.reference}</span>
              </td>
              <td>
                {r.route === "proposal" ? "Bespoke" : r.figures.package}
                <span className="admin-table__sub">
                  {r.figures.mode === "monthly" ? `${pounds(r.figures.monthly)} a month` : pounds(r.figures.oneOffTotal)}
                </span>
              </td>
              <td>{staffStageLabel(r.stage)}</td>
              <td className="admin-table__end">{when.format(new Date(r.created_at))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {current && (
        <div id="brief-detail" ref={detailRef}>
          <BriefDetail key={current.id} client={client} row={current} call={call} onChanged={load} />
        </div>
      )}
    </div>
  );
}

function BriefDetail({ client, row, call, onChanged }: { client: SupabaseClient; row: BriefRow; call: Call; onChanged: () => void }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void Promise.all([
      client.from("website_brief_events").select("id, kind, detail, actor_type, actor_email, created_at").eq("brief_id", row.id).order("created_at", { ascending: false }),
      client.from("build_approvals").select("id, kind, decision, note, decided_by_email, decided_by_role, proposal_id, created_at").eq("brief_id", row.id).order("created_at", { ascending: false }),
      client.from("website_proposals").select("id, reference, status, source, summary, lines, setup_pence, monthly_pence, one_off_pence, customer_note, created_at").eq("brief_id", row.id).order("created_at", { ascending: false }),
      client.from("build_revisions").select("id, brief_id, number, status, request, response, created_at, resolved_at").eq("brief_id", row.id).order("number", { ascending: false }),
    ]).then(([e, a, p, r]) => {
      setEvents((e.data as EventRow[]) ?? []);
      setApprovals((a.data as Approval[]) ?? []);
      setProposals((p.data as Proposal[]) ?? []);
      setRevisions((r.data as RevisionRow[]) ?? []);
    });
  }, [client, row.id]);
  useEffect(load, [load]);

  const act = async (payload: Record<string, unknown>, done: string, url?: string) => {
    setBusy(true);
    setMessage(null);
    const r = await call({ briefId: row.id, ...payload }, url);
    setBusy(false);
    setMessage({ ok: r.ok, text: r.ok ? done : String(r.json.error ?? "That didn't work.") });
    if (r.ok) {
      load();
      onChanged();
    }
    return r.ok;
  };

  const openFile = async (path: string) => {
    const opened = await openFileTab(async () => {
      const r = await call({ briefId: row.id, action: "file_link", path });
      return r.ok && typeof r.json.url === "string" ? r.json.url : null;
    });
    if (!opened) setMessage({ ok: false, text: "The file couldn't be opened." });
  };

  const state = approvalState(approvals);
  const b = row.brief;
  const path = stagePath(row.route);
  const accepted = proposals.find((p) => p.status === "accepted");

  return (
    <section className="admin-order build-detail" aria-label={`Brief ${row.reference}`}>
      <div className="build-detail__head">
        <h2 className="h3">
          {row.business_name || row.name} <span className="acct-meta">{row.reference} · version {row.version}</span>
        </h2>
        {message && (
          <p role="status" className={message.ok ? "acct-meta" : "field-error"}>
            {message.text}
          </p>
        )}
      </div>

      <div className="build-grid">
        <div className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
          <div>
            <p className="admin-label">Brief</p>
            <dl className="brief-summary">
              <div><dt>Customer</dt><dd>{row.name || "–"}</dd></div>
              {extrasRows(b.extras).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd style={{ whiteSpace: "pre-line" }}>{value}</dd>
                </div>
              ))}
              {(b.site || b.otherBusinessType) && (
                <div>
                  <dt>Business type</dt>
                  <dd>
                    {b.site ? (SECTOR_PRESETS[b.site.sector]?.label ?? b.site.sector) : b.otherBusinessType}
                    {!b.site && <span className="acct-meta"> · their words</span>}
                  </dd>
                </div>
              )}
              {b.site && (() => {
                const a = b.site.answers;
                const hoursText = (a.hours ?? [])
                  .map((d) => (d.closed ? `${d.day}: closed` : d.open && d.close ? `${d.day}: ${d.open} to ${d.close}` : null))
                  .filter(Boolean)
                  .join("; ");
                const lookLabel = a.look ? a.look.charAt(0).toUpperCase() + a.look.slice(1) : "";
                const rows: [string, string][] = [
                  ["What do you offer? (services and prices)", a.servicesText ?? ""],
                  ["Opening hours", hoursText],
                  ["Phone number (optional)", a.phone ?? ""],
                  ["Email address (for replies)", a.email ?? ""],
                  ["Address", a.address ?? ""],
                  ["Areas", a.areas ?? ""],
                  ["What makes the business different", a.about ?? ""],
                  ...(SECTOR_PRESETS[b.site!.sector]?.questions ?? []).map((q): [string, string] => [q.label, a.details?.[q.id] ?? ""]),
                  ["Facts ticked (what is true of the business)", (a.highlights ?? []).map((id) => SECTOR_PRESETS[b.site!.sector]?.highlights.find((h) => h.id === id)?.value ?? id).join(", ")],
                  ["Look", lookLabel],
                  ["Colour", a.colour ?? ""],
                ];
                return rows
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd style={{ whiteSpace: "pre-line" }}>{value}</dd>
                    </div>
                  ));
              })()}
              {!b.site && b.otherBusinessType && (
                <>
                  {b.profile.services && <div><dt>What do you offer?</dt><dd style={{ whiteSpace: "pre-line" }}>{b.profile.services}</dd></div>}
                  {b.profile.email && <div><dt>Email address (for replies)</dt><dd>{b.profile.email}</dd></div>}
                  {b.profile.phone && <div><dt>Phone number (optional)</dt><dd>{b.profile.phone}</dd></div>}
                  {b.profile.differentiator && <div><dt>What makes you different?</dt><dd>{b.profile.differentiator}</dd></div>}
                  {b.profile.customers && <div><dt>Who are your customers?</dt><dd>{CUSTOMERS[b.profile.customers]}</dd></div>}
                  {b.profile.firstActions.length > 0 && <div><dt>What should a visitor do first?</dt><dd>{b.profile.firstActions.map((a) => FIRST_ACTIONS[a]).join(", ")}</dd></div>}
                  {b.profile.areas && <div><dt>Where do you work?</dt><dd>{b.profile.areas}</dd></div>}
                  {b.profile.hours && <div><dt>Opening hours or availability</dt><dd>{b.profile.hours}</dd></div>}
                  {b.profile.about && <div><dt>About you and the business</dt><dd style={{ whiteSpace: "pre-line" }}>{b.profile.about}</dd></div>}
                  {b.profile.proof && <div><dt>Proof to show</dt><dd>{b.profile.proof}</dd></div>}
                  {b.profile.tone && <div><dt>How should the site sound?</dt><dd>{TONES[b.profile.tone]}</dd></div>}
                </>
              )}
              <div><dt>Goals</dt><dd>{b.goals.map((g) => GOALS[g]?.label ?? g).join(", ") || "–"}{b.goalNote && <><br /><span className="acct-meta">{b.goalNote}</span></>}</dd></div>
              <div><dt>Pages</dt><dd>{b.pages.join(", ")}</dd></div>
              <div><dt>Look</dt><dd>{b.style ? STYLES[b.style]?.label : "No preference"}{b.colours && ` · ${b.colours}`}</dd></div>
              {b.references.length > 0 && (
                <div><dt>Likes</dt><dd>{b.references.map((r) => <span key={r} className="build-ref">{r}</span>)}</dd></div>
              )}
              {b.avoid && <div><dt>Avoid</dt><dd>{b.avoid}</dd></div>}
              {b.functionality && <div><dt>Needs</dt><dd>{b.functionality}</dd></div>}
              <div>
                <dt>Files</dt>
                <dd>
                  {b.files.length === 0
                    ? "None"
                    : b.files.map((f) => (
                        <button key={f.path} type="button" className="arrow-link build-file" onClick={() => void openFile(f.path)}>
                          {f.name}
                        </button>
                      ))}
                </dd>
              </div>
              {row.figures.quoteReasons && row.figures.quoteReasons.length > 0 && (
                <div><dt>Quote</dt><dd>{row.figures.quoteReasons.join("; ")}</dd></div>
              )}
            </dl>
          </div>

          <StageControl row={row} path={path} busy={busy} onMove={(stage, note) => act({ action: "stage", stage, note }, `Moved to ${staffStageLabel(stage)}.`)} />

          <ExpectedDate key={`${row.id}:${row.expected_by ?? ""}`} row={row} busy={busy} act={act} />

          <AiPanel client={client} row={row} revisions={revisions} call={call} onChanged={onChanged} />

          <RevisionsPanel revisions={revisions} busy={busy} act={act} />

          {row.route === "proposal" && (
            <ProposalPanel key={proposals.map((p) => `${p.id}:${p.status}`).join()} proposals={proposals} busy={busy} act={act} />
          )}

          {row.route === "proposal" && row.figures.mode === "oneOff" && accepted && (
            <HandoverPanel key={`${row.balance_paid_at ?? ""}:${row.handed_over_at ?? ""}`} row={row} busy={busy} act={act} />
          )}

          {row.stage === "awaiting_payment" && (
            <div>
              <p className="admin-label">Payment link</p>
              <p className="acct-meta">
                {row.route === "proposal"
                  ? accepted
                    ? "Created from the accepted proposal's figures. The form's figures are ignored."
                    : "Waiting for the customer to accept the proposal."
                  : "Created from the catalogue price on the brief."}
              </p>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={busy || (row.route === "proposal" && !accepted)}
                onClick={() =>
                  void act({ action: "create", enquiryReference: row.reference, sendEmail: true }, "Payment link created and emailed.", "/api/admin/subscriptions")
                }
              >
                Create and email payment link
              </button>
            </div>
          )}
        </div>

        <div className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
          <ApprovalsPanel state={state} approvals={approvals} busy={busy} act={act} />
          <History events={events} busy={busy} act={act} />
        </div>
      </div>
    </section>
  );
}

function HandoverPanel({ row, busy, act }: { row: BriefRow; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [message, setMessage] = useState("");
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div>
      <p className="admin-label">Final payment and handover</p>
      {row.handed_over_at ? (
        <p className="acct-meta">Handed over on {day(row.handed_over_at)}.</p>
      ) : row.balance_paid_at ? (
        <>
          <p className="acct-meta">Final payment received on {day(row.balance_paid_at)}. Add where the files and domain details are, then hand the website over. It emails the customer. Owner or admin only.</p>
          <label className="acct-label" htmlFor={`handover-${row.id}`}>
            Message to the customer <span className="optional">(optional)</span>
          </label>
          <textarea id={`handover-${row.id}`} className="acct-input" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void act({ action: "handover", note: message }, "Website handed over. The customer has been emailed.")}>
            Hand over website
          </button>
        </>
      ) : (
        <p className="acct-meta">Waiting for the customer to approve the website and pay the final 50%.</p>
      )}
    </div>
  );
}

function StageControl({ row, path, busy, onMove }: { row: BriefRow; path: Stage[]; busy: boolean; onMove: (s: Stage, note: string) => void }) {
  const [target, setTarget] = useState<Stage>(row.stage);
  const [note, setNote] = useState("");
  const here = path.indexOf(row.stage);
  const changing = target !== row.stage;
  return (
    <div className="stage">
      <p className="admin-label">Stage</p>
      <p className="stage__now">
        {staffStageLabel(row.stage)}
        {here >= 0 && <span>Step {here + 1} of {path.length}</span>}
      </p>
      {here >= 0 && (
        <div className="stage__bar" role="img" aria-label={`Step ${here + 1} of ${path.length}: ${staffStageLabel(row.stage)}`}>
          {path.map((s, i) => (
            <span key={s} className={i < here ? "is-done" : i === here ? "is-current" : undefined} title={staffStageLabel(s)} />
          ))}
        </div>
      )}
      <div className="stage__move">
        <label htmlFor={`stage-${row.id}`} className="visually-hidden">Move to stage</label>
        <select id={`stage-${row.id}`} className="acct-input" value={target} onChange={(e) => setTarget(e.target.value as Stage)}>
          {[...path, "on_hold" as Stage, "closed" as Stage].map((s) => (
            <option key={s} value={s}>{staffStageLabel(s)}</option>
          ))}
        </select>
        <button type="button" className="btn btn--secondary" disabled={busy || !changing} onClick={() => onMove(target, note)}>
          Move
        </button>
      </div>
      {changing && (
        <input className="acct-input" placeholder="Note (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} aria-label="Stage note" />
      )}
    </div>
  );
}

function ApprovalsPanel({
  state,
  approvals,
  busy,
  act,
}: {
  state: ReturnType<typeof approvalState>;
  approvals: Approval[];
  busy: boolean;
  act: (p: Record<string, unknown>, done: string) => Promise<boolean>;
}) {
  const [notes, setNotes] = useState<Partial<Record<ApprovalKind, string>>>({});
  const decide = async (kind: ApprovalKind, decision: "approved" | "rejected") => {
    const ok = await act({ action: "approve", kind, decision, note: notes[kind] ?? "" }, `${APPROVALS[kind].label} ${decision}.`);
    if (ok) setNotes((n) => ({ ...n, [kind]: "" }));
  };
  return (
    <div>
      <p className="admin-label">Approvals before launch</p>
      <ul className="build-approvals" role="list">
        {APPROVAL_ORDER.map((kind) => {
          const latest = approvals.find((a) => a.kind === kind);
          return (
            <li key={kind} className={`build-approval build-approval--${state[kind]}`}>
              <div className="build-approval__head">
                <strong>{APPROVALS[kind].label}</strong>
                <span className="build-approval__state">{state[kind] === "pending" ? "Pending" : state[kind] === "approved" ? "Approved" : "Rejected"}</span>
              </div>
              <p className="acct-meta">
                {latest
                  ? `${latest.decided_by_email} · ${when.format(new Date(latest.created_at))}${latest.note ? ` · ${latest.note}` : ""}`
                  : APPROVALS[kind].hint}
              </p>
              <div className="build-row">
                <input
                  className="acct-input"
                  placeholder="Note (needed to reject)"
                  maxLength={2000}
                  value={notes[kind] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [kind]: e.target.value }))}
                  aria-label={`${APPROVALS[kind].label} note`}
                />
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void decide(kind, "approved")}>
                  Approve
                </button>
                <button type="button" className="btn btn--secondary" disabled={busy || !(notes[kind] ?? "").trim()} onClick={() => void decide(kind, "rejected")}>
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The changes the customer asked for on their preview: what they said, and where each one has got to. */
function RevisionsPanel({ revisions, busy, act }: { revisions: RevisionRow[]; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (revisions.length === 0) return null;
  const waiting = revisions.filter((r) => isUnfinished(r.status)).length;
  const answer = async (r: RevisionRow, op: "start" | "done" | "decline", done: string) => {
    const ok = await act({ action: "revision", revisionId: r.id, op, note: notes[r.id] ?? "" }, done);
    if (ok) setNotes((n) => ({ ...n, [r.id]: "" }));
  };
  return (
    <div>
      <p className="admin-label">Customer changes{waiting > 0 ? ` · ${waiting} to do` : ""}</p>
      <ol className="build-revisions" role="list">
        {revisions.map((r) => (
          <li key={r.id}>
            <p className="build-revision__head">
              <strong>Change {r.number}</strong>
              <span className={`build-revision__status is-${r.status}`}>{REVISION_STATUSES[r.status]}</span>
              <span className="acct-meta">{when.format(new Date(r.created_at))}</span>
            </p>
            <p className="build-revision__text">{r.request}</p>
            {r.response && <p className="acct-meta">Our reply: {r.response}</p>}
            {isUnfinished(r.status) && (
              <div className="build-row">
                <input
                  className="acct-input"
                  placeholder="Reply to the customer (needed to decline)"
                  value={notes[r.id] ?? ""}
                  maxLength={2000}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  aria-label={`Reply to change ${r.number}`}
                />
                {r.status === "open" && (
                  <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void answer(r, "start", `Change ${r.number} started.`)}>
                    Start
                  </button>
                )}
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void answer(r, "done", `Change ${r.number} marked done.`)}>
                  Mark done
                </button>
                <button type="button" className="btn btn--secondary" disabled={busy || !(notes[r.id] ?? "").trim()} onClick={() => void answer(r, "decline", `Change ${r.number} declined.`)}>
                  Decline
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

const DETAIL_TEXT = (e: EventRow): string => {
  const d = e.detail;
  switch (e.kind) {
    case "created":
      return "Brief sent";
    case "stage":
      return `Stage: ${staffStageLabel(d.from as Stage)} → ${staffStageLabel(d.to as Stage)}${d.note ? ` · ${d.note}` : ""}`;
    case "approval":
      return `${APPROVALS[d.kind as ApprovalKind]?.label ?? d.kind} ${d.decision}${d.note ? ` · ${d.note}` : ""}`;
    case "proposal":
      return `Proposal ${d.reference ?? ""} ${d.action}${d.note ? ` · ${d.note}` : ""}`;
    case "revision":
      return `Change ${d.number} ${d.action}${d.note ? ` · ${d.note}` : ""}`;
    case "preview":
      return "Customer approved the preview";
    case "note":
      return String(d.text ?? "");
    case "expected":
      return d.to ? `Expected by ${String(d.to)}` : "Expected date cleared";
    default:
      return e.kind;
  }
};

function History({ events, busy, act }: { events: EventRow[]; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  return (
    <div>
      <p className="admin-label">History</p>
      <div className="build-row">
        <input className="acct-input" placeholder="Add an internal note" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} aria-label="Internal note" />
        <button
          type="button"
          className="btn btn--secondary"
          disabled={busy || !text.trim()}
          onClick={async () => {
            if (await act({ action: "note", text }, "Note added.")) setText("");
          }}
        >
          Add
        </button>
      </div>
      <ol className="build-history" role="list">
        {events.map((e) => (
          <li key={e.id}>
            <span>{DETAIL_TEXT(e)}</span>
            <span className="acct-meta">
              {e.actor_email ?? e.actor_type} · {when.format(new Date(e.created_at))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

type DraftLine = { label: string; amount: string; kind: ProposalLine["kind"] };

function ProposalPanel({ proposals, busy, act }: { proposals: Proposal[]; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const open = proposals.find((p) => ["draft", "pending_approval", "approved", "sent"].includes(p.status));
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(open?.summary ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    open?.lines.map((l) => ({ ...l, amount: String(l.amount) })) ?? [{ label: "Bespoke website design and build", amount: "", kind: "one_off" }],
  );
  const [note, setNote] = useState("");

  const save = async () => {
    const ok = await act(
      { action: "proposal_save", proposalId: open?.status === "draft" ? open.id : undefined, summary, lines: lines.map((l) => ({ ...l, amount: Number(l.amount) })) },
      "Proposal saved as a draft.",
    );
    if (ok) setEditing(false);
  };
  const op = (o: string, done: string) => act({ action: "proposal", proposalId: open?.id, op: o, note }, done).then((ok) => ok && setNote(""));

  const showForm = editing || !open;
  return (
    <div>
      <p className="admin-label">Proposal</p>
      {open && !editing && (
        <div className="build-proposal">
          <p>
            <strong>{open.reference}</strong> · {PROPOSAL_STATUSES[open.status]}
            {open.source === "ai" && <span className="cfg-tag">AI suggestion</span>}
          </p>
          {open.summary && <p className="acct-meta">{open.summary}</p>}
          <ul className="build-lines" role="list">
            {open.lines.map((l, i) => (
              <li key={i}><span>{l.label}</span><span>{money(Math.round(l.amount * 100))}{l.kind === "monthly" ? " a month" : l.kind === "setup" ? " setup" : ""}</span></li>
            ))}
          </ul>
          <div className="build-row">
            <input
              className="acct-input"
              placeholder={open.status === "pending_approval" ? "Note (needed to reject)" : "Note (optional)"}
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Proposal note"
            />
            {open.status === "draft" && (
              <>
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setEditing(true)}>Edit</button>
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void op("submit", "Sent for approval.")}>Submit for approval</button>
              </>
            )}
            {open.status === "pending_approval" && (
              <>
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void op("approve", "Pricing approved.")}>Approve pricing</button>
                <button type="button" className="btn btn--secondary" disabled={busy || !note.trim()} onClick={() => void op("reject", "Returned to draft.")}>Reject</button>
              </>
            )}
            {open.status === "approved" && (
              <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void op("send", "Sent to the customer.")}>Send to customer</button>
            )}
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void op("withdraw", "Proposal withdrawn.")}>Withdraw</button>
          </div>
        </div>
      )}
      {showForm && (
        <div className="build-proposal stack" style={{ "--stack": "var(--space-3)" } as React.CSSProperties}>
          <textarea className="admin-textarea" rows={3} placeholder="Summary for the customer" value={summary} maxLength={4000} onChange={(e) => setSummary(e.target.value)} aria-label="Proposal summary" />
          {lines.map((l, i) => (
            <div key={i} className="build-row">
              <input className="acct-input" placeholder="Line" value={l.label} maxLength={160} aria-label={`Line ${i + 1}`} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
              <input className="acct-input build-amount" inputMode="decimal" placeholder="£" value={l.amount} aria-label={`Line ${i + 1} amount`} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
              <select className="acct-input" value={l.kind} aria-label={`Line ${i + 1} type`} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, kind: e.target.value as ProposalLine["kind"] } : y)))}>
                <option value="one_off">One-off</option>
                <option value="setup">Setup</option>
                <option value="monthly">Monthly</option>
              </select>
              <button type="button" className="arrow-link" onClick={() => setLines((x) => x.filter((_, j) => j !== i))} disabled={lines.length === 1}>Remove</button>
            </div>
          ))}
          <div className="build-row">
            <button type="button" className="arrow-link" onClick={() => setLines((x) => [...x, { label: "", amount: "", kind: "one_off" }])}>Add a line</button>
          </div>
          <div className="build-row">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void save()}>Save draft</button>
            {editing && <button type="button" className="btn btn--secondary" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
          <p className="acct-meta">Drafts can be edited. Once submitted, the price is fixed until an owner or admin approves or rejects it.</p>
        </div>
      )}
      {proposals.filter((p) => p !== open).length > 0 && (
        <ul className="build-history" role="list">
          {proposals.filter((p) => p !== open).map((p) => (
            <li key={p.id}>
              <span>{p.reference} · {PROPOSAL_STATUSES[p.status]}{p.customer_note ? ` · “${p.customer_note}”` : ""}</span>
              <span className="acct-meta">{money(p.setup_pence + p.one_off_pence)}{p.monthly_pence ? ` + ${money(p.monthly_pence)} a month` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The date the customer is shown as "Expected by". Staff set it or clear it; each change is recorded in the history. */
function ExpectedDate({ row, busy, act }: { row: BriefRow; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [value, setValue] = useState(row.expected_by ?? "");
  return (
    <div>
      <p className="admin-label">Expected by</p>
      <p className="acct-meta">Shown to the customer on their website until it is live.</p>
      <div className="admin-actions">
        <label htmlFor={`expected-${row.id}`} className="visually-hidden">Expected by</label>
        <input id={`expected-${row.id}`} type="date" className="acct-input" value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="button" className="btn btn--secondary" disabled={busy || value === (row.expected_by ?? "")} onClick={() => void act({ action: "expected", date: value || null }, value ? "Expected date saved." : "Expected date cleared.")}>
          Save date
        </button>
        {row.expected_by && (
          <button type="button" className="linkbtn" disabled={busy} onClick={() => { setValue(""); void act({ action: "expected", date: null }, "Expected date cleared."); }}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

type AiPlanRow = { id: string; version: number; cost_pence: number; model: string; created_at: string; plan?: { assumptions?: string[]; questions?: string[] } | null };
type AiSiteBuildRow = { id: string; version: number; status: "draft" | "released" | "withdrawn"; checks_ok: boolean; change_note: string; cost_pence: number; model: string; created_at: string };
type AiPreviewRow = { id: string; version: number; status: "draft" | "released" | "withdrawn"; change_note: string; cost_pence: number; model: string; created_at: string };

const pence = (n: number) => `£${(n / 100).toFixed(2)}`;

/**
 * The AI steps for one website: Grok drafts a plan from the brief, then the words for each page, and a person releases
 * the result to the customer. Nothing the AI writes reaches the customer, changes the price or goes live without staff.
 */
function AiPanel({ client, row, revisions, call, onChanged }: { client: SupabaseClient; row: BriefRow; revisions: RevisionRow[]; call: Call; onChanged: () => void }) {
  const [plans, setPlans] = useState<AiPlanRow[]>([]);
  const [previews, setPreviews] = useState<AiPreviewRow[]>([]);
  const [siteBuilds, setSiteBuilds] = useState<AiSiteBuildRow[]>([]);
  const [siteChange, setSiteChange] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [change, setChange] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      client.from("website_plans").select("id, version, cost_pence, model, created_at, plan").eq("brief_id", row.id).order("version", { ascending: false }),
      client.from("website_previews").select("id, version, status, change_note, cost_pence, model, created_at").eq("brief_id", row.id).order("version", { ascending: false }),
      client.from("website_site_builds").select("id, version, status, checks_ok, change_note, cost_pence, model, created_at").eq("brief_id", row.id).order("version", { ascending: false }),
    ]).then(([p, v, sb]) => {
      if (cancelled) return;
      setPlans((p.data as AiPlanRow[]) ?? []);
      setPreviews((v.data as AiPreviewRow[]) ?? []);
      setSiteBuilds((sb.data as AiSiteBuildRow[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [client, row.id, tick]);

  const run = async (key: string, payload: Record<string, unknown>, done: string) => {
    setBusy(key);
    setMessage(null);
    const r = await call(payload, "/api/admin/ai/website");
    setBusy(null);
    setMessage({ ok: r.ok, text: r.ok ? done : String(r.json.error ?? "That didn't work.") });
    if (r.ok) {
      setTick((t) => t + 1);
      onChanged();
    }
    return r;
  };

  const openPreview = async (previewId: string) => {
    const opened = await openFileTab(async () => {
      const r = await call({ action: "link", previewId }, "/api/admin/ai/website");
      return r.ok && typeof r.json.url === "string" ? r.json.url : null;
    });
    if (!opened) setMessage({ ok: false, text: "The preview couldn't be opened." });
  };

  const openSiteBuild = async (buildId: string) => {
    const opened = await openFileTab(async () => {
      const r = await call({ action: "site-link", buildId }, "/api/admin/ai/website");
      return r.ok && typeof r.json.url === "string" ? r.json.url : null;
    });
    if (!opened) setMessage({ ok: false, text: "The build couldn't be opened." });
  };

  const releaseSite = (b: AiSiteBuildRow) => {
    if (!b.checks_ok && !window.confirm("This build failed the automatic checks. Release it to the customer anyway?")) return;
    void run(`release-site-${b.id}`, { action: "site-release", buildId: b.id, override: !b.checks_ok }, "Released to the customer.");
  };

  const openChanges = revisions.filter((r) => r.status === "open" || r.status === "in_progress");
  const paid = ["specification", "building", "preview", "changes", "approval"].includes(row.stage);
  const latestPlan = plans[0];

  return (
    <div>
      <p className="admin-label">AI website</p>
      {!paid ? (
        <p className="acct-meta">Starts once the customer has paid.</p>
      ) : (
        <div className="stack" style={{ "--stack": "var(--space-3)" } as React.CSSProperties}>
          {latestPlan?.plan?.questions && latestPlan.plan.questions.length > 0 && (
            <div>
              <p className="admin-label">Questions for you</p>
              <p className="acct-meta">The writer couldn&apos;t answer these from the customer&apos;s answers. Decide them before you write the preview.</p>
              <ul className="build-lines" role="list">
                {latestPlan.plan.questions.map((q, i) => (
                  <li key={i}>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {latestPlan?.plan?.assumptions && latestPlan.plan.assumptions.length > 0 && (
            <div>
              <p className="admin-label">Assumptions made</p>
              <ul className="build-lines" role="list">
                {latestPlan.plan.assumptions.map((a, i) => (
                  <li key={i}>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="admin-actions">
            <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run("plan", { action: "plan", briefId: row.id }, "Plan drafted.")}>
              {busy === "plan" ? "Planning…" : latestPlan ? "Make a new plan" : "Make the plan"}
            </button>
            <button type="button" className="btn btn--secondary" disabled={busy !== null || !latestPlan} onClick={() => void run("preview", { action: "preview", briefId: row.id, change: change || undefined }, "Preview drafted.")}>
              {busy === "preview" ? "Writing pages…" : "Write the preview"}
            </button>
          </div>
          {openChanges.length > 0 && (
            <label className="acct-label">
              Apply a customer change
              <select className="acct-input" value={change} onChange={(e) => setChange(e.target.value)}>
                <option value="">None</option>
                {openChanges.map((r) => (
                  <option key={r.id} value={r.request}>{`Change ${r.number}: ${r.request.slice(0, 60)}`}</option>
                ))}
              </select>
            </label>
          )}
          {latestPlan && <p className="acct-meta">Plan {latestPlan.version} · {pence(latestPlan.cost_pence)} · {latestPlan.model}</p>}
          {siteBuilds.length > 0 && (
            <div className="stack" style={{ "--stack": "var(--space-2)" } as React.CSSProperties}>
              <p className="admin-label">Template site</p>
              <label className="acct-label">
                Change for the next version
                <input className="acct-input" value={siteChange} maxLength={1000} onChange={(e) => setSiteChange(e.target.value)} />
              </label>
              <div className="admin-actions">
                <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run("site", { action: "site", briefId: row.id, change: siteChange || undefined }, "Site written again.")}>
                  {busy === "site" ? "Writing…" : "Write it again"}
                </button>
              </div>
              <ul className="build-revisions" role="list">
                {siteBuilds.map((b) => (
                  <li key={b.id}>
                    <p className="build-revision__head">
                      <strong>Site {b.version}</strong>
                      <span className="build-revision__status">{b.status === "released" ? "With the customer" : b.status === "draft" ? "Draft" : "Withdrawn"}</span>
                      {!b.checks_ok && <span className="build-revision__status">Failed checks</span>}
                      <span className="acct-meta">{pence(b.cost_pence)}</span>
                    </p>
                    {b.change_note && <p className="acct-meta">Change: {b.change_note}</p>}
                    <div className="admin-actions">
                      <button type="button" className="linkbtn" onClick={() => void openSiteBuild(b.id)}>View</button>
                      {b.status === "draft" && (
                        <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => releaseSite(b)}>
                          Release to the customer
                        </button>
                      )}
                      {b.status === "released" && (
                        <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run(`withdraw-site-${b.id}`, { action: "site-withdraw", buildId: b.id }, "Taken back.")}>
                          Withdraw
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {previews.length > 0 && (
            <ul className="build-revisions" role="list">
              {previews.map((p) => (
                <li key={p.id}>
                  <p className="build-revision__head">
                    <strong>Preview {p.version}</strong>
                    <span className="build-revision__status">{p.status === "released" ? "With the customer" : p.status === "draft" ? "Draft" : "Withdrawn"}</span>
                    <span className="acct-meta">{pence(p.cost_pence)}</span>
                  </p>
                  {p.change_note && <p className="acct-meta">Change: {p.change_note}</p>}
                  <div className="admin-actions">
                    <button type="button" className="linkbtn" onClick={() => void openPreview(p.id)}>View</button>
                    {p.status !== "released" && p.status !== "withdrawn" && (
                      <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run(`release-${p.id}`, { action: "release", previewId: p.id }, "Released to the customer.")}>
                        Release to the customer
                      </button>
                    )}
                    {p.status === "released" && (
                      <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run(`withdraw-${p.id}`, { action: "withdraw", previewId: p.id }, "Taken back.")}>
                        Withdraw
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "acct-meta" : "field-error"}>{message.text}</p>}
    </div>
  );
}
