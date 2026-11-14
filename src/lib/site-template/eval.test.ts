import { describe, expect, it } from "vitest";
import { providerFromEnv } from "@/lib/ai/agent-runtime";
import { parseAnswers } from "./answers";
import { SECTOR_PRESETS } from "./presets";
import { SAMPLE_ANSWERS } from "./sample";
import { writeSite } from "./write";

/**
 * Runs every template through the model that is configured, and reports how often it finishes a site that passes
 * every check, and what each site costs. It does nothing in the normal test run: it needs a real key and spends real
 * money, so it only runs on request.
 *
 *   AI_EVAL=1 AI_PROVIDER=anthropic ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=claude-haiku-5-5 \
 *   ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS=7 ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS=37 \
 *   npx vitest run src/lib/site-template/eval.test.ts
 *
 * AI_EVAL_RUNS (default 3) is how many times each template is written. AI_EVAL_MIN_PASS (default 0.9) is the share of
 * sites that must pass the checks on the model's own wording, without falling back to ours.
 */
const enabled = process.env.AI_EVAL === "1";
const runs = Math.max(1, Number(process.env.AI_EVAL_RUNS ?? 3));
const minPass = Number(process.env.AI_EVAL_MIN_PASS ?? 0.9);

describe.skipIf(!enabled)("the configured model, writing every template", () => {
  it(
    "finishes sites that pass the checks, at a cost we can read",
    async () => {
      const provider = providerFromEnv();
      if (!provider) throw new Error("No model is configured. Set AI_PROVIDER and that provider's settings.");
      const rows: { template: string; passed: number; runs: number; costPence: number; problems: string[] }[] = [];
      for (const preset of Object.values(SECTOR_PRESETS)) {
        const parsed = parseAnswers(SAMPLE_ANSWERS[preset.id], preset, { colour: "#1f3a34" });
        if (!parsed.ok) throw new Error(`${preset.label}: sample answers not accepted`);
        const row = { template: preset.label, passed: 0, runs, costPence: 0, problems: [] as string[] };
        for (let i = 0; i < runs; i++) {
          const r = await writeSite({ provider, spentPence: 0, maxPence: 300 }, { preset, facts: parsed.facts, look: parsed.look, colour: parsed.colour });
          row.costPence += r.costPence;
          if (r.ok) row.passed += 1;
          else row.problems.push(r.reason, ...(r.issues ?? []).map((x) => x.code));
        }
        rows.push(row);
      }
      const passed = rows.reduce((n, r) => n + r.passed, 0);
      const total = rows.reduce((n, r) => n + r.runs, 0);
      const cost = rows.reduce((n, r) => n + r.costPence, 0);
      console.log(`\nModel: ${provider.name} ${provider.model}`);
      console.table(rows.map((r) => ({ template: r.template, passed: `${r.passed}/${r.runs}`, "pence per site": +(r.costPence / r.runs).toFixed(2), problems: [...new Set(r.problems)].join(", ") })));
      console.log(`Passed ${passed} of ${total} (${Math.round((passed / total) * 100)}%). Average ${(cost / total).toFixed(2)}p per site.\n`);
      expect(passed / total).toBeGreaterThanOrEqual(minPass);
    },
    900_000,
  );
});
