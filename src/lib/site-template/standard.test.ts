import { describe, expect, it } from "vitest";
import type { AiProvider } from "@/lib/ai/provider";
import { ANSWER_LIMITS, cleanSiteAnswers, parseAnswers, parseServicesText } from "./answers";
import { checkSite } from "./checks";
import { ABOUT_QUESTION, SECTOR_PRESETS, type SectorPreset } from "./presets";
import { SAMPLE_ANSWERS, SAMPLES } from "./sample";
import { assembleSite, buildCopyPrompt, defaultCopy, writeSite } from "./write";

/**
 * The standard for a template: the form we give the customer collects enough to write a good site with it. Each
 * template has a complete set of form answers, and everything below is proved from those answers.
 */
const presets = Object.values(SECTOR_PRESETS);
const colour = { colour: "#1f3a34" };

describe("the templates we offer", () => {
  it("cover the ten categories, with a sample, and sample answers, each", () => {
    const wanted = ["barber", "beauty", "massage", "fitness", "physio", "cafe", "electrician", "plumbing", "building", "cleaning"];
    for (const id of wanted) expect(SECTOR_PRESETS[id], id).toBeDefined();
    expect(Object.keys(SAMPLES).sort()).toEqual(Object.keys(SECTOR_PRESETS).sort());
    expect(Object.keys(SAMPLE_ANSWERS).sort()).toEqual(Object.keys(SECTOR_PRESETS).sort());
  });

  it("each have their own name", () => {
    const labels = presets.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe.each(presets.map((p) => [p.label, p] as [string, SectorPreset]))("%s: the form collects enough to write the site", (_label, preset) => {
  const answers = SAMPLE_ANSWERS[preset.id];
  const parsed = parseAnswers(answers, preset, colour);

  it("answers every question the form asks, and the one about what makes the business different", () => {
    expect(answers.about?.trim(), "about").toBeTruthy();
    for (const q of preset.questions) expect(answers.details?.[q.id]?.trim(), q.id).toBeTruthy();
    expect(Object.keys(answers.details ?? {}).sort()).toEqual(preset.questions.map((q) => q.id).sort());
  });

  it("is accepted by the form's own rules, and becomes the facts its sample site was written from", () => {
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.facts).toEqual(SAMPLES[preset.id].facts);
  });

  it("gives the writer the customer's own words and every answer", () => {
    if (!parsed.ok) throw new Error("answers not accepted");
    const prompt = buildCopyPrompt({ preset, facts: parsed.facts, look: parsed.look, colour: parsed.colour });
    expect(prompt).toContain(answers.about!);
    for (const q of preset.questions) expect(prompt).toContain(answers.details![q.id]);
  });

  it("produces a site that passes every check, from those answers", () => {
    if (!parsed.ok) throw new Error("answers not accepted");
    expect(checkSite(SAMPLES[preset.id].content, parsed.facts, preset).issues).toEqual([]);
  });

  it("shows the customer how to write their list, in a format the form reads", () => {
    const { services, errors } = parseServicesText(preset.servicesExample);
    expect(errors).toEqual([]);
    expect(services.length).toBeGreaterThanOrEqual(3);
  });

  it("asks a few short, optional questions with their own hints, and no more than four", () => {
    expect(preset.questions.length).toBeGreaterThanOrEqual(3);
    expect(preset.questions.length).toBeLessThanOrEqual(4);
    const ids = preset.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of preset.questions) {
      expect(q.id).toMatch(/^[a-zA-Z0-9-]{1,30}$/);
      expect(q.label.endsWith("?"), q.label).toBe(true);
      expect(q.hint.length).toBeGreaterThan(10);
    }
  });

  it("lets a customer lift every claim the sector restricts, by ticking a fact that is true of them", () => {
    for (const claim of preset.restrictedClaims ?? []) {
      if (!claim.unless) continue;
      const lifts = preset.highlights.some((h) => claim.unless!({ businessName: "x", services: [], highlights: [{ value: h.value, label: h.label }] }));
      expect(lifts, claim.reason).toBe(true);
    }
  });

  it("will not take the answers without the customer's own words", () => {
    const r = parseAnswers({ ...answers, about: "  " }, preset, colour);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.about).toBeTruthy();
  });
});

describe("the customer's own words", () => {
  const barber = SECTOR_PRESETS.barber;
  const base = SAMPLE_ANSWERS.barber;

  it("are limited, and so is each answer", () => {
    const longAbout = parseAnswers({ ...base, about: "x".repeat(ANSWER_LIMITS.aboutText + 1) }, barber, colour);
    expect(longAbout.ok === false && longAbout.errors.about).toBeTruthy();
    const longDetail = parseAnswers({ ...base, details: { ...base.details, speciality: "x".repeat(ANSWER_LIMITS.detailText + 1) } }, barber, colour);
    expect(longDetail.ok === false && longDetail.errors["detail-speciality"]).toBeTruthy();
  });

  it("can make a question required, and then it must be answered", () => {
    const strict: SectorPreset = { ...barber, questions: barber.questions.map((q) => (q.id === "speciality" ? { ...q, required: true } : q)) };
    const r = parseAnswers({ ...base, details: { ...base.details, speciality: "" } }, strict, colour);
    expect(r.ok === false && r.errors["detail-speciality"]).toBeTruthy();
    expect(parseAnswers({ ...base, details: { ...base.details, history: "" } }, barber, colour).ok).toBe(true);
  });

  it("have markup removed, and are kept as plain text", () => {
    const r = parseAnswers({ ...base, about: "A <b>family</b> shop." }, barber, colour);
    expect(r.ok && r.facts.about).toBe("A family shop.");
  });

  it("are kept when a draft is saved, and unknown or oversized entries are dropped", () => {
    const cleaned = cleanSiteAnswers(
      { sector: "barber", answers: { about: "y".repeat(ANSWER_LIMITS.aboutText + 50), details: { speciality: "Fades", "bad key!": "x", history: 5, booking: "z".repeat(ANSWER_LIMITS.detailText + 50) } } },
      Object.keys(SECTOR_PRESETS),
    );
    expect(cleaned?.answers.about).toHaveLength(ANSWER_LIMITS.aboutText);
    expect(cleaned?.answers.details).toEqual({ speciality: "Fades", booking: "z".repeat(ANSWER_LIMITS.detailText) });
  });

  it("let a price, email or number the customer wrote be used, and nothing they didn't", () => {
    const facts = { ...SAMPLES.barber.facts, details: [{ label: "How should customers book?", value: "Call 01632 960999, or email chair@hartley.example. Cuts from £15." }] };
    const content = structuredClone(SAMPLES.barber.content);
    const enquiry = content.sections.find((s) => s.kind === "enquiry");
    if (!enquiry || enquiry.kind !== "enquiry") throw new Error("no enquiry");
    enquiry.intro = "Call 01632 960999, email chair@hartley.example, or ask. Cuts from £15.";
    expect(checkSite(content, facts, barber).issues).toEqual([]);
    enquiry.intro = "Call 01632 960888, email other@hartley.example. Cuts from £17.";
    expect(checkSite(content, facts, barber).issues.map((i) => i.code).sort()).toEqual(["email-invented", "phone-invented", "price-invented"]);
  });

  it("are never judged: the customer's own service names are theirs to say", () => {
    const cafe = SECTOR_PRESETS.cafe;
    const facts = { ...SAMPLES.cafe.facts, services: [{ name: "Gluten-free brownie", price: "£3" }, ...SAMPLES.cafe.facts.services.slice(1)] };
    const content = structuredClone(SAMPLES.cafe.content);
    const menu = content.sections.find((s) => s.kind === "services");
    if (!menu || menu.kind !== "services") throw new Error("no menu");
    menu.items[0] = { name: "Gluten-free brownie", price: "£3" };
    expect(checkSite(content, facts, cafe).issues.filter((i) => i.code === "restricted-claim")).toEqual([]);
  });

  it("asks everyone the same first question", () => {
    expect(ABOUT_QUESTION.label.endsWith("?")).toBe(true);
  });
});


/**
 * A small model has little to get wrong: the template writes the fixed wording and the customer's facts, so the model
 * is only asked for a headline and an intro, plus optional descriptions and FAQ answers.
 */
const replying = (text: string): AiProvider => ({ name: "fake", model: "fake", complete: async () => ({ kind: "final", text, usage: { inputTokens: 0, outputTokens: 0, costPence: 1 } }) });

describe.each(presets.map((p) => [p.label, p] as [string, SectorPreset]))("%s: a small model can finish the site", (_label, preset) => {
  const parsed = parseAnswers(SAMPLE_ANSWERS[preset.id], preset, colour);
  if (!parsed.ok) throw new Error("answers not accepted");
  const input = { preset, facts: parsed.facts, look: parsed.look, colour: parsed.colour };
  const ctx = (provider: AiProvider) => ({ provider, spentPence: 0, maxPence: 300 });

  it("needs no model for the wording around the facts: a site with none of it written by the model passes every check", () => {
    const site = assembleSite(input, defaultCopy(input));
    expect(checkSite(site, parsed.facts, preset).issues).toEqual([]);
    const hero = site.sections.find((s) => s.kind === "hero");
    expect(hero?.kind === "hero" && hero.headline.length).toBeGreaterThan(0);
  });

  it("completes the whole site from a reply with only a headline and an intro", async () => {
    const sample = SAMPLES[preset.id].content.sections.find((s) => s.kind === "hero");
    if (sample?.kind !== "hero") throw new Error("no hero");
    const r = await writeSite(ctx(replying(JSON.stringify({ hero: { headline: sample.headline, intro: sample.intro } }))), input);
    expect(r.ok, r.ok ? "" : r.reason).toBe(true);
    if (r.ok) expect(r.content.sections.map((s) => s.kind)).toEqual(expect.arrayContaining(preset.sections.filter((s) => s.required && s.kind !== "gallery").map((s) => s.kind)));
  });

  it("still gives the owner a complete, passing draft, marked for a person to read, when the model's reply can't be used", async () => {
    const r = await writeSite(ctx(replying("sorry, I cannot do that")), input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("standard wording");
    expect(r.content).toBeDefined();
    expect(r.issues).toEqual([]);
    expect(r.content!.sections.map((s) => s.kind)).toEqual(expect.arrayContaining(preset.sections.filter((s) => s.required && s.kind !== "gallery").map((s) => s.kind)));
  });

  it("is asked for the short reply only, with a style example for its own sector", async () => {
    const prompts: string[] = [];
    const p: AiProvider = { name: "fake", model: "fake", complete: async ({ messages }) => (prompts.push(messages[0].content), { kind: "final", text: "{}", usage: { inputTokens: 0, outputTokens: 0, costPence: 1 } }) };
    await writeSite(ctx(p), input);
    expect(prompts[0]).toContain(preset.copy.example.headline);
    expect(prompts[0]).not.toContain('"headings"');
    expect(prompts[0].length).toBeLessThan(3200);
  });

  it("writes nothing for the customer that claims anything: the fixed wording passes the sector's own claim rules", () => {
    const d = defaultCopy(input);
    const fixed = [d.hero.cta, d.enquiry.intro, d.enquiry.cta, d.closing.headline, d.closing.cta, ...Object.values(d.headings)];
    for (const claim of preset.restrictedClaims ?? []) for (const text of fixed) expect(text, claim.reason).not.toMatch(claim.pattern);
  });
});
