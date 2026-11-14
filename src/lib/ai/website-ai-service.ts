/**
 * What staff can do with the AI website steps, and the rules around each. The model only writes drafts. A person
 * releases a preview to the customer, and the four approvals before going live stay entirely with staff.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stage } from "@/lib/build-journey";
import { WEBSITE_PLANS } from "@/lib/pricing";
import { parseWebsiteAnswers, websiteQuote } from "@/lib/website-quote";
import type { WebsiteBrief } from "@/lib/website-brief";
import type { AiProvider } from "./provider";
import { DEFAULT_MAX_PENCE_PER_BRIEF, generatePlan, generatePreview } from "./website-pipeline";
import { SupabaseWebsiteAiStore } from "./website-ai-store";
import { PLAN_LIMITS } from "./website-plan";

/** AI steps only run once the customer has paid. Earlier stages have no plan to build. */
export const AI_STAGES: Stage[] = ["specification", "building", "preview", "changes", "approval"];

/** Who is acting: a signed-in member of staff, or the system running the first draft after a payment. */
export type Actor = { userId: string | null; email: string | null; tenantId: string; kind?: "staff" | "system" };

export type ServiceResult<T extends object = object> = ({ ok: true } & T) | { ok: false; status: number; error: string };

export type BriefRow = {
  id: string;
  tenant_id: string;
  reference: string;
  email: string;
  name: string;
  business_name: string | null;
  stage: Stage;
  brief: WebsiteBrief;
  figures: { package?: string };
};

export const maxPenceFromEnv = (env: Record<string, string | undefined> = process.env): number => {
  const n = Number(env.AI_MAX_PENCE_PER_BRIEF);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_PENCE_PER_BRIEF;
};

export async function loadBrief(db: SupabaseClient, staff: Actor, briefId: string): Promise<BriefRow | null> {
  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, business_name, stage, brief, figures")
    .eq("id", briefId)
    .eq("tenant_id", staff.tenantId)
    .maybeSingle();
  return (data as BriefRow | null) ?? null;
}

/** A buy-outright website is quoted by staff from the brief, so the brief itself has no page limit; this is only a sanity cap. */
export const PROPOSAL_MAX_PAGES = 100;

/** The most pages this website may have: what the customer's quote covered, or the package's own allowance. */
export async function pagesAllowedFor(db: SupabaseClient, brief: Pick<BriefRow, "reference" | "tenant_id" | "figures"> & { route?: string }): Promise<number> {
  if (brief.route === "proposal") return PROPOSAL_MAX_PAGES;
  const { data } = await db.from("enquiries").select("answers").eq("reference", brief.reference).eq("tenant_id", brief.tenant_id).maybeSingle();
  const stored = (data as { answers: { type?: string; answers?: unknown } | null } | null)?.answers;
  const answers = stored?.type === "website" ? parseWebsiteAnswers(stored.answers) : null;
  if (answers) return websiteQuote(answers).pagesRequested ?? PLAN_LIMITS.pages;
  const plan = Object.values(WEBSITE_PLANS).find((p) => p.name === brief.figures.package);
  return plan?.pages ?? 5;
}

export async function logEvent(db: SupabaseClient, staff: Actor, briefId: string, kind: string, detail: Record<string, unknown>) {
  const { error } = await db.from("website_brief_events").insert({
    tenant_id: staff.tenantId,
    brief_id: briefId,
    kind,
    detail,
    actor_type: staff.kind ?? "staff",
    actor_user: staff.userId,
    actor_email: staff.email,
  });
  if (error) console.error(`Brief event not recorded: ${error.code ?? "unknown"}`);
}

export async function moveStage(db: SupabaseClient, staff: Actor, brief: BriefRow, from: Stage[], to: Stage, note: string): Promise<Stage> {
  if (!from.includes(brief.stage)) return brief.stage;
  const { data, error } = await db.from("website_briefs").update({ stage: to }).eq("id", brief.id).eq("stage", brief.stage).select("id");
  if (error || !((data ?? []) as unknown[]).length) return brief.stage;
  await logEvent(db, staff, brief.id, "stage", { from: brief.stage, to, note });
  return to;
}

