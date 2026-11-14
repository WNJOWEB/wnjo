"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nextBriefingAt, type Briefing } from "@/lib/briefing";
import { SECTOR_PRESETS } from "@/lib/site-template/presets";
import type { SiteContent } from "@/lib/site-template/schema";
import { SiteRender } from "@/components/site-template/SiteRender";

const TEMPLATE_LABELS: Record<string, string> = Object.fromEntries(Object.values(SECTOR_PRESETS).map((p) => [p.id, p.label]));
const TEMPLATE_IDS = Object.keys(SECTOR_PRESETS);

/**
 * The AI workforce: agents and their switches, recent tasks, budgets, and the approval queue. Owners and admins
 * can approve or reject high-risk actions, change the budget, and switch agents on, off or paused (through the
 * server, which records each change). Staff can see all of it but change nothing.
 */

type Agent = { agent_key: string; name: string; enabled: boolean; paused: boolean };
type Task = { id: string; agent_key: string; title: string; status: string; spent_pence: number; created_at: string };
type Budget = { scope: string; scope_id: string | null; monthly_limit_pence: number; warn_at_pence: number };
type ReportRow = { report_date: string; body: Briefing; generated_at: string };
type Approval = { id: string; task_id: string; tool: string; reason: string; arguments: Record<string, unknown>; created_at: string };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const pounds = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

type TestSite = { business: string; passed: boolean; content: SiteContent | null; issues: string[] };
type TemplateTestRow = { template: string; passed: number; runs: number; pencePerSite: number; problems: string[]; sites: TestSite[] };
type TemplateTestResult = {
  model: string;
  rows: TemplateTestRow[];
  passed: number;
  total: number;
  pencePerSite: number;
};

