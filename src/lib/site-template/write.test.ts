import { describe, expect, it } from "vitest";
import { ProviderError, type AiProvider, type ProviderResponse } from "@/lib/ai/provider";
import { BARBER_PRESET } from "./presets";
import { SAMPLE_BARBER_FACTS } from "./sample";
import { assembleSite, buildCopyPrompt, parseCopy, writeSite, type WriteInput } from "./write";

const input: WriteInput = { preset: BARBER_PRESET, facts: SAMPLE_BARBER_FACTS, look: "classic", colour: "#1f3a34", heroPhoto: "brief-file:drafts/x/hero.jpg" };

const copy = (over: Record<string, unknown> = {}) => ({
  tagline: "Barbers in Leeds",
  hero: { headline: "Sharp cuts on High Street", intro: "Walk-ins and bookings at Hartley & Sons.", cta: "Request a booking" },
  headings: { services: "Cuts and prices", hours: "Opening hours", gallery: "The shop", area: "Find us", enquiry: "Request a booking", faq: "Questions" },
  descriptions: { "Skin fade": "Clean and sharp.", "cut & style": "A cut to suit you." },
  area: "We are at 12 High Street, Leeds.",
  enquiry: { intro: "Tell us when suits and we will reply.", cta: "Send request" },
  faq: [{ question: "Do you take walk-ins?", answer: "Yes, walk-ins are welcome." }],
  closing: { headline: "Ready for a fresh cut?", cta: "Request a booking" },
  ...over,
});

const final = (text: string, costPence = 1): ProviderResponse => ({ kind: "final", text, usage: { inputTokens: 0, outputTokens: 0, costPence } });

