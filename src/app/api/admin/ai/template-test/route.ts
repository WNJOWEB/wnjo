import { NextResponse, type NextRequest } from "next/server";
import { providerFromEnv } from "@/lib/ai/agent-runtime";
import { serviceClient } from "@/lib/quote-store";
import { runTemplateTest } from "@/lib/site-template/template-test";
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
  const provider = providerFromEnv();
  if (!provider) return NextResponse.json({ error: "The AI isn't connected yet. It needs ANTHROPIC_API_KEY in Vercel." }, { status: 503 });
  const body = ((await request.json().catch(() => null)) ?? {}) as { runs?: unknown };
  const runs = typeof body.runs === "number" ? body.runs : 1;
  try {
    return NextResponse.json(await runTemplateTest(provider, runs));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The test couldn't run." }, { status: 502 });
  }
}