/** Writes every template with the configured model and shows how many sites pass, and what each costs. */
function TemplateTest({ client }: { client: SupabaseClient }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TemplateTestResult | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [openTemplate, setOpenTemplate] = useState<string | null>(null);
  const [openSite, setOpenSite] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setNote(null);
    setResult(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setRunning(false);
      setNote("Sign in again, then run the test.");
      return;
    }
    // One template per request, so no single call runs long enough to be cut off.
    const rows: TemplateTestResult["rows"] = [];
    let model = "";
    for (const id of TEMPLATE_IDS) {
      setProgress(`Writing ${TEMPLATE_LABELS[id] ?? id}, ${rows.length + 1} of ${TEMPLATE_IDS.length}…`);
      const res = await fetch("/api/admin/ai/template-test", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ runs: 1, template: id }),
      }).catch(() => null);
      const body = res ? ((await res.json().catch(() => null)) as (TemplateTestResult & { error?: string }) | null) : null;
      if (!res?.ok || !body || body.error) {
        setRunning(false);
        setProgress(null);
        setNote(body?.error ?? "The test stopped part way. Please try again.");
        return;
      }
      model = body.model;
      rows.push(...body.rows);
    }
    const passed = rows.reduce((n, r) => n + r.passed, 0);
    const total = rows.reduce((n, r) => n + r.runs, 0);
    const pence = rows.reduce((n, r) => n + r.pencePerSite * r.runs, 0);
    setResult({ model, rows, passed, total, pencePerSite: Math.round((pence / total) * 100) / 100 });
    setProgress(null);
    setRunning(false);
  };

  return (
    <div className="admin-row-static">
      <h3 className="acct-label">Template test</h3>
      <p className="acct-meta">
        Writes each template once with the AI and checks the site. It costs a fraction of a penny per template.
      </p>
      <button type="button" className="btn btn--secondary" onClick={run} disabled={running}>
        {running ? "Running…" : "Run the template test"}
      </button>
      {progress && <p className="acct-meta">{progress}</p>}
      {note && <p className="acct-meta">{note}</p>}
      {result && (
        <>
          <p className="acct-meta">
            {result.model}: {result.passed} of {result.total} sites passed the checks. About {result.pencePerSite}p per site.
          </p>
          <ul className="admin-list" role="list">
            {result.rows.map((r) => (
              <li key={r.template} className="admin-row-static">
                {r.template}: {r.passed}/{r.runs} passed, {r.pencePerSite}p
                {r.problems.length > 0 && <span className="acct-meta"> ({r.problems.join(", ")})</span>}
                {r.sites.length > 0 && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="arrow-link"
                      aria-expanded={openTemplate === r.template}
                      onClick={() => {
                        setOpenTemplate(openTemplate === r.template ? null : r.template);
                        setOpenSite(null);
                      }}
                    >
                      {openTemplate === r.template ? "Hide sites" : "Show sites"}
                    </button>
                  </>
                )}
                {openTemplate === r.template && (
                  <ul className="admin-list" role="list">
                    {r.sites.map((site, i) => {
                      const key = `${r.template}-${i}`;
                      return (
                        <li key={key} className="admin-row-static">
                          <button type="button" className="arrow-link" onClick={() => setOpenSite(openSite === key ? null : key)}>
                            {site.business} {site.passed ? "(passed)" : "(not passed)"}
                          </button>
                          {!site.passed && site.issues.length > 0 && <p className="acct-meta">{site.issues.join(", ")}</p>}
                          {openSite === key && site.content && (
                            <div className="template-preview" style={{ marginTop: "0.75rem", border: "1px solid var(--color-line)", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
                              <SiteRender content={site.content} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function AiStatus({ client }: { client: SupabaseClient }) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [error, setError] = useState(false);
  const [briefing, setBriefing] = useState<ReportRow | null | "loading">("loading");
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [manage, setManage] = useState<{ tenantId: string } | null>(null);
  const [settingsNote, setSettingsNote] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<{ monthly: string; warn: string } | null>(null);
  const [decisionNote, setDecisionNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadApprovals = () =>
    client
      .from("ai_approvals")
      .select("id, task_id, tool, reason, arguments, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => setApprovals(error ? null : ((data as Approval[]) ?? [])));

  useEffect(() => {
    loadApprovals();
    client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: roles } = await client
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", data.user.id)
        .in("role", ["owner", "admin"])
        .limit(1);
      const row = ((roles ?? []) as Array<{ tenant_id: string }>)[0];
      setManage(row ? { tenantId: row.tenant_id } : null);
    });
    // loadApprovals is stable for this client; reload when the client changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const decide = async (approval: Approval, decision: "approve" | "reject") => {
    setBusy(approval.id);
    setDecisionNote(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch(`/api/admin/approvals/${approval.id}`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ decision }),
        })
      : null;
    setBusy(null);
    if (res?.ok) {
      setDecisionNote(decision === "approve" ? `Approved ${approval.tool}. The task will run again shortly.` : `Rejected ${approval.tool}. The task has stopped.`);
      loadApprovals();
    } else if (res?.status === 409) {
      setDecisionNote("That request was already decided.");
      loadApprovals();
    } else {
      setDecisionNote("The decision couldn't be saved. Please try again.");
    }
  };

  useEffect(() => {
    client
      .from("ai_reports")
      .select("report_date, body, generated_at")
      .eq("kind", "morning_briefing")
      .order("report_date", { ascending: false })
      .limit(1)
      .then(({ data }) => setBriefing(((data as ReportRow[]) ?? [])[0] ?? null));
  }, [client]);

  const loadStatus = () =>
    Promise.all([
      client.from("ai_agents").select("agent_key, name, enabled, paused").order("agent_key"),
      client.from("ai_tasks").select("id, agent_key, title, status, spent_pence, created_at").order("created_at", { ascending: false }).limit(20),
      client.from("ai_budget_settings").select("scope, scope_id, monthly_limit_pence, warn_at_pence"),
    ]).then(([a, t, b]) => {
      setError(Boolean(a.error || t.error || b.error));
      setAgents(a.error ? null : ((a.data as Agent[]) ?? []));
      setTasks(t.error ? null : ((t.data as Task[]) ?? []));
      setBudgets(b.error ? null : ((b.data as Budget[]) ?? []));
    });

  useEffect(() => {
    loadStatus();
    // loadStatus only reads through this client; reload when the client changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const saveSettings = async (change: Record<string, unknown>, done: string) => {
    if (!manage) return;
    setSettingsNote(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/admin/ai/settings", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ tenantId: manage.tenantId, change }),
        })
      : null;
    if (res?.ok) {
      setSettingsNote(done);
      setBudgetDraft(null);
      loadStatus();
    } else {
      const body = res ? ((await res.json().catch(() => null)) as { reason?: string } | null) : null;
      setSettingsNote(body?.reason ?? "The change couldn't be saved. Please try again.");
    }
  };

  const saveBudget = () => {
    if (!budgetDraft) return;
    const monthly = Math.round(Number(budgetDraft.monthly) * 100);
    const warn = Math.round(Number(budgetDraft.warn) * 100);
    saveSettings({ action: "budget", monthlyPence: monthly, warnAtPence: warn }, "Budget saved. Agents can only spend within it.");
  };

  const agentState = (a: Agent) => (!a.enabled ? "off" : a.paused ? "paused" : "on");
  const setAgentState = (a: Agent, state: string) => {
    const enabled = state !== "off";
    const paused = state === "paused";
    saveSettings({ action: "agent", agentKey: a.agent_key, enabled, paused }, `${a.name} is now ${state === "off" ? "off" : state}.`);
  };

  if (error) return <p role="alert">The AI status couldn&apos;t be loaded.</p>;
  if (!agents || !tasks || !budgets) return <p className="lede">Loading…</p>;

  const global = budgets.find((b) => b.scope === "global");
  return (
    <div className="admin-stack">
      <p className="acct-meta">
        The global budget is {global ? pounds(global.monthly_limit_pence) : "not set (so no agent can spend)"} a month.
        {manage ? " You can change it below." : " Only owners and admins can change it."}
      </p>
      {settingsNote && <p role="status" className="acct-meta">{settingsNote}</p>}

      {manage && (
        <div className="admin-stack">
          <h3 className="acct-label">Monthly budget</h3>
          {budgetDraft ? (
            <form className="admin-form" onSubmit={(e) => { e.preventDefault(); saveBudget(); }}>
              <label className="acct-label">
                Monthly limit (£)
                <input className="acct-input" inputMode="decimal" value={budgetDraft.monthly} onChange={(e) => setBudgetDraft({ ...budgetDraft, monthly: e.target.value })} />
              </label>
              <label className="acct-label">
                Warn me at (£)
                <input className="acct-input" inputMode="decimal" value={budgetDraft.warn} onChange={(e) => setBudgetDraft({ ...budgetDraft, warn: e.target.value })} />
              </label>
              <div className="admin-actions">
                <button type="submit" className="btn btn--primary">Save budget</button>
                <button type="button" className="btn btn--secondary" onClick={() => setBudgetDraft(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() =>
                setBudgetDraft({
                  monthly: String((global?.monthly_limit_pence ?? 0) / 100),
                  warn: String((global?.warn_at_pence ?? 0) / 100),
                })
              }
            >
              Change budget
            </button>
          )}
        </div>
      )}

      <TemplateTest client={client} />
      <h3 className="acct-label">Morning briefing</h3>
      {briefing === "loading" && <p className="acct-meta">Loading the briefing…</p>}
      {briefing === null && (
        <p className="acct-meta">No briefing yet. The next one is due at 07:30 London time, {when.format(nextBriefingAt(new Date()))}.</p>
      )}
      {briefing && briefing !== "loading" && (
        <div className="admin-stack">
          <p className="acct-meta">For {briefing.report_date}. Facts first, then suggestions.</p>
          <ul className="admin-list" aria-label="Facts">
            {briefing.body.facts.map((f, i) => <li key={`f${i}`} className="admin-row-static">{f.text}</li>)}
          </ul>
          <h4 className="acct-label">Suggested priorities</h4>
          <ul className="admin-list" aria-label="Recommendations">
            {briefing.body.recommendations.length === 0 && <li className="acct-meta">Nothing needs action today.</li>}
            {briefing.body.recommendations.map((r, i) => <li key={`r${i}`} className="admin-row-static">{r.text}</li>)}
          </ul>
        </div>
      )}

      <h3 className="acct-label">Waiting for approval</h3>
      {approvals === null && <p role="alert">The approval queue couldn&apos;t be loaded.</p>}
      {approvals && approvals.length === 0 && <p className="acct-meta">Nothing is waiting for an owner.</p>}
      {decisionNote && <p role="status" className="acct-meta">{decisionNote}</p>}
      {approvals && approvals.length > 0 && (
        <ul className="admin-list" aria-label="Approvals waiting">
          {approvals.map((a) => (
            <li key={a.id} className="admin-row-static">
              <span>
                {a.tool}
                <span className="acct-meta"> · {a.reason}</span>
              </span>
              <span className="acct-meta">{when.format(new Date(a.created_at))}</span>
              {manage && (
                <span className="admin-actions">
                  <button type="button" className="btn btn--primary" disabled={busy === a.id} onClick={() => decide(a, "approve")}>Approve</button>
                  <button type="button" className="btn btn--secondary" disabled={busy === a.id} onClick={() => decide(a, "reject")}>Reject</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="acct-label">Agents</h3>
      <ul className="admin-list">
        {agents.map((a) => (
          <li key={a.agent_key} className="admin-row-static">
            <span>{a.name}</span>
            {manage ? (
              <select
                aria-label={`${a.name} state`}
                className="acct-input"
                value={agentState(a)}
                onChange={(e) => setAgentState(a, e.target.value)}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
                <option value="paused">Paused</option>
              </select>
            ) : (
              <span className="acct-meta">{!a.enabled ? "Off" : a.paused ? "Paused" : "On"}</span>
            )}
          </li>
        ))}
      </ul>

      <h3 className="acct-label">Recent tasks</h3>
      {tasks.length === 0 && <p className="acct-meta">No tasks yet.</p>}
      <ul className="admin-list">
        {tasks.map((t) => (
          <li key={t.id} className="admin-row-static">
            <span>{t.title}</span>
            <span className="acct-meta">{t.agent_key} · {t.status} · {pounds(t.spent_pence)} · {when.format(new Date(t.created_at))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
