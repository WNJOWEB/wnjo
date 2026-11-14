import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseRunStore } from "@/lib/ai/store";

/** A minimal fake of the query builder, recording what was asked for. */
function fakeDb(results: Record<string, { data?: unknown; error?: { message: string } | null }>) {
  const calls: Array<{ table: string; op: string; payload?: unknown; filters: Array<[string, unknown]> }> = [];
  const db = {
    from(table: string) {
      const call = { table, op: "select", payload: undefined as unknown, filters: [] as Array<[string, unknown]> };
      calls.push(call);
      const result = results[table] ?? { data: null, error: null };
      const builder = {
        select() { if (call.op !== "insert" && call.op !== "update") call.op = "select"; return builder; },
        insert(p: unknown) { call.op = "insert"; call.payload = p; return builder; },
        update(p: unknown) { call.op = "update"; call.payload = p; return builder; },
        eq(col: string, val: unknown) { call.filters.push([col, val]); return builder; },
        single: async () => result,
        maybeSingle: async () => result,
        then(resolve: (v: unknown) => void) { resolve(result); },
      };
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient, calls };
}

describe("SupabaseRunStore", () => {
  it("maps a task row into the engine's shape", async () => {
    const { db } = fakeDb({
      ai_tasks: { data: { id: "t1", tenant_id: "w", agent_key: "developer", project_id: null, title: "Fix", status: "queued", attempts: 0, max_attempts: 3, budget_pence: 500, spent_pence: 7 } },
    });
    const task = await new SupabaseRunStore(db).loadTask("t1");
    expect(task).toMatchObject({ id: "t1", tenantId: "w", agentKey: "developer", projectId: null, budgetPence: 500, spentPence: 7 });
  });

  it("throws when a task can't be loaded, rather than running with nothing", async () => {
    const { db } = fakeDb({ ai_tasks: { data: null, error: { message: "not found" } } });
    await expect(new SupabaseRunStore(db).loadTask("missing")).rejects.toThrow(/not found/);
  });

  it("scopes permission reads to the tenant and agent", async () => {
    const { db, calls } = fakeDb({ ai_permissions: { data: [{ tool: "read_project", allowed: true }] } });
    const perms = await new SupabaseRunStore(db).loadPermissions("w", "developer");
    expect(perms).toEqual({ read_project: true });
    expect(calls[0].filters).toEqual([["tenant_id", "w"], ["agent_key", "developer"]]);
  });

  it("writes run start, finish and tool calls with the right fields", async () => {
    const { db, calls } = fakeDb({ ai_runs: { data: { id: "r1" } } });
    const store = new SupabaseRunStore(db);
    expect(await store.startRun({ taskId: "t1", tenantId: "w", attempt: 1, provider: "anthropic", model: "m" })).toBe("r1");
    await store.finishRun("r1", { status: "failed", inputTokens: 3, outputTokens: 4, costPence: 2, error: "boom" });
    await store.recordToolCall({ runId: "r1", tenantId: "w", tool: "read_project", allowed: false, denialReason: "no", args: { id: "p" } });
    const runInsert = calls.find((c) => c.table === "ai_runs" && c.op === "insert");
    expect(runInsert?.payload).toMatchObject({ task_id: "t1", attempt: 1, provider: "anthropic" });
    const finish = calls.find((c) => c.table === "ai_runs" && c.op === "update");
    expect(finish?.payload).toMatchObject({ status: "failed", input_tokens: 3, cost_pence: 2, error: "boom" });
    const tool = calls.find((c) => c.table === "ai_tool_calls");
    expect(tool?.payload).toMatchObject({ run_id: "r1", allowed: false, denial_reason: "no" });
  });

  it("surfaces a failed write as an error", async () => {
    const { db } = fakeDb({ ai_tasks: { data: null, error: { message: "permission denied" } } });
    await expect(new SupabaseRunStore(db).setTaskStatus("t1", "failed")).rejects.toThrow(/permission denied/);
  });
});
