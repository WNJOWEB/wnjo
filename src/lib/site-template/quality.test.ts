import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_PENCE_PER_BRIEF, MAX_ROUNDS } from "@/lib/ai/limits";
import type { AiProvider, ProviderResponse } from "@/lib/ai/provider";
import { AVOID_WORDING } from "./avoid-wording";
import { checkSite, FILLER_PHRASES } from "./checks";
import { COPY_RUN_WORDS, findCopiedRun } from "./originality";
import { BARBER_PRESET } from "./presets";
import { SAMPLES } from "./sample";
import { FIELD_LIMITS, WORD_LIMITS, type SiteContent } from "./schema";
import { cutWords, sentencesOf, wordCount, wordsOf } from "./text";
import { buildCopyPrompt, defaultCopy, writeSite } from "./write";

const sample = SAMPLES.barber;
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}`).join(" ");
const codes = (content: SiteContent, facts = sample.facts, avoid: readonly string[] = []) => checkSite(content, facts, BARBER_PRESET, { avoid }).issues.map((i) => i.code);

/** A copy of the barber sample with one change made to a section. */
function changed(kind: string, change: (s: Record<string, unknown>) => void): SiteContent {
  const content = structuredClone(sample.content);
  const section = content.sections.find((s) => s.kind === kind);
  if (!section) throw new Error(`no ${kind}`);
  change(section as unknown as Record<string, unknown>);
  return content;
}

describe("the limits", () => {
  it("are three rounds and £1 a website", () => {
    expect(MAX_ROUNDS).toBe(3);
    expect(DEFAULT_MAX_PENCE_PER_BRIEF).toBe(100);
  });
  it("start with no wording to avoid, so the check does nothing until some is listed", () => {
    expect(AVOID_WORDING).toEqual([]);
  });
});

describe("one clear next step", () => {
  it("passes when the top and the end of the page say the same thing", () => {
    expect(codes(sample.content)).toEqual([]);
  });
  it("flags a page whose end points somewhere else", () => {
    const content = changed("cta", (s) => (s.cta = "Learn more"));
    expect(codes(content)).toContain("cta-mismatch");
  });
  it("flags a page with no next step at the top, and no intro for search to show", () => {
    const content = changed("hero", (s) => ((s.cta = " "), (s.intro = "")));
    expect(codes(content)).toEqual(expect.arrayContaining(["cta-missing", "no-description"]));
  });
});

describe("short wording", () => {
  it("allows eight words in a headline and eighteen in an intro, and no more", () => {
    expect(codes(changed("hero", (s) => ((s.headline = words(WORD_LIMITS.headline)), (s.intro = words(WORD_LIMITS.intro)))))).not.toContain("too-many-words");
    expect(codes(changed("hero", (s) => (s.headline = words(WORD_LIMITS.headline + 1))))).toContain("too-many-words");
    expect(codes(changed("hero", (s) => (s.intro = words(WORD_LIMITS.intro + 1))))).toContain("too-many-words");
  });
  it("applies to the request form's intro as well", () => {
    expect(codes(changed("enquiry", (s) => (s.intro = words(WORD_LIMITS.intro + 1))))).toContain("too-many-words");
  });
  it("flags a sentence of more than eighteen words, and allows one of eighteen", () => {
    expect(codes(changed("hero", (s) => (s.intro = `${words(19)}.`)))).toContain("long-sentence");
    expect(codes(changed("hero", (s) => (s.intro = `${words(18)}.`)))).not.toContain("long-sentence");
    expect(codes(changed("hero", (s) => (s.intro = `${words(10)}. ${words(10)}.`)))).not.toContain("long-sentence");
  });
  it("never judges the customer's own long sentence", () => {
    const long = `${words(25)}.`;
    expect(codes(changed("hero", (s) => (s.intro = long)), { ...sample.facts, about: long })).not.toContain("long-sentence");
  });
});

describe("plain English", () => {
  it.each(FILLER_PHRASES.map((p) => [p]))("flags the filler phrase %s, in any case and with hyphens", (phrase) => {
    const content = changed("hero", (s) => (s.intro = `We are a ${phrase.toUpperCase().replace(/ /g, "-")} barber.`));
    expect(codes(content)).toContain("filler");
  });
  it("lets through a phrase the customer wrote themselves", () => {
    const facts = { ...sample.facts, about: "A passionate team of barbers." };
    const content = changed("hero", (s) => (s.intro = "A passionate team of barbers."));
    expect(codes(content, facts)).not.toContain("filler");
    expect(codes(content)).toContain("filler");
  });
  it("never judges the customer's own service names", () => {
    const facts = { ...sample.facts, services: [{ name: "World class fade", price: "£20" }, ...sample.facts.services.slice(1)] };
    const content = changed("services", (s) => ((s.items as { name: string; price?: string }[])[0] = { name: "World class fade", price: "£20" }));
    expect(codes(content, facts)).not.toContain("filler");
  });
});

describe("copied wording", () => {
  const theirs = "We have been cutting hair on the High Street since before you were born and we are not stopping now.";
  const copiedRun = "cutting hair on the High Street since before";

  it("finds a run of seven words in a row, ignoring case and punctuation", () => {
    expect(COPY_RUN_WORDS).toBe(7);
    expect(findCopiedRun("Honestly: CUTTING hair on the high street, since before anyone", [theirs])).toBe("cutting hair on the high street since");
  });
  it("lets six words through, because that is ordinary wording", () => {
    expect(findCopiedRun("cutting hair on the high street", [theirs])).toBeNull();
  });
  it("does nothing with nothing to avoid", () => {
    expect(findCopiedRun(copiedRun, [])).toBeNull();
  });
  it("lets through a run the customer wrote themselves", () => {
    expect(findCopiedRun(copiedRun, [theirs], copiedRun)).toBeNull();
  });
  it("flags a draft that repeats another site, and says where", () => {
    const content = changed("hero", (s) => (s.intro = `Barbers who are ${copiedRun} in Leeds.`));
    const issues = checkSite(content, sample.facts, BARBER_PRESET, { avoid: [theirs] }).issues;
    expect(issues.map((i) => i.code)).toContain("copied-wording");
    expect(issues.find((i) => i.code === "copied-wording")?.where).toContain("hero.intro");
  });
  it("passes a draft that only shares a few words", () => {
    expect(codes(changed("hero", (s) => (s.intro = "Cutting hair on the High Street in Leeds.")), sample.facts, [theirs])).not.toContain("copied-wording");
  });
});

describe("the helpers", () => {
  it("count words without punctuation, and keep apostrophes", () => {
    expect(wordsOf("Don't panic, it's only hair!")).toEqual(["don't", "panic", "it's", "only", "hair"]);
    expect(wordCount("")).toBe(0);
  });
  it("split sentences", () => {
    expect(sentencesOf("One. Two? Three!  Four")).toEqual(["One.", "Two?", "Three!", "Four"]);
  });
  it("cut to a word limit at the end of a sentence if one fits, otherwise at a word", () => {
    expect(cutWords("First sentence here. Second sentence here too.", 5)).toBe("First sentence here.");
    expect(cutWords("one two three four five six seven", 4)).toBe("one two three four");
    expect(cutWords("short", 18)).toBe("short");
  });
});

describe("the writer", () => {
  const facts = sample.facts;
  const input = { preset: BARBER_PRESET, facts, look: "classic" as const, colour: "#1f3a34" };
  const final = (obj: unknown): ProviderResponse => ({ kind: "final", text: JSON.stringify(obj), usage: { inputTokens: 0, outputTokens: 0, costPence: 1 } });
  const fake = (replies: ProviderResponse[]): AiProvider & { prompts: string[] } => {
    const prompts: string[] = [];
    return { name: "fake", model: "fake", prompts, complete: async ({ messages }) => (prompts.push(messages[0].content), replies.shift()!) };
  };
  const good = { hero: { headline: "Sharp cuts on High Street", intro: "Walk-ins and bookings at Hartley & Sons." } };
  const filler = { hero: { headline: "Sharp cuts on High Street", intro: "A passionate team with cutting-edge cuts." } };

  it("tries up to three times, telling the model what was wrong each time, and stops when a draft passes", async () => {
    const p = fake([final(filler), final(filler), final(good)]);
    const r = await writeSite({ provider: p, spentPence: 0, maxPence: 1000 }, input);
    expect(r.ok).toBe(true);
    expect(p.prompts).toHaveLength(3);
    expect(p.prompts[1]).toContain("filler");
    expect(p.prompts[2]).toContain("filler");
  });

  it("sends a draft that fails three times to a person, with the reasons", async () => {
    const p = fake([final(filler), final(filler), final(filler)]);
    const r = await writeSite({ provider: p, spentPence: 0, maxPence: 1000 }, input);
    expect(p.prompts).toHaveLength(3);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("three tries");
      expect(r.issues?.some((i) => i.code === "filler")).toBe(true);
    }
  });

  it("asks for plain, original wording up front, so fewer drafts need another round", () => {
    const prompt = buildCopyPrompt(input);
    expect(prompt).toContain("passionate team");
    expect(prompt).toContain("Never copy wording from another website");
  });

  it("asks for the word limits in the prompt, so the model knows them before it writes", () => {
    const prompt = buildCopyPrompt(input);
    expect(prompt).toContain("Headline: at most 8 words. Intro: at most 18 words. Keep every sentence to 18 words or fewer.");
  });

  it("keeps our own fallback wording within the characters the layout holds", () => {
    const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i + 1} is here.`).join(" ");
    const copy = defaultCopy({ ...input, facts: { ...facts, about: long } });
    expect(copy.hero.intro.length).toBeLessThanOrEqual(FIELD_LIMITS.intro);
    expect(wordCount(copy.hero.intro)).toBeLessThanOrEqual(WORD_LIMITS.intro);
    const places = ["Leeds", "Wakefield", "Harrogate", "St Helens", "Kingston upon Hull", "Newcastle upon Tyne", "Middlesbrough", "Wolverhampton"];
    const trade = defaultCopy({ preset: BARBER_PRESET, facts: { ...SAMPLES.plumbing.facts, areas: places }, look: "bold", colour: "#2b2b2b" });
    expect(trade.hero.headline.length).toBeLessThanOrEqual(FIELD_LIMITS.headline);
  });
});
