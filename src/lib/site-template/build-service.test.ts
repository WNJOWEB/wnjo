import { beforeEach, describe, expect, it } from "vitest";
import type { AiProvider } from "@/lib/ai/provider";
import type { Staff } from "@/lib/staff-auth";
import { EMPTY_BRIEF } from "@/lib/website-brief";
import { DEFAULT_WEBSITE_ANSWERS } from "@/lib/website-quote";
import type { RawAnswers } from "./answers";
import { releaseSiteBuild, runSiteBuildStep, withdrawSiteBuild } from "./build-service";

type Write = { table: string; op: string; payload: unknown; eq: Record<string, unknown> };
let writes: Write[] = [];
let brief: Record<string, unknown>;
let buildRow: Record<string, unknown> | null;
let enquiry: Record<string, unknown> | null;

function builder(table: string) {
  let op = "select";
  let payload: unknown;
  const eq: Record<string, unknown> = {};
  const b: Record<string, unknown> = {};
  for (const m of ["select", "order", "limit", "in"]) b[m] = () => b;
  b.eq = (k: string, v: unknown) => ((eq[k] = v), b);
  b.insert = (p: unknown) => ((op = "insert"), (payload = p), b);
  b.update = (p: unknown) => ((op = "update"), (payload = p), b);
  b.maybeSingle = async () => ({ data: table === "website_briefs" ? brief : table === "website_site_builds" ? buildRow : table === "enquiries" ? enquiry : null, error: null });
  b.single = async () => {
    writes.push({ table, op, payload, eq });
    return { data: { id: `${table}-1` }, error: null };
  };
  b.then = (res: (v: unknown) => unknown) => {
    if (op !== "select") writes.push({ table, op, payload, eq });
    return Promise.resolve({ data: op === "update" ? [{ id: "x" }] : [], error: null }).then(res);
  };
  return b;
}
const db = { from: builder } as never;
const staff: Staff = { userId: "u1", email: "staff@winjo.test", tenantId: "t1", role: "staff" };
const writesTo = (table: string) => writes.filter((w) => w.table === table);

const week = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => (day === "Sun" ? { day, closed: true } : { day, open: "09:00", close: "18:00" }));
const answers: RawAnswers = { businessName: "Hartley & Sons", servicesText: "Cut & style £22\nBeard trim", about: "A family barber shop.", hours: week, email: "book@hartley.example", phone: "01632 960123", address: "12 High Street, Leeds" };
const copy = {
  tagline: "Barbers in Leeds",
  hero: { headline: "Sharp cuts on High Street", intro: "Walk-ins and bookings.", cta: "Request a booking" },
  headings: { services: "Prices", hours: "Hours", gallery: "Shop", area: "Find us", enquiry: "Request a booking", faq: "Questions" },
  descriptions: {},
  area: "We are at 12 High Street, Leeds.",
  enquiry: { intro: "Tell us when suits.", cta: "Send request" },
  faq: [],
  closing: { headline: "Ready?", cta: "Request a booking" },
};
const provider: AiProvider = { name: "fake", model: "m", complete: async () => ({ kind: "final", text: JSON.stringify(copy), usage: { inputTokens: 1, outputTokens: 1, costPence: 3 } }) };

beforeEach(() => {
  writes = [];
  buildRow = null;
  enquiry = null;
  brief = { id: "b1", tenant_id: "t1", reference: "WNJO-ABC123", email: "owner@shop.co.uk", name: "Sam", business_name: "Hartley & Sons", stage: "building", brief: EMPTY_BRIEF, figures: {} };
});

