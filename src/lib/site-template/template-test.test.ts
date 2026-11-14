import { describe, expect, it } from "vitest";
import type { AiProvider } from "@/lib/ai/provider";
import { SECTOR_PRESETS } from "./presets";
import { runTemplateTest } from "./template-test";

const reply = (text: string, costPence = 1): AiProvider => ({ name: "fake", model: "fake-1", complete: async () => ({ kind: "final", text, usage: { inputTokens: 0, outputTokens: 0, costPence } }) });
const good = JSON.stringify({ hero: { headline: "Plumbers for Preston", intro: "A local plumber who answers his own phone." } });
const templates = Object.keys(SECTOR_PRESETS).length;

describe("runTemplateTest", () => {
  it("counts a template as passed only when the model's own wording passes every check", async () => {
    const r = await runTemplateTest(reply(good), 1);
    expect(r.model).toBe("fake fake-1");
    expect(r.rows).toHaveLength(templates);
    // Four businesses per template (the main sample and three extra), one run each.
    expect(r.passed).toBe(templates * 4);
    expect(r.total).toBe(templates * 4);
  });

  it("counts a template as not passed when the model's reply can't be used, and says why", async () => {
    const r = await runTemplateTest(reply("sorry, no"), 1);
    expect(r.passed).toBe(0);
    expect(r.rows.every((row) => row.problems.length > 0)).toBe(true);
  });

  it("writes each template no more than three times, and reports the cost per site", async () => {
    const r = await runTemplateTest(reply(good, 2), 9);
    expect(r.rows.every((row) => row.runs === 12)).toBe(true);
    expect(r.pencePerSite).toBe(2);
  });
});

describe("the sites the test keeps, so they can be looked at", () => {
  it("keeps every generated site, with the site itself when it was built", async () => {
    const r = await runTemplateTest(reply(good), 1, ["barber"]);
    const row = r.rows[0];
    expect(row.sites).toHaveLength(row.runs);
    expect(row.sites.every((s) => s.passed && s.content !== null)).toBe(true);
    expect(row.sites[0].content?.business.name).toBeTruthy();
  });

  it("keeps a site that failed, with the reasons, so a person can still read it", async () => {
    const r = await runTemplateTest(reply("sorry, no"), 1, ["barber"]);
    const row = r.rows[0];
    expect(row.sites.every((s) => !s.passed && s.issues.length > 0)).toBe(true);
  });
});
