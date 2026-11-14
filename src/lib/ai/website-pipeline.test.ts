import { describe, expect, it } from "vitest";
import { EMPTY_BRIEF } from "@/lib/website-brief";
import { ProviderError, type AiProvider, type ProviderResponse } from "./provider";
import { generatePlan, generatePreview, type StoredPlan, type WebsiteAiStore } from "./website-pipeline";

const plan = {
  summary: "A bakery site.",
  tone: "Warm",
  pages: [
    { slug: "home", title: "Home", purpose: "Welcome", sections: [{ kind: "hero" as const, heading: "Fresh bread", points: [] }] },
    { slug: "menu", title: "Menu", purpose: "Menu", sections: [{ kind: "services" as const, heading: "What we bake", points: [] }] },
  ],
  seo: { siteTitle: "Harbour Bakery", description: "Bread." },
  assumptions: [],
  questions: [],
};
const content = (headline: string) => JSON.stringify({ headline, intro: "Hello", sections: [{ heading: "A", body: "B", bullets: [] }], cta: "Call" });

function fakeProvider(replies: Array<string | ProviderError>, cost = 10): AiProvider & { calls: number } {
  let i = 0;
  const p = {
    name: "fake",
    model: "fake-1",
    calls: 0,
    async complete(): Promise<ProviderResponse> {
      p.calls++;
      const next = replies[Math.min(i++, replies.length - 1)];
      if (next instanceof ProviderError) throw next;
      return { kind: "final", text: next, usage: { inputTokens: 1, outputTokens: 1, costPence: cost } };
    },
  };
  return p;
}

function fakeStore(spent = 0) {
  const saved = { plans: [] as unknown[], previews: [] as unknown[] };
  const store: WebsiteAiStore = {
    spentPence: async () => spent,
    latestPlan: async () => null,
    savePlan: async (_b, d) => {
      saved.plans.push(d);
      return { id: "plan1", version: 1, plan: d.plan };
    },
    savePreview: async (_b, d) => {
      saved.previews.push(d);
      return { id: "prev1", version: 1 };
    },
  };
  return { store, saved };
}

const input = { businessName: "Harbour Bakery", packageName: "Core", pagesAllowed: 3, brief: EMPTY_BRIEF };

describe("generatePlan", () => {
  it("saves a valid plan as a draft and reports the cost", async () => {
    const { store, saved } = fakeStore();
    const r = await generatePlan({ provider: fakeProvider([JSON.stringify(plan)]), store, briefId: "b", maxPence: 300 }, input);
    expect(r.ok).toBe(true);
    expect(r.costPence).toBe(10);
    expect(saved.plans).toHaveLength(1);
  });
  it("asks again when the first reply is the wrong shape, then fails after three tries", async () => {
    const { store, saved } = fakeStore();
    const provider = fakeProvider(["nonsense"]);
    const r = await generatePlan({ provider, store, briefId: "b", maxPence: 300 }, input);
    expect(r.ok).toBe(false);
    expect(provider.calls).toBe(3);
    expect(saved.plans).toHaveLength(0);
  });
  it("recovers when the second reply is good", async () => {
    const { store } = fakeStore();
    const r = await generatePlan({ provider: fakeProvider(["bad", JSON.stringify(plan)]), store, briefId: "b", maxPence: 300 }, input);
    expect(r.ok).toBe(true);
  });
  it("never starts a call once the spending limit is reached", async () => {
    const { store } = fakeStore(300);
    const provider = fakeProvider([JSON.stringify(plan)]);
    const r = await generatePlan({ provider, store, briefId: "b", maxPence: 300 }, input);
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("spending limit") });
    expect(provider.calls).toBe(0);
  });
  it("explains a refused key and a busy service without exposing details", async () => {
    const { store } = fakeStore();
    const a = await generatePlan({ provider: fakeProvider([new ProviderError("x", "authentication")]), store, briefId: "b", maxPence: 300 }, input);
    const t = await generatePlan({ provider: fakeProvider([new ProviderError("x", "transient")]), store, briefId: "b", maxPence: 300 }, input);
    expect(a).toMatchObject({ ok: false, reason: expect.stringContaining("refused our key") });
    expect(t).toMatchObject({ ok: false, reason: expect.stringContaining("busy") });
  });
});

describe("generatePreview", () => {
  const stored: StoredPlan = { id: "plan1", version: 1, plan };
  it("writes every page and saves one preview", async () => {
    const { store, saved } = fakeStore();
    const r = await generatePreview({ provider: fakeProvider([content("Home"), content("Menu")]), store, briefId: "b", maxPence: 300 }, { businessName: "H", brief: EMPTY_BRIEF, plan: stored, change: "shorter" });
    expect(r.ok).toBe(true);
    expect(r.costPence).toBe(20);
    expect(saved.previews).toHaveLength(1);
    expect((saved.previews[0] as { pages: unknown[]; changeNote: string }).pages).toHaveLength(2);
    expect((saved.previews[0] as { changeNote: string }).changeNote).toBe("shorter");
  });
  it("saves nothing if any page fails", async () => {
    const { store, saved } = fakeStore();
    const r = await generatePreview({ provider: fakeProvider([content("Home"), "bad"]), store, briefId: "b", maxPence: 300 }, { businessName: "H", brief: EMPTY_BRIEF, plan: stored });
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("Menu") });
    expect(saved.previews).toHaveLength(0);
  });
  it("stops part-way when the limit is reached", async () => {
    const { store, saved } = fakeStore(295);
    const r = await generatePreview({ provider: fakeProvider([content("Home"), content("Menu")], 10), store, briefId: "b", maxPence: 300 }, { businessName: "H", brief: EMPTY_BRIEF, plan: stored });
    expect(r.ok).toBe(false);
    expect(saved.previews).toHaveLength(0);
  });
});