describe("the site build step", () => {
  it("saves a draft build in the staff member's agency, without moving the stage or showing anything to the customer", async () => {
    const r = await runSiteBuildStep(db, staff, provider, "b1", { sector: "barber", answers });
    expect(r).toMatchObject({ ok: true, version: 1, checksOk: true, costPence: 3 });
    const saved = writesTo("website_site_builds")[0].payload as Record<string, unknown>;
    expect(saved).toMatchObject({ tenant_id: "t1", brief_id: "b1", sector: "barber", checks_ok: true, cost_pence: 3 });
    expect(saved.status).toBeUndefined();
    expect(writesTo("website_briefs")).toEqual([]);
    expect(writesTo("website_brief_events").map((w) => (w.payload as { kind: string }).kind)).toEqual(["ai"]);
  });

  describe("the plan from the customer's quote", () => {
    const quoted = (pages: string) => ({ answers: { type: "website", answers: { ...DEFAULT_WEBSITE_ANSWERS, mode: "oneOff", pages } } });
    const capturing = () => {
      const prompts: string[] = [];
      const p: AiProvider = { name: "fake", model: "m", complete: async ({ messages }) => (prompts.push(messages[0].content), { kind: "final", text: JSON.stringify(copy), usage: { inputTokens: 1, outputTokens: 1, costPence: 1 } }) };
      return { p, prompts };
    };

    it("leaves the facts strip and the FAQ out of the brief for an Essential quote", async () => {
      enquiry = quoted("4-5");
      const { p, prompts } = capturing();
      await runSiteBuildStep(db, staff, p, "b1", { sector: "barber", answers });
      expect(prompts[0]).not.toContain("- facts");
      expect(prompts[0]).not.toContain("- faq");
    });

    it("keeps every section for a Professional quote", async () => {
      enquiry = quoted("6-10");
      const { p, prompts } = capturing();
      await runSiteBuildStep(db, staff, p, "b1", { sector: "barber", answers });
      expect(prompts[0]).toContain("- facts");
      expect(prompts[0]).toContain("- faq");
    });

    it("keeps every section when there is no quote, so nothing is taken away", async () => {
      const { p, prompts } = capturing();
      await runSiteBuildStep(db, staff, p, "b1", { sector: "barber", answers });
      expect(prompts[0]).toContain("- facts");
      expect(prompts[0]).toContain("- faq");
    });
  });

  it("moves a paid build waiting at specification on to building, as the plan step does", async () => {
    brief = { ...brief, stage: "specification" };
    await runSiteBuildStep(db, staff, provider, "b1", { sector: "barber", answers });
    expect(writesTo("website_briefs")[0].payload).toEqual({ stage: "building" });
  });

  it("does nothing before the customer has paid", async () => {
    brief = { ...brief, stage: "proposal" };
    expect(await runSiteBuildStep(db, staff, provider, "b1", { sector: "barber", answers })).toMatchObject({ ok: false, status: 409 });
    expect(writes).toEqual([]);
  });

  it("reports answers that need fixing as a 422 and writes no build", async () => {
    const r = await runSiteBuildStep(db, staff, provider, "b1", { sector: "barber", answers: { ...answers, businessName: "" } });
    expect(r).toMatchObject({ ok: false, status: 422 });
    expect(writesTo("website_site_builds")).toEqual([]);
  });
});

describe("releasing a site build", () => {
  it("releases a passing draft and moves the build to customer review", async () => {
    buildRow = { id: "s1", brief_id: "b1", status: "draft", checks_ok: true };
    const r = await releaseSiteBuild(db, staff, "s1");
    expect(r).toMatchObject({ ok: true, stage: "preview", email: "owner@shop.co.uk" });
    const updates = writesTo("website_site_builds").map((w) => w.payload as { status: string; released_by?: string });
    expect(updates.map((u) => u.status)).toEqual(["withdrawn", "released"]);
    expect(updates[1].released_by).toBe("u1");
    expect(writesTo("website_briefs")[0].payload).toEqual({ stage: "preview" });
  });

  it("refuses a build that failed the checks unless a person overrides, and records the override", async () => {
    buildRow = { id: "s1", brief_id: "b1", status: "draft", checks_ok: false };
    expect(await releaseSiteBuild(db, staff, "s1")).toMatchObject({ ok: false, status: 409 });
    expect(writes).toEqual([]);
    expect(await releaseSiteBuild(db, staff, "s1", true)).toMatchObject({ ok: true });
    expect(writesTo("website_brief_events").some((w) => (w.payload as { detail: { override?: boolean } }).detail.override === true)).toBe(true);
  });

  it("won't release one already with the customer", async () => {
    buildRow = { id: "s1", brief_id: "b1", status: "released", checks_ok: true };
    expect(await releaseSiteBuild(db, staff, "s1")).toMatchObject({ ok: false, status: 409 });
  });

  it("withdraws only a released build", async () => {
    buildRow = { id: "s1", brief_id: "b1", status: "draft", checks_ok: true };
    expect(await withdrawSiteBuild(db, staff, "s1")).toMatchObject({ ok: false, status: 409 });
    buildRow = { id: "s1", brief_id: "b1", status: "released", checks_ok: true };
    expect(await withdrawSiteBuild(db, staff, "s1")).toMatchObject({ ok: true });
  });
});