function fake(replies: (ProviderResponse | Error)[]): AiProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    name: "fake",
    model: "fake-1",
    calls,
    async complete({ messages }) {
      calls.push(messages[0].content);
      const next = replies.shift();
      if (!next) throw new Error("no more replies");
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

const ctx = (provider: AiProvider, over: Partial<{ spentPence: number; maxPence: number }> = {}) => ({ provider, spentPence: 0, maxPence: 300, ...over });

describe("parseCopy", () => {
  it("reads JSON, even inside a code fence", () => {
    const r = parseCopy("```json\n" + JSON.stringify(copy()) + "\n```");
    expect(r.ok && r.copy.hero.headline).toBe("Sharp cuts on High Street");
  });

  it("strips tags and links and trims to the limits", () => {
    const r = parseCopy(JSON.stringify(copy({ hero: { headline: "<b>Hi</b> see https://x.example now", intro: "y".repeat(900), cta: "Book" } })));
    expect(r.ok && r.copy.hero.headline).toBe("Hi see now");
    expect(r.ok && r.copy.hero.intro.length).toBe(300);
  });

  it("rejects a reply that is not JSON or has no headline", () => {
    expect(parseCopy("Sure! Here you go").ok).toBe(false);
    expect(parseCopy(JSON.stringify(copy({ hero: { headline: "", intro: "", cta: "" } }))).ok).toBe(false);
  });

  it("keeps at most four complete FAQ items", () => {
    const faq = Array.from({ length: 6 }, (_, i) => ({ question: `Q${i}?`, answer: "A." })).concat([{ question: "No answer", answer: "" }]);
    const r = parseCopy(JSON.stringify(copy({ faq })));
    expect(r.ok && r.copy.faq).toHaveLength(4);
  });
});

describe("assembleSite", () => {
  const parsed = parseCopy(JSON.stringify(copy()));
  if (!parsed.ok) throw new Error("fixture");

  it("takes services, prices, hours and contact details from the customer, not the model", () => {
    const site = assembleSite(input, parsed.copy);
    const services = site.sections.find((s) => s.kind === "services");
    expect(services && services.kind === "services" && services.items.map((i) => [i.name, i.price])).toEqual([
      ["Cut & style", "£22"],
      ["Skin fade", "£20"],
      ["Hot towel shave", "£18"],
      ["Beard trim", undefined],
    ]);
    const hours = site.sections.find((s) => s.kind === "hours");
    expect(hours && hours.kind === "hours" && hours.items).toEqual(SAMPLE_BARBER_FACTS.hours);
    expect(site.business.phone).toBe("01632 960123");
  });

  it("never shows a description of a service, even if the model writes one", () => {
    const site = assembleSite(input, parsed.copy);
    const services = site.sections.find((s) => s.kind === "services");
    expect(services && services.kind === "services" && services.items.every((i) => i.description === undefined)).toBe(true);
  });

  it("leaves out optional sections the customer gave nothing for", () => {
    const kinds = assembleSite(input, parsed.copy).sections.map((s) => s.kind);
    expect(kinds).not.toContain("gallery");
    expect(kinds).not.toContain("facts");
    const noAddress = assembleSite({ ...input, facts: { ...SAMPLE_BARBER_FACTS, address: undefined } }, parsed.copy).sections.map((s) => s.kind);
    expect(noAddress).not.toContain("area");
  });

  it("adds a gallery and facts when there are photos and highlights, with a fallback description for a photo", () => {
    const withExtras = assembleSite(
      { ...input, images: [{ src: "https://cdn.example/a.jpg", alt: "" }], facts: { ...SAMPLE_BARBER_FACTS, highlights: [{ value: "Walk-ins", label: "Welcome" }] } },
      parsed.copy,
    );
    const gallery = withExtras.sections.find((s) => s.kind === "gallery");
    expect(gallery && gallery.kind === "gallery" && gallery.images[0].alt).toBe("Hartley & Sons photo");
    expect(withExtras.sections.map((s) => s.kind)).toEqual(["hero", "services", "hours", "gallery", "facts", "area", "enquiry", "faq", "cta"]);
  });

  it("uses a plain hero without a photo", () => {
    const site = assembleSite({ ...input, heroPhoto: undefined }, parsed.copy);
    expect(site.sections[0]).toMatchObject({ kind: "hero", variant: "plain" });
  });
});

describe("buildCopyPrompt", () => {
  it("includes the facts and the format, and a retry's reasons and a change", () => {
    const p = buildCopyPrompt({ ...input, change: "Make it friendlier" }, "- sections[0]: Placeholder text");
    for (const t of ["Hartley & Sons", "Cut & style", "Make it friendlier", "Placeholder text", '"tagline"']) expect(p).toContain(t);
  });

  it("does not hand the model prices, phone numbers or an email to repeat", () => {
    const p = buildCopyPrompt(input);
    expect(p).not.toContain("£");
    expect(p).not.toContain("01632");
    expect(p).not.toContain("book@hartley");
  });
});

describe("writeSite", () => {
  it("writes a site that passes the checks in one call", async () => {
    const provider = fake([final(JSON.stringify(copy()), 2)]);
    const r = await writeSite(ctx(provider), input);
    expect(r.ok).toBe(true);
    expect(r.costPence).toBe(2);
    expect(provider.calls).toHaveLength(1);
  });

  it("retries once with the reasons when the first attempt breaks a check, and then passes", async () => {
    const bad = copy({ hero: { headline: "Cuts from £5 at Hartley & Sons", intro: "Hello", cta: "Book" } });
    const provider = fake([final(JSON.stringify(bad), 1), final(JSON.stringify(copy()), 1)]);
    const r = await writeSite(ctx(provider), input);
    expect(r.ok).toBe(true);
    expect(r.costPence).toBe(2);
    expect(provider.calls[1]).toContain("£5");
  });

  it("retries after a reply that is not JSON", async () => {
    const provider = fake([final("Sorry, here is a poem"), final(JSON.stringify(copy()))]);
    expect((await writeSite(ctx(provider), input)).ok).toBe(true);
    expect(provider.calls[1]).toContain("not JSON");
  });

  it("flags a site that still fails after three tries, and hands back the content and reasons for review", async () => {
    const bad = JSON.stringify(copy({ hero: { headline: "Your headline here", intro: "Hello", cta: "Book" } }));
    const r = await writeSite(ctx(fake([final(bad), final(bad), final(bad)])), input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/checks/);
      expect(r.issues?.some((i) => i.code === "placeholder")).toBe(true);
      expect(r.content?.business.name).toBe("Hartley & Sons");
    }
  });

  it("fails clearly when the customer gave no opening hours, which a barber site needs", async () => {
    const noHours = { ...input, facts: { ...SAMPLE_BARBER_FACTS, hours: undefined } };
    const r = await writeSite(ctx(fake([final(JSON.stringify(copy())), final(JSON.stringify(copy())), final(JSON.stringify(copy()))])), noHours);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues?.some((i) => i.code === "missing-section")).toBe(true);
  });

  it("does not call the model once the spending limit is reached", async () => {
    const provider = fake([]);
    const r = await writeSite(ctx(provider, { spentPence: 300 }), input);
    expect(r).toMatchObject({ ok: false, costPence: 0 });
    expect(provider.calls).toHaveLength(0);
  });

  it("stops between attempts if the first one used up the limit", async () => {
    const bad = JSON.stringify(copy({ hero: { headline: "Your headline here", intro: "x", cta: "y" } }));
    const provider = fake([final(bad, 300)]);
    const r = await writeSite(ctx(provider), input);
    expect(r.ok).toBe(false);
    expect(provider.calls).toHaveLength(1);
  });

  it("turns provider failures into plain reasons", async () => {
    expect(await writeSite(ctx(fake([new ProviderError("x", "authentication")])), input)).toMatchObject({ ok: false, reason: "The AI service refused our key." });
    expect(await writeSite(ctx(fake([new ProviderError("x", "transient")])), input)).toMatchObject({ ok: false, reason: expect.stringContaining("busy") });
  });

  it("rejects a tool call, which this step never uses", async () => {
    const tool: ProviderResponse = { kind: "tool_call", tool: "x", args: {}, usage: { inputTokens: 0, outputTokens: 0, costPence: 0 } };
    expect(await writeSite(ctx(fake([tool])), input)).toMatchObject({ ok: false, reason: expect.stringContaining("tool") });
  });
});
