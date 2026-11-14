import { describe, expect, it } from "vitest";
import type { AiProvider, ProviderResponse } from "@/lib/ai/provider";
import type { RawAnswers } from "./answers";
import { buildSite, type SiteBuildDraft, type SiteBuildStore } from "./build";

const week = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => (day === "Sun" ? { day, closed: true } : { day, open: "09:00", close: "18:00" }));
const answers: RawAnswers = {
  businessName: "Hartley & Sons",
  servicesText: "Cut & style £22\nSkin fade £20\nBeard trim",
  about: "A family barber shop on the high street.",
  hours: week,
  email: "book@hartley.example",
  phone: "01632 960123",
  address: "12 High Street, Leeds",
  highlights: ["walk-ins"],
};

const copy = {
  tagline: "Barbers in Leeds",
  hero: { headline: "Sharp cuts on High Street", intro: "Walk-ins and bookings at Hartley & Sons.", cta: "Request a booking" },
  headings: { services: "Cuts and prices", hours: "Opening hours", gallery: "The shop", area: "Find us", enquiry: "Request a booking", faq: "Questions" },
  descriptions: {},
  area: "We are at 12 High Street, Leeds.",
  enquiry: { intro: "Tell us when suits.", cta: "Send request" },
  faq: [],
  closing: { headline: "Ready for a fresh cut?", cta: "Request a booking" },
};

const final = (obj: unknown, costPence = 1): ProviderResponse => ({ kind: "final", text: JSON.stringify(obj), usage: { inputTokens: 0, outputTokens: 0, costPence } });

function provider(replies: ProviderResponse[]): AiProvider & { prompts: string[] } {
  const prompts: string[] = [];
  return { name: "fake", model: "fake-1", prompts, async complete({ messages }) { prompts.push(messages[0].content); return replies.shift()!; } };
}

function memoryStore(spent = 0) {
  const saved: SiteBuildDraft[] = [];
  const store: SiteBuildStore = {
    async spentPence() { return spent; },
    async latest() { const l = saved[saved.length - 1]; return l ? { id: `b${saved.length}`, version: saved.length, sector: l.sector, answers: l.answers } : null; },
    async save(_id, draft) { saved.push(draft); return { id: `b${saved.length}`, version: saved.length }; },
  };
  return Object.assign(store, { saved });
}

const run = (p: AiProvider, store: SiteBuildStore, input: Parameters<typeof buildSite>[1], maxPence = 300) => buildSite({ provider: p, store, briefId: "brief", maxPence }, input);

