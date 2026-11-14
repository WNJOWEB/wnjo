import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ID = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
let staff: { userId: string; email: string; tenantId: string; role: string } | null = null;
let provider: unknown = null;
let limited = false;
const calls: string[] = [];
const sent: { subject: string; to?: string }[] = [];

vi.mock("@/lib/quote-store", () => ({ serviceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { access_token: "tok_abcdefghijklmnopqrstuvwx" } }) }) }) }) }) }) }));
vi.mock("@/lib/staff-auth", () => ({ staffFromRequest: async () => staff }));
vi.mock("@/lib/rate-limit-shared", () => ({ sharedRateLimited: async () => limited }));
vi.mock("@/lib/ai/agent-runtime", () => ({ providerFromEnv: () => provider }));
vi.mock("@/lib/mailer", () => ({ notificationMailConfig: () => ({}), sendEmail: async (_c: unknown, m: { subject: string; to?: string }) => void sent.push(m) }));
vi.mock("@/lib/ai/website-ai-service", () => ({
  runPlanStep: async () => (calls.push("plan"), { ok: true, version: 1, costPence: 12 }),
  runPreviewStep: async (_d: unknown, _s: unknown, _p: unknown, _b: string, change?: string) => (calls.push(`preview:${change ?? ""}`), { ok: true, version: 1, costPence: 30 }),
  releasePreview: async () => (calls.push("release"), { ok: true, briefId: ID, reference: "WNJO-ABC123", email: "owner@cafe.co.uk", name: "Sam", stage: "preview" }),
  withdrawPreview: async () => (calls.push("withdraw"), { ok: true }),
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/admin/ai/website", { method: "POST", headers: { authorization: "Bearer t", "content-type": "application/json" }, body: JSON.stringify(body) }));

beforeEach(() => {
  staff = { userId: "u1", email: "staff@winjo.test", tenantId: "t1", role: "staff" };
  provider = null;
  limited = false;
  calls.length = 0;
  sent.length = 0;
});

describe("AI website steps", () => {
  it("needs a signed-in member of staff", async () => {
    staff = null;
    expect((await post({ action: "plan", briefId: ID })).status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("says plainly that the AI key is missing, and does nothing", async () => {
    const res = await post({ action: "plan", briefId: ID });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toMatch(/provider key/);
    expect(calls).toEqual([]);
  });

  it("makes a plan and a preview once the AI is connected, passing a customer's change through", async () => {
    provider = { name: "anthropic", model: "m" };
    expect((await post({ action: "plan", briefId: ID })).status).toBe(200);
    expect((await post({ action: "preview", briefId: ID, change: "Shorter headline" })).status).toBe(200);
    expect(calls).toEqual(["plan", "preview:Shorter headline"]);
  });

  it("rejects an id that isn't one", async () => {
    provider = { name: "anthropic", model: "m" };
    expect((await post({ action: "plan", briefId: "nope" })).status).toBe(422);
  });

  it("releases and withdraws without needing the AI, and emails the customer on release", async () => {
    expect((await post({ action: "release", previewId: ID })).status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("owner@cafe.co.uk");
    expect(sent[0].subject).toMatch(/ready to look at/);
    expect((await post({ action: "withdraw", previewId: ID })).status).toBe(200);
    expect(calls).toEqual(["release", "withdraw"]);
  });

  it("gives staff the private address of a preview", async () => {
    const res = await post({ action: "link", previewId: ID });
    expect(((await res.json()) as { url: string }).url).toContain("/preview/tok_abcdefghijklmnopqrstuvwx");
  });

  it("limits how often it can be used", async () => {
    limited = true;
    expect((await post({ action: "release", previewId: ID })).status).toBe(429);
  });
});
