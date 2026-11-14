import type { AiProvider } from "@/lib/ai/provider";
import { parseAnswers } from "./answers";
import { SECTOR_PRESETS } from "./presets";
import { SAMPLE_ANSWERS } from "./sample";
import { writeSite } from "./write";

/**
 * Writes every template a few times with a model and reports how many sites pass every check on the model's own
 * wording, and what they cost. Used by the staff test page and by the test that runs on request. A site that needed
 * our fallback wording counts as not passed, because the point is what the model can do unaided.
 */
export type TemplateTestRow = { template: string; passed: number; runs: number; pencePerSite: number; problems: string[] };
export type TemplateTestResult = { model: string; rows: TemplateTestRow[]; passed: number; total: number; pencePerSite: number };

export async function runTemplateTest(provider: AiProvider, runs: number): Promise<TemplateTestResult> {
  const count = Math.min(3, Math.max(1, Math.floor(runs)));
  const rows: TemplateTestRow[] = [];
  for (const preset of Object.values(SECTOR_PRESETS)) {
    const parsed = parseAnswers(SAMPLE_ANSWERS[preset.id], preset, { colour: "#1f3a34" });
    if (!parsed.ok) throw new Error(`${preset.label}: sample answers not accepted`);
    const row: TemplateTestRow = { template: preset.label, passed: 0, runs: count, pencePerSite: 0, problems: [] };
    let pence = 0;
    for (let i = 0; i < count; i++) {
      const r = await writeSite({ provider, spentPence: 0, maxPence: 300 }, { preset, facts: parsed.facts, look: parsed.look, colour: parsed.colour });
      pence += r.costPence;
      if (r.ok) row.passed += 1;
      else row.problems.push(r.reason, ...(r.issues ?? []).map((x) => x.code));
    }
    row.pencePerSite = Math.round((pence / count) * 100) / 100;
    row.problems = [...new Set(row.problems)];
    rows.push(row);
  }
  const passed = rows.reduce((n, r) => n + r.passed, 0);
  const total = rows.reduce((n, r) => n + r.runs, 0);
  const pence = rows.reduce((n, r) => n + r.pencePerSite * r.runs, 0);
  return { model: `${provider.name} ${provider.model}`, rows, passed, total, pencePerSite: Math.round((pence / total) * 100) / 100 };
}