/** Step 1: the AI reads the brief and drafts the plan. A build waiting at "AI processing" moves on to "Website generation". */
export async function runPlanStep(db: SupabaseClient, staff: Actor, provider: AiProvider, briefId: string): Promise<ServiceResult<{ version: number; costPence: number }>> {
  const brief = await loadBrief(db, staff, briefId);
  if (!brief) return { ok: false, status: 404, error: "not_found" };
  if (!AI_STAGES.includes(brief.stage)) return { ok: false, status: 409, error: "The AI plan starts once the customer has paid." };
  const store = new SupabaseWebsiteAiStore(db, staff.tenantId, staff.userId);
  const result = await generatePlan(
    { provider, store, briefId, maxPence: maxPenceFromEnv() },
    { businessName: brief.business_name || brief.name, packageName: brief.figures.package ?? "Website", pagesAllowed: await pagesAllowedFor(db, brief), brief: brief.brief },
  );
  if (!result.ok) {
    await logEvent(db, staff, briefId, "ai", { step: "plan", ok: false, reason: result.reason, costPence: result.costPence });
    return { ok: false, status: 502, error: result.reason };
  }
  await logEvent(db, staff, briefId, "ai", { step: "plan", ok: true, version: result.value.version, costPence: result.costPence });
  await moveStage(db, staff, brief, ["specification"], "building", "The AI plan is ready.");
  return { ok: true, version: result.value.version, costPence: result.costPence };
}

/** Step 2: the AI writes the copy for every page of the latest plan, as a draft preview. Nothing is shown to the customer. */
export async function runPreviewStep(
  db: SupabaseClient,
  staff: Actor,
  provider: AiProvider,
  briefId: string,
  change?: string,
): Promise<ServiceResult<{ version: number; costPence: number }>> {
  const brief = await loadBrief(db, staff, briefId);
  if (!brief) return { ok: false, status: 404, error: "not_found" };
  if (!AI_STAGES.includes(brief.stage)) return { ok: false, status: 409, error: "The AI preview starts once the customer has paid." };
  const store = new SupabaseWebsiteAiStore(db, staff.tenantId, staff.userId);
  const plan = await store.latestPlan(briefId);
  if (!plan) return { ok: false, status: 409, error: "Make the plan first." };
  const result = await generatePreview(
    { provider, store, briefId, maxPence: maxPenceFromEnv() },
    { businessName: brief.business_name || brief.name, brief: brief.brief, plan, change: change?.trim() || undefined },
  );
  if (!result.ok) {
    await logEvent(db, staff, briefId, "ai", { step: "preview", ok: false, reason: result.reason, costPence: result.costPence });
    return { ok: false, status: 502, error: result.reason };
  }
  await logEvent(db, staff, briefId, "ai", { step: "preview", ok: true, version: result.value.version, costPence: result.costPence, change: Boolean(change) });
  return { ok: true, version: result.value.version, costPence: result.costPence };
}

/**
 * A person releases a draft preview to the customer. Any preview released before it is withdrawn, so there is one
 * live address per website. A build waiting for the preview moves to "Awaiting customer review".
 */
export async function releasePreview(
  db: SupabaseClient,
  staff: Actor,
  previewId: string,
): Promise<ServiceResult<{ briefId: string; reference: string; email: string; name: string; stage: Stage }>> {
  const { data } = await db.from("website_previews").select("id, brief_id, status").eq("id", previewId).eq("tenant_id", staff.tenantId).maybeSingle();
  const preview = data as { id: string; brief_id: string; status: string } | null;
  if (!preview) return { ok: false, status: 404, error: "not_found" };
  if (preview.status === "released") return { ok: false, status: 409, error: "That preview is already with the customer." };
  const brief = await loadBrief(db, staff, preview.brief_id);
  if (!brief) return { ok: false, status: 404, error: "not_found" };
  await db.from("website_previews").update({ status: "withdrawn" }).eq("brief_id", brief.id).eq("status", "released");
  const { error } = await db
    .from("website_previews")
    .update({ status: "released", released_by: staff.userId, released_at: new Date().toISOString() })
    .eq("id", previewId);
  if (error) return { ok: false, status: 500, error: "The preview couldn't be released." };
  await logEvent(db, staff, brief.id, "preview", { action: "released", previewId });
  const stage = await moveStage(db, staff, brief, ["building", "changes", "specification"], "preview", "Preview released to the customer.");
  return { ok: true, briefId: brief.id, reference: brief.reference, email: brief.email, name: brief.name, stage };
}

export async function withdrawPreview(db: SupabaseClient, staff: Actor, previewId: string): Promise<ServiceResult> {
  const { data } = await db.from("website_previews").select("id, brief_id, status").eq("id", previewId).eq("tenant_id", staff.tenantId).maybeSingle();
  const preview = data as { id: string; brief_id: string; status: string } | null;
  if (!preview) return { ok: false, status: 404, error: "not_found" };
  if (preview.status !== "released") return { ok: false, status: 409, error: "That preview isn't with the customer." };
  const { error } = await db.from("website_previews").update({ status: "withdrawn" }).eq("id", previewId);
  if (error) return { ok: false, status: 500, error: "The preview couldn't be withdrawn." };
  await logEvent(db, staff, preview.brief_id, "preview", { action: "withdrawn", previewId });
  return { ok: true };
}