describe("buildSite", () => {
  it("builds from answers, saves a passing draft, and records cost and model", async () => {
    const store = memoryStore();
    const r = await run(provider([final(copy, 2)]), store, { sector: "barber", answers });
    expect(r).toMatchObject({ ok: true, version: 1, checksOk: true, issues: [], costPence: 2 });
    expect(store.saved[0]).toMatchObject({ sector: "barber", checksOk: true, provider: "fake", model: "fake-1", costPence: 2 });
    expect(store.saved[0].content.business.name).toBe("Hartley & Sons");
  });

  it("builds a smaller site at Essential: the writer is not asked for the facts strip or the FAQ", async () => {
    const p = provider([final(copy)]);
    const store = memoryStore();
    const r = await run(p, store, { sector: "barber", answers, plan: "essential" });
    expect(r).toMatchObject({ ok: true, checksOk: true });
    expect(p.prompts[0]).not.toContain("- faq");
    const kinds = store.saved[0].content.sections.map((s) => s.kind);
    expect(kinds).not.toContain("facts");
    expect(kinds).not.toContain("faq");
  });

  it("keeps every section when no plan is given", async () => {
    const p = provider([final(copy)]);
    await run(p, memoryStore(), { sector: "barber", answers });
    expect(p.prompts[0]).toContain("- faq");
  });

  it("uses uploaded photographs for the hero and gallery, and leaves logos out", async () => {
    const store = memoryStore();
    const files = [
      { path: "drafts/d/logo.png", name: "logo.png", size: 1, type: "image/png" },
      { path: "drafts/d/shop.jpg", name: "shop.jpg", size: 1, type: "image/jpeg" },
      { path: "drafts/d/chair.jpg", name: "chair.jpg", size: 1, type: "image/jpeg" },
    ];
    await run(provider([final(copy)]), store, { sector: "barber", answers, files });
    const sections = store.saved[0].content.sections;
    expect(sections[0]).toMatchObject({ kind: "hero", variant: "photo", image: "brief-file:drafts/d/shop.jpg" });
    const gallery = sections.find((s) => s.kind === "gallery");
    expect(gallery && gallery.kind === "gallery" && gallery.images.map((i) => i.src)).toEqual(["brief-file:drafts/d/chair.jpg"]);
  });

  it("reruns a revision from the last build's answers, with the change note", async () => {
    const store = memoryStore();
    await run(provider([final(copy)]), store, { sector: "barber", answers });
    const p = provider([final(copy)]);
    const r = await run(p, store, { change: "Make it friendlier" });
    expect(r).toMatchObject({ ok: true, version: 2 });
    expect(p.prompts[0]).toContain("Make it friendlier");
    expect(store.saved[1]).toMatchObject({ changeNote: "Make it friendlier", answers });
  });

  it("will not build without answers", async () => {
    const r = await run(provider([]), memoryStore(), {});
    expect(r).toMatchObject({ ok: false, reason: "There are no answers to build from yet." });
  });

  it("rejects an unknown sector without calling the model", async () => {
    const p = provider([]);
    expect(await run(p, memoryStore(), { sector: "plumber", answers })).toMatchObject({ ok: false, reason: expect.stringContaining("plumber") });
    expect(p.prompts).toHaveLength(0);
  });

  it("returns the answer errors and does not call the model", async () => {
    const p = provider([]);
    const r = await run(p, memoryStore(), { sector: "barber", answers: { ...answers, businessName: "", phone: "", email: "" } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors ?? {})).toContain("businessName");
    expect(p.prompts).toHaveLength(0);
  });

  it("saves a build that fails the checks, marked failed with its reasons, for the owner to review", async () => {
    const store = memoryStore();
    const bad = { ...copy, hero: { headline: "Your headline here", intro: "x", cta: "y" } };
    const r = await run(provider([final(bad), final(bad)]), store, { sector: "barber", answers });
    expect(r).toMatchObject({ ok: true, checksOk: false });
    expect(store.saved[0].checksOk).toBe(false);
    expect(store.saved[0].issues.some((i) => i.code === "placeholder")).toBe(true);
  });

  it("still saves a draft when the AI gives nothing usable: our own wording and the customer's words, marked failed for a person", async () => {
    const store = memoryStore();
    const junk: ProviderResponse = { kind: "final", text: "no json", usage: { inputTokens: 0, outputTokens: 0, costPence: 1 } };
    const r = await run(provider([junk, junk]), store, { sector: "barber", answers });
    expect(r).toMatchObject({ ok: true, checksOk: false });
    expect(store.saved).toHaveLength(1);
    expect(store.saved[0].checksOk).toBe(false);
    const hero = store.saved[0].content.sections.find((s) => s.kind === "hero");
    expect(hero).toMatchObject({ headline: "Barbers in Leeds", intro: "A family barber shop on the high street.", cta: "Request a booking" });
    expect(store.saved[0].content.sections.map((s) => s.kind)).toEqual(expect.arrayContaining(["hero", "services", "hours", "enquiry", "cta"]));
  });

  it("completes a site from a reply that gives only a headline and an intro, with our own wording for the rest", async () => {
    const store = memoryStore();
    const minimal = { hero: { headline: "Sharp cuts on High Street", intro: "Walk-ins and bookings at Hartley & Sons." } };
    const r = await run(provider([final(minimal)]), store, { sector: "barber", answers });
    expect(r).toMatchObject({ ok: true, checksOk: true, issues: [] });
    const kinds = store.saved[0].content.sections.map((s) => s.kind);
    expect(kinds).toEqual(["hero", "services", "hours", "facts", "area", "enquiry", "cta"]);
    const enquiry = store.saved[0].content.sections.find((s) => s.kind === "enquiry");
    expect(enquiry).toMatchObject({ heading: "Request a booking", cta: "Send request" });
  });

  it("asks the model for only the short reply, with a style example and no headings or button labels", async () => {
    const p = provider([final(copy)]);
    await run(p, memoryStore(), { sector: "barber", answers });
    expect(p.prompts[0]).toContain("Style example");
    expect(p.prompts[0]).toContain("Sharp cuts on [street]");
    expect(p.prompts[0]).not.toContain('"headings"');
    expect(p.prompts[0]).not.toContain('"closing"');
  });

  it("respects the website's spending limit, counting spend from other steps", async () => {
    const p = provider([]);
    const r = await run(p, memoryStore(300), { sector: "barber", answers });
    expect(r.ok).toBe(false);
    expect(p.prompts).toHaveLength(0);
  });
});
