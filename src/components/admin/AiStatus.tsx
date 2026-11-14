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

type ModelLine = { label: string; text: string };
type TestSite = { business: string; passed: boolean; content: SiteContent | null; facts: { services: { name: string; price?: string }[]; phone?: string; email?: string; address?: string; areas?: string[] }; modelLines: ModelLine[]; issues: string[] };
type TemplateTestRow = { template: string; passed: number; runs: number; pencePerSite: number; problems: string[]; sites: TestSite[] };
type TemplateTestResult = { model: string; rows: TemplateTestRow[] };

/**
 * Tests one template at a time: pick it, run it, then open each business it wrote. A site shows as a customer would
 * see it, on a phone or on a desktop, with what the customer gave and the lines the model wrote beside it. Each site
 * can be rated, and the rating is saved, so models can be compared later.
 */
function TemplateTest({ client }: { client: SupabaseClient }) {
  const [template, setTemplate] = useState(TEMPLATE_IDS[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TemplateTestRow | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [openSite, setOpenSite] = useState<number | null>(null);
  const [view, setView] = useState<"phone" | "desktop">("phone");
  const [rated, setRated] = useState<Record<number, string>>({});
  const [ratingNote, setRatingNote] = useState("");

  const tokenOrNull = async () => (await client.auth.getSession()).data.session?.access_token ?? null;

  const run = async () => {
    setRunning(true);
    setNote(null);
    setResult(null);
    setOpenSite(null);
    setRated({});
    const token = await tokenOrNull();
    if (!token) {
      setRunning(false);
      setNote("Sign in again, then run the test.");
      return;
    }
    const res = await fetch("/api/admin/ai/template-test", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ runs: 1, template }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => null)) as (TemplateTestResult & { error?: string }) | null) : null;
    setRunning(false);
    if (res?.ok && body && !body.error && body.rows[0]) {
      setModel(body.model);
      setResult(body.rows[0]);
    } else {
      setNote(body?.error ?? "The test couldn't run. Please try again.");
    }
  };

  const rate = async (index: number, site: TestSite, rating: "good" | "needs_work") => {
    const token = await tokenOrNull();
    if (!token) return setNote("Sign in again to save your rating.");
    const res = await fetch("/api/admin/ai/template-test", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "rate", template, business: site.business, rating, note: rating === "needs_work" ? ratingNote : undefined }),
    }).catch(() => null);
    if (res?.ok) {
      setRated((r) => ({ ...r, [index]: rating === "good" ? "Rated good" : "Rated needs work" }));
      setRatingNote("");
    } else {
      setNote("The rating couldn't be saved. Please try again.");
    }
  };

  const siteView = (site: TestSite) => {
    const f = site.facts;
    return (
      <>
        <p className="acct-meta">Placeholder photos: they show the layout, not the business.</p>
        <div className="admin-row-static">
          <p className="acct-label">What the customer gave</p>
          <ul className="admin-list" role="list">
            {f.services.map((x) => (
              <li key={x.name}>{x.price ? `${x.name}, ${x.price}` : x.name}</li>
            ))}
            {f.areas?.length ? <li>Areas: {f.areas.join(", ")}</li> : null}
            {f.phone ? <li>Phone: {f.phone}</li> : null}
            {f.email ? <li>Email: {f.email}</li> : null}
            {f.address ? <li>Address: {f.address}</li> : null}
          </ul>
        </div>
        {site.modelLines.length > 0 && (
          <div className="admin-row-static">
            <p className="acct-label">What the model wrote</p>
            <ul className="admin-list" role="list">
              {site.modelLines.map((line, n) => (
                <li key={n}>
                  <span className="acct-meta">{line.label}: </span>
                  {line.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ margin: "0.75rem 0", display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn--secondary" aria-pressed={view === "phone"} onClick={() => setView("phone")}>
            Phone
          </button>
          <button type="button" className="btn btn--secondary" aria-pressed={view === "desktop"} onClick={() => setView("desktop")}>
            Desktop
          </button>
        </div>
        {site.content && (
          <div style={{ maxWidth: view === "phone" ? 390 : "100%", margin: "0 auto", border: "1px solid var(--color-line)", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
            <SiteRender content={site.content} />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="admin-row-static">
      <h3 className="acct-label">Template test</h3>
      <p className="acct-meta">Pick one template. It writes a website for each of its four made-up businesses, then you can open any of them.</p>
      <label className="acct-label" htmlFor="template-pick">Template</label>
      <select id="template-pick" className="input" value={template} onChange={(e) => setTemplate(e.target.value)} disabled={running}>
        {TEMPLATE_IDS.map((id) => (
          <option key={id} value={id}>
            {TEMPLATE_LABELS[id] ?? id}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn--secondary" onClick={run} disabled={running} style={{ marginTop: "0.75rem" }}>
        {running ? "Writing the websites…" : "Run the test for this template"}
      </button>
      {note && <p className="acct-meta">{note}</p>}
      {result && (
        <>
          <p className="acct-meta">
            {model}: {result.passed} of {result.runs} passed the checks. About {result.pencePerSite}p per site.
          </p>
          <ul className="admin-list" role="list">
            {result.sites.map((site, i) => (
              <li key={i} className="admin-row-static">
                <button type="button" className="arrow-link" aria-expanded={openSite === i} onClick={() => setOpenSite(openSite === i ? null : i)}>
                  {site.business} {site.passed ? "(passed)" : "(not passed)"}
                </button>
                {openSite === i && (
                  <div style={{ marginTop: "0.5rem" }}>
                    {!site.passed && site.issues.length > 0 && (
                      <p className="acct-meta">Why it didn&apos;t pass: {site.issues.join("; ")}</p>
                    )}
                    {siteView(site)}
                    <div className="admin-row-static">
                      <p className="acct-label">Your judgement</p>
                      {rated[i] ? (
                        <p className="acct-meta">{rated[i]}</p>
                      ) : (
                        <>
                          <input
                            className="input"
                            placeholder="What's wrong, if anything"
                            value={ratingNote}
                            onChange={(e) => setRatingNote(e.target.value)}
                            maxLength={500}
                          />
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                            <button type="button" className="btn btn--primary" onClick={() => rate(i, site, "good")}>
                              Good
                            </button>
                            <button type="button" className="btn btn--secondary" onClick={() => rate(i, site, "needs_work")}>
                              Needs work
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
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
