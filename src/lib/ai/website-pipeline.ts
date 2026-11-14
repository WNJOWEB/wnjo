/**
 * The two AI steps of a build: a plan from the brief, then the words for each page. Each step calls the model, checks
 * what comes back, and saves it as a draft. It never moves a build's stage, never shows anything to the customer,
 * and never touches prices, contracts or publishing: a person releases a preview and approves going live.
 * Spend is capped per website, and the cap is checked before every model call.
 */
import { MAX_ROUNDS } from "./limits";
import { ProviderError, type AiProvider } from "./provider";
import { buildPlanPrompt, parsePlan, PLAN_SYSTEM, type PlanInput, type WebsitePlan } from "./website-plan";
import { buildContentPrompt, CONTENT_SYSTEM, parseContent, type PageContent } from "./website-content";

export { DEFAULT_MAX_PENCE_PER_BRIEF } from "./limits";

export type StoredPlan = { id: string; version: number; plan: WebsitePlan };
export type PlanDraft = { plan: WebsitePlan; provider: string; model: string; costPence: number };
export type PreviewDraft = { planId: string; pages: PageContent[]; changeNote: string; provider: string; model: string; costPence: number };

/** Everything the pipeline reads or writes, so it can be tested without a database. */
export interface WebsiteAiStore {
  spentPence(briefId: string): Promise<number>;
  latestPlan(briefId: string): Promise<StoredPlan | null>;
  savePlan(briefId: string, draft: PlanDraft): Promise<StoredPlan>;
  savePreview(briefId: string, draft: PreviewDraft): Promise<{ id: string; version: number }>;
}

export type PipelineResult<T> = { ok: true; value: T; costPence: number } | { ok: false; reason: string; costPence: number };

type Ctx = { provider: AiProvider; store: WebsiteAiStore; briefId: string; maxPence: number };

/** One model call that must return text we can use. A reply in the wrong shape gets two more tries, then fails. */
async function ask<T>(
  ctx: Ctx,
  budget: { spent: number },
  system: string,
  user: string,
  parse: (text: string) => { ok: true; value: T } | { ok: false; reason: string },
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  let prompt = user;
  for (let attempt = 0; attempt < MAX_ROUNDS; attempt++) {
    if (budget.spent >= ctx.maxPence) return { ok: false, reason: "The spending limit for this website has been reached." };
    let reply;
    try {
      reply = await ctx.provider.complete({ system, messages: [{ role: "user", content: prompt }], tools: [] });
    } catch (error) {
      if (error instanceof ProviderError) {
        return { ok: false, reason: error.kind === "authentication" ? "The AI service refused our key." : error.kind === "transient" ? "The AI service is busy. Please try again shortly." : "The AI service sent a reply we could not use." };
      }
      throw error;
    }
    budget.spent += reply.usage.costPence;
    if (reply.kind !== "final") return { ok: false, reason: "The AI service asked for a tool, which this step does not use." };
    const parsed = parse(reply.text);
    if (parsed.ok) return parsed;
    prompt = `${user}\n\nYour last reply was rejected: ${parsed.reason} Reply again with only the JSON.`;
  }
  return { ok: false, reason: "The AI reply was not in the right shape after three tries." };
}

export async function generatePlan(ctx: Ctx, input: PlanInput): Promise<PipelineResult<StoredPlan>> {
  const budget = { spent: await ctx.store.spentPence(ctx.briefId) };
  const before = budget.spent;
  const result = await ask(ctx, budget, PLAN_SYSTEM, buildPlanPrompt(input), (text) => {
    const p = parsePlan(text, input.pagesAllowed);
    return p.ok ? { ok: true, value: p.plan } : p;
  });
  const costPence = budget.spent - before;
  if (!result.ok) return { ok: false, reason: result.reason, costPence };
  const saved = await ctx.store.savePlan(ctx.briefId, { plan: result.value, provider: ctx.provider.name, model: ctx.provider.model, costPence });
  return { ok: true, value: saved, costPence };
}

/** Writes every page of the plan. If any page fails, nothing is saved: a preview is whole or not at all. */
export async function generatePreview(
  ctx: Ctx,
  input: { businessName: string; brief: PlanInput["brief"]; plan: StoredPlan; change?: string },
): Promise<PipelineResult<{ id: string; version: number }>> {
  const budget = { spent: await ctx.store.spentPence(ctx.briefId) };
  const before = budget.spent;
  const pages: PageContent[] = [];
  for (const page of input.plan.plan.pages) {
    const result = await ask(
      ctx,
      budget,
      CONTENT_SYSTEM,
      buildContentPrompt({ businessName: input.businessName, brief: input.brief, plan: input.plan.plan, page, change: input.change }),
      (text) => {
        const c = parseContent(text, page);
        return c.ok ? { ok: true, value: c.content } : c;
      },
    );
    if (!result.ok) return { ok: false, reason: `${result.reason} (page: ${page.title})`, costPence: budget.spent - before };
    pages.push(result.value);
  }
  const costPence = budget.spent - before;
  const saved = await ctx.store.savePreview(ctx.briefId, {
    planId: input.plan.id,
    pages,
    changeNote: (input.change ?? "").slice(0, 1000),
    provider: ctx.provider.name,
    model: ctx.provider.model,
    costPence,
  });
  return { ok: true, value: saved, costPence };
}
