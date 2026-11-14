/**
 * One template build: check the customer's answers, have the model write the wording, run the checks, and save the
 * result as a draft. Like the other AI steps it never moves a build's stage and never shows anything to the customer:
 * a person reviews the draft and releases it. A build that fails the checks is still saved, marked as failed with
 * its reasons, so the owner can look at it and decide.
 */
import type { AiProvider } from "@/lib/ai/provider";
import { parseAnswers, type RawAnswers } from "./answers";
import type { CheckIssue } from "./checks";
import { applyPlan, type PlanLevel } from "./plans";
import { presetFor } from "./presets";
import { pickPhotos } from "./photos";
import type { CustomerFacts, SiteContent } from "./schema";
import type { BriefFile } from "@/lib/website-brief";
import { writeSite } from "./write";

export type SiteBuildDraft = {
  sector: string;
  answers: RawAnswers;
  content: SiteContent;
  issues: CheckIssue[];
  checksOk: boolean;
  changeNote: string;
  provider: string;
  model: string;
  costPence: number;
};

/** Everything the build reads or writes, so it can be tested without a database. */
export interface SiteBuildStore {
  /** All AI spend on this website so far: plans, previews and site builds together. */
  spentPence(briefId: string): Promise<number>;
  latest(briefId: string): Promise<{ id: string; version: number; sector: string; answers: RawAnswers } | null>;
  save(briefId: string, draft: SiteBuildDraft): Promise<{ id: string; version: number }>;
}

export type BuildInput = {
  /** Required for the first build. A revision leaves both out and reuses the last build's. */
  sector?: string;
  answers?: RawAnswers;
  change?: string;
  /** The customer's uploads. Images become the hero and gallery; logos and documents are left out. */
  files?: BriefFile[];
  defaultColour?: string;
  /** The customer's plan, which decides the sections. Left out when it isn't known: the sector's full set is used. */
  plan?: PlanLevel;
};

export type BuildResult =
  | { ok: true; id: string; version: number; checksOk: boolean; issues: CheckIssue[]; costPence: number }
  | { ok: false; reason: string; errors?: Record<string, string>; costPence: number };

const FALLBACK_COLOUR = "#1f3a34";

export async function buildSite(ctx: { provider: AiProvider; store: SiteBuildStore; briefId: string; maxPence: number }, input: BuildInput): Promise<BuildResult> {
  let sector = input.sector;
  let answers = input.answers;
  if (!sector || !answers) {
    const last = await ctx.store.latest(ctx.briefId);
    if (!last) return { ok: false, reason: "There are no answers to build from yet.", costPence: 0 };
    sector = sector ?? last.sector;
    answers = answers ?? last.answers;
  }

  const base = presetFor(sector);
  if (!base) return { ok: false, reason: `There is no template for "${sector}" yet.`, costPence: 0 };
  const preset = applyPlan(base, input.plan);

  const parsed = parseAnswers(answers, preset, { colour: input.defaultColour ?? FALLBACK_COLOUR });
  if (!parsed.ok) return { ok: false, reason: Object.values(parsed.errors)[0], errors: parsed.errors, costPence: 0 };
  const facts: CustomerFacts = parsed.facts;

  const photos = pickPhotos(input.files ?? []);
  const written = await writeSite(
    { provider: ctx.provider, spentPence: await ctx.store.spentPence(ctx.briefId), maxPence: ctx.maxPence },
    { preset, facts, look: parsed.look, colour: parsed.colour, heroPhoto: photos.hero, images: photos.gallery, change: input.change?.trim() || undefined },
  );
  const content = written.content;
  if (!content) return { ok: false, reason: written.ok ? "No content." : written.reason, costPence: written.costPence };

  const issues = written.ok ? [] : (written.issues ?? []);
  const saved = await ctx.store.save(ctx.briefId, {
    sector,
    answers,
    content,
    issues,
    checksOk: written.ok,
    changeNote: (input.change ?? "").slice(0, 1000),
    provider: ctx.provider.name,
    model: ctx.provider.model,
    costPence: written.costPence,
  });
  return { ok: true, id: saved.id, version: saved.version, checksOk: written.ok, issues, costPence: written.costPence };
}
