import type { AiProvider } from "@/lib/ai/provider";
import { parseAnswers } from "./answers";
import { SECTOR_PRESETS } from "./presets";
import { SAMPLE_ANSWERS } from "./sample";
import { SAMPLE_VARIANTS } from "./variants";
import type { SiteContent } from "./schema";
import { writeSite } from "./write";

/**
 * Writes every template a few times with a model and reports how many sites pass every check on the model's own
 * wording, and what they cost. Used by the staff test page and by the test that runs on request. A site that needed
 * our fallback wording counts as not passed, because the point is what the model can do unaided.
 */
/** One generated site from the test: whose business it is, whether it passed, and the site itself to look at. */
export type TemplateTestSite = { business: string; passed: boolean; content: SiteContent | null; issues: string[] };
export type TemplateTestRow = { template: string; passed: number; runs: number; pencePerSite: number; problems: string[]; sites: TemplateTestSite[] };
export type TemplateTestResult = { model: string; rows: TemplateTestRow[]; passed: number; total: number; pencePerSite: number };

/** The ids of every template, in the order they are tested. */
export const TEMPLATE_IDS = Object.keys(SECTOR_PRESETS);

/** Tests every template, or only the ones named, so a slow run can be split across several requests. */
export async function runTemplateTest(provider: AiProvider, runs: number, only?: string[]): Promise<TemplateTestResult> {
  const count = Math.min(3, Math.max(1, Math.floor(runs)));
  const rows: TemplateTestRow[] = [];
  const presets = Object.values(SECTOR_PRESETS).filter((p) => !only || only.includes(p.id));
  for (const preset of presets) {
    // The main sample plus the extra made-up businesses for this template, each written `count` times.
    const sets = [SAMPLE_ANSWERS[preset.id], ...(SAMPLE_VARIANTS[preset.id] ?? [])];
    const row: TemplateTestRow = { template: preset.label, passed: 0, runs: count * sets.length, pencePerSite: 0, problems: [], sites: [] };
    let pence = 0;
    for (const answers of sets) {
      const parsed = parseAnswers(answers, preset, { colour: "#1f3a34" });
      if (!parsed.ok) throw new Error(`${preset.label} (${answers.businessName}): answers not accepted`);
      for (let i = 0; i < count; i++) {
        const r = await writeSite({ provider, spentPence: 0, maxPence: 300 }, { preset, facts: parsed.facts, look: parsed.look, colour: parsed.colour });
        pence += r.costPence;
        const issues = r.ok ? [] : [r.reason, ...(r.issues ?? []).map((x) => x.code)];
        if (r.ok) row.passed += 1;
        else row.problems.push(...issues.map((x) => `${answers.businessName}: ${x}`));
        row.sites.push({ business: answers.businessName ?? "", passed: r.ok, content: r.content ?? null, issues });
      }
    }
    row.pencePerSite = Math.round((pence / row.runs) * 100) / 100;
    row.problems = [...new Set(row.problems)];
    rows.push(row);
  }
  const passed = rows.reduce((n, r) => n + r.passed, 0);
  const total = rows.reduce((n, r) => n + r.runs, 0);
  const pence = rows.reduce((n, r) => n + r.pencePerSite * r.runs, 0);
  return { model: `${provider.name} ${provider.model}`, rows, passed, total, pencePerSite: Math.round((pence / total) * 100) / 100 };
}
