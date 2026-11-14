import { describe, expect, it, vi } from "vitest";

const steps: string[] = [];
vi.mock("./website-ai-service", () => ({
  runPlanStep: async (_d: unknown, actor: { kind: string }) => (steps.push(`plan:${actor.kind}`), { ok: true, version: 1, costPence: 1 }),
  runPreviewStep: async () => (steps.push("preview"), { ok: true, version: 1, costPence: 1 }),
}));

vi.mock("@/lib/site-template/build-service", () => ({
  runSiteBuildStep: async (_d: unknown, actor: { kind: string }, _p: unknown, _id: string, input: { sector?: string }) => (steps.push(`site:${actor.kind}:${input.sector}`), { ok: true, version: 1, checksOk: true, issues: 0, costPence: 1 }),
}));

import { runAutoDrafts } from "./website-auto";

const withGoals = { goals: ["bookings"] };
const week = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => (day === "Sun" ? { day, closed: true } : { day, open: "09:00", close: "18:00" }));
const siteAnswers = { sector: "barber", answers: { businessName: "Hartley & Sons", servicesText: "Cut £20", about: "A family barber shop.", hours: week, email: "book@hartley.example", phone: "01632 960123" } };
const fakeDb = (briefs: { id: string; tenant_id: string; brief?: { goals: string[]; site?: unknown } }[], withPlan: string[] = [], withSite: string[] = []) =>
  ({
    from: (table: string) => {
      let id = "";
      const b: Record<string, unknown> = {};
      for (const m of ["select", "order", "limit"]) b[m] = () => b;
      b.eq = (k: string, v: string) => (k === "brief_id" && (id = v), b);
      b.maybeSingle = async () => ({ data: (table === "website_site_builds" ? withSite : withPlan).includes(id) ? { id: "p" } : null });
      b.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: table === "website_briefs" ? briefs : [] }).then(res);
      return b;
    },
  }) as never;

describe("automatic first drafts", () => {
  it("does nothing without a Grok key", async () => {
    steps.length = 0;
    expect(await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: withGoals }]), null)).toEqual({ attempted: 0, drafted: 0 });
    expect(steps).toEqual([]);
  });

  it("drafts the plan then the preview for a paid website with no plan, as the system", async () => {
    steps.length = 0;
    const provider = { name: "x", model: "m", complete: async () => ({ kind: "final" as const, text: "", usage: { inputTokens: 0, outputTokens: 0, costPence: 0 } }) };
    expect(await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: withGoals }]), provider)).toEqual({ attempted: 1, drafted: 1 });
    expect(steps).toEqual(["plan:system", "preview"]);
  });

  it("waits for a website paid for through the short checkout until its goals are in", async () => {
    steps.length = 0;
    const provider = { name: "x", model: "m", complete: async () => ({ kind: "final" as const, text: "", usage: { inputTokens: 0, outputTokens: 0, costPence: 0 } }) };
    const r = await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: { goals: [] } }]), provider);
    expect(r).toEqual({ attempted: 0, drafted: 0 });
    expect(steps).toEqual([]);
  });

  it("skips a website that already has a plan, and stops at the limit", async () => {
    steps.length = 0;
    const provider = { name: "x", model: "m", complete: async () => ({ kind: "final" as const, text: "", usage: { inputTokens: 0, outputTokens: 0, costPence: 0 } }) };
    const briefs = [{ id: "b1", tenant_id: "t", brief: withGoals }, { id: "b2", tenant_id: "t", brief: withGoals }, { id: "b3", tenant_id: "t", brief: withGoals }, { id: "b4", tenant_id: "t", brief: withGoals }];
    const r = await runAutoDrafts(fakeDb(briefs, ["b1"]), provider, 2);
    expect(r.attempted).toBe(2);
    expect(steps.filter((s) => s.startsWith("plan"))).toHaveLength(2);
  });

  it("builds a template site, instead of a plan, for a brief with complete sector answers", async () => {
    steps.length = 0;
    const provider = { name: "x", model: "m", complete: async () => ({ kind: "final" as const, text: "", usage: { inputTokens: 0, outputTokens: 0, costPence: 0 } }) };
    const r = await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: { goals: [], site: siteAnswers } }]), provider);
    expect(r).toEqual({ attempted: 1, drafted: 1 });
    expect(steps).toEqual(["site:system:barber"]);
  });

  it("leaves a template brief alone until its answers are complete, and once it has a build", async () => {
    steps.length = 0;
    const provider = { name: "x", model: "m", complete: async () => ({ kind: "final" as const, text: "", usage: { inputTokens: 0, outputTokens: 0, costPence: 0 } }) };
    const half = { sector: "barber", answers: { businessName: "Hartley & Sons" } };
    const briefs = [
      { id: "b1", tenant_id: "t", brief: { goals: [], site: half } },
      { id: "b2", tenant_id: "t", brief: { goals: [], site: siteAnswers } },
    ];
    expect(await runAutoDrafts(fakeDb(briefs, [], ["b2"]), provider)).toEqual({ attempted: 0, drafted: 0 });
    expect(steps).toEqual([]);
  });
});
