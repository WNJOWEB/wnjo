import { describe, expect, it } from "vitest";
import { parseAnswers } from "./answers";
import { checkSite } from "./checks";
import { SECTOR_PRESETS } from "./presets";
import { SAMPLE_ANSWERS } from "./sample";
import { SAMPLE_VARIANTS } from "./variants";
import { assembleSite, defaultCopy } from "./write";

describe.each(Object.values(SECTOR_PRESETS).map((p) => [p.label, p] as const))("the made-up businesses for %s", (_label, preset) => {
  const sets = SAMPLE_VARIANTS[preset.id] ?? [];

  it("has two more businesses, each different from the first", () => {
    expect(sets).toHaveLength(3);
    const names = [SAMPLE_ANSWERS[preset.id].businessName, ...sets.map((s) => s.businessName)];
    expect(new Set(names).size).toBe(names.length);
  });

  it.each([0, 1, 2])("businesses %i is accepted by the same form rules as a real customer's answers", (i) => {
    const r = parseAnswers(sets[i], preset, { colour: "#1f3a34" });
    expect(r.ok, r.ok ? "" : JSON.stringify(r.errors)).toBe(true);
  });

  it.each([0, 1, 2])("businesses %i can always be built into a site, even without a model, that passes the checks", (i) => {
    const r = parseAnswers(sets[i], preset, { colour: "#1f3a34" });
    if (!r.ok) throw new Error("not accepted");
    const input = { preset, facts: r.facts, look: r.look, colour: r.colour };
    const site = assembleSite(input, defaultCopy(input));
    expect(checkSite(site, r.facts, preset).issues).toEqual([]);
  });
});
