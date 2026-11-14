import { NextResponse, type NextRequest } from "next/server";
import { providerFromEnv } from "@/lib/ai/agent-runtime";
import { serviceClient } from "@/lib/quote-store";
import { runTemplateTest, TEMPLATE_IDS } from "@/lib/site-template/template-test";
import { staffFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Eleven templates, each written up to three times.
export const maxDuration = 300;

/**
 * Staff only. Writes every template with the configured model and returns how many pass the checks and what they
 * cost. It makes real model calls, so it's a deliberate button, not something that runs on a schedule.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const staff = await staffFromRequest(db, request.headers.get("authorization"));
  if (!staff) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  if (staff.role !== "owner" && staff.role !== "admin") return NextResponse.json({ error: "Only the owner or an admin can run this test." }, { status: 403 });
  const body = ((await request.json().catch(() => null)) ?? {}) as { action?: unknown; runs?: unknown; template?: unknown; pages?: unknown; business?: unknown; rating?: unknown; note?: unknown };

  // Saving a judgement on one generated site. Nothing here calls the model.
  if (body.action === "rate") {
    const template = typeof body.template === "string" && TEMPLATE_IDS.includes(body.template) ? body.template : null;
    const business = typeof body.business === "string" ? body.business.slice(0, 120) : "";
    const rating = body.rating === "good" || body.rating === "needs_work" ? body.rating : null;
    if (!template || !business || !rating) return NextResponse.json({ error: "Choose good or needs work." }, { status: 422 });
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;
    const { error } = await db.from("template_test_ratings").insert({ tenant_id: staff.tenantId, template, business, rating, note, rated_by: staff.userId });
    if (error) return NextResponse.json({ error: "The rating couldn't be saved." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const provider = providerFromEnv();
  if (!provider) return NextResponse.json({ error: "The AI isn't connected yet. It needs ANTHROPIC_API_KEY in Vercel." }, { status: 503 });
  const runs = typeof body.runs === "number" ? body.runs : 1;
  // One template per request keeps each call well inside the time limit. Without one, every template is tested.
  const only = typeof body.template === "string" && TEMPLATE_IDS.includes(body.template) ? [body.template] : undefined;
  if (typeof body.template === "string" && !only) return NextResponse.json({ error: "Unknown template." }, { status: 422 });
  try {
    return NextResponse.json(await runTemplateTest(provider, runs, only, typeof body.pages === "number" ? body.pages : 1));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The test couldn't run." }, { status: 502 });
  }
}
