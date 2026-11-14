/**
 * What staff can do with template builds, and the rules around each. The model only writes drafts. A person releases
 * a build to the customer, and the approvals before going live stay entirely with staff. Mirrors website-ai-service.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider } from "@/lib/ai/provider";
import { AI_STAGES, loadBrief, logEvent, maxPenceFromEnv, moveStage, type Actor, type BriefRow, type ServiceResult } from "@/lib/ai/website-ai-service";
import type { Stage } from "@/lib/build-journey";
import { parseWebsiteAnswers, websiteQuote } from "@/lib/website-quote";
import type { RawAnswers } from "./answers";
import { buildSite } from "./build";
import { SupabaseSiteBuildStore } from "./build-store";
import { planForPages, type PlanLevel } from "./plans";

/**
 * The plan the customer's quote covered, or undefined when it isn't known. A site whose plan isn't known keeps every
 * section its sector has, so a missing quote never takes anything away.
 */
async function planFor(db: SupabaseClient, brief: Pick<BriefRow, "reference" | "tenant_id">): Promise<PlanLevel | undefined> {
  const { data } = await db.from("enquiries").select("answers").eq("reference", brief.reference).eq("tenant_id", brief.tenant_id).maybeSingle();
  const stored = (data as { answers: { type?: string; answers?: unknown } | null } | null)?.answers;
  const answers = stored?.type === "website" ? parseWebsiteAnswers(stored.answers) : null;
  const pages = answers ? websiteQuote(answers).pagesRequested : null;
  return pages ? planForPages(pages) : undefined;
}

export async function runSiteBuildStep(
  db: SupabaseClient,
  staff: Actor,
  provider: AiProvider,
  briefId: string,
  input: { sector?: string; answers?: RawAnswers; change?: string },
): Promise<ServiceResult<{ version: number; checksOk: boolean; issues: number; costPence: number }>> {
  const brief = await loadBrief(db, staff, briefId);
  if (!brief) return { ok: false, status: 404, error: "not_found" };
  if (!AI_STAGES.includes(brief.stage)) return { ok: false, status: 409, error: "The site build starts once the customer has paid." };
  const store = new SupabaseSiteBuildStore(db, staff.tenantId, staff.userId);
  const plan = await planFor(db, brief);
  const result = await buildSite({ provider, store, briefId, maxPence: maxPenceFromEnv() }, { ...input, change: input.change?.trim() || undefined, files: brief.brief.files, plan });
  if (!result.ok) {
    await logEvent(db, staff, briefId, "ai", { step: "site", ok: false, reason: result.reason, costPence: result.costPence });
    return { ok: false, status: result.errors ? 422 : 502, error: result.reason };
  }
  await logEvent(db, staff, briefId, "ai", { step: "site", ok: true, version: result.version, checksOk: result.checksOk, issues: result.issues.length, costPence: result.costPence, change: Boolean(input.change) });
  await moveStage(db, staff, brief, ["specification"], "building", "The site draft is ready.");
  return { ok: true, version: result.version, checksOk: result.checksOk, issues: result.issues.length, costPence: result.costPence };
}

type BuildRow = { id: string; brief_id: string; status: string; checks_ok: boolean };

async function loadBuild(db: SupabaseClient, staff: Actor, buildId: string): Promise<BuildRow | null> {
  const { data } = await db.from("website_site_builds").select("id, brief_id, status, checks_ok").eq("id", buildId).eq("tenant_id", staff.tenantId).maybeSingle();
  return (data as BuildRow | null) ?? null;
}

/**
 * A person releases a draft build to the customer. A build that failed the automatic checks needs `override`, so it
 * can't be released by accident. Any build released before it is withdrawn: one live address per website.
 */
export async function releaseSiteBuild(
  db: SupabaseClient,
  staff: Actor,
  buildId: string,
  override = false,
): Promise<ServiceResult<{ briefId: string; reference: string; email: string; name: string; stage: Stage }>> {
  const build = await loadBuild(db, staff, buildId);
  if (!build) return { ok: false, status: 404, error: "not_found" };
  if (build.status === "released") return { ok: false, status: 409, error: "That build is already with the customer." };
  if (!build.checks_ok && !override) return { ok: false, status: 409, error: "This build failed the automatic checks. Release it only if you have looked at it and are happy." };
  const brief = await loadBrief(db, staff, build.brief_id);
  if (!brief) return { ok: false, status: 404, error: "not_found" };
  await db.from("website_site_builds").update({ status: "withdrawn" }).eq("brief_id", brief.id).eq("status", "released");
  const { error } = await db.from("website_site_builds").update({ status: "released", released_by: staff.userId, released_at: new Date().toISOString() }).eq("id", buildId);
  if (error) return { ok: false, status: 500, error: "The build couldn't be released." };
  await logEvent(db, staff, brief.id, "preview", { action: "released", kind: "site", buildId, override: !build.checks_ok });
  const stage = await moveStage(db, staff, brief, ["building", "changes", "specification"], "preview", "Preview released to the customer.");
  return { ok: true, briefId: brief.id, reference: brief.reference, email: brief.email, name: brief.name, stage };
}

export async function withdrawSiteBuild(db: SupabaseClient, staff: Actor, buildId: string): Promise<ServiceResult> {
  const build = await loadBuild(db, staff, buildId);
  if (!build) return { ok: false, status: 404, error: "not_found" };
  if (build.status !== "released") return { ok: false, status: 409, error: "That build isn't with the customer." };
  const { error } = await db.from("website_site_builds").update({ status: "withdrawn" }).eq("id", buildId);
  if (error) return { ok: false, status: 500, error: "The build couldn't be withdrawn." };
  await logEvent(db, staff, build.brief_id, "preview", { action: "withdrawn", kind: "site", buildId });
  return { ok: true };
}
