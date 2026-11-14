import { describe, expect, it } from "vitest";
import { providerFromEnv } from "@/lib/ai/agent-runtime";
import { runTemplateTest } from "./template-test";

/**
 * Runs every template through the model that is configured, and reports how often it finishes a site that passes
 * every check, and what each site costs. It does nothing in the normal test run: it needs a real key and spends real
 * money, so it only runs on request.
 *
 *   AI_EVAL=1 ANTHROPIC_API_KEY=... npx vitest run src/lib/site-template/eval.test.ts
 *
 * That uses Claude Haiku 5.5 with low thinking, the defaults. Set ANTHROPIC_MODEL or ANTHROPIC_EFFORT to try another.
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
      if (!provider) throw new Error("No model is configured. Set ANTHROPIC_API_KEY.");
      const result = await runTemplateTest(provider, runs);
      console.log(`\nModel: ${result.model}`);
      console.table(result.rows.map((r) => ({ template: r.template, passed: `${r.passed}/${r.runs}`, "pence per site": r.pencePerSite, problems: r.problems.join(", ") })));
      console.log(`Passed ${result.passed} of ${result.total} (${Math.round((result.passed / result.total) * 100)}%). Average ${result.pencePerSite}p per site.\n`);
      expect(result.passed / result.total).toBeGreaterThanOrEqual(minPass);
    },
    900_000,
  );
});
