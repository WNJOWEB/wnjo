import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/runner", () => ({ runTask: vi.fn() }));
vi.mock("@/lib/ai/store", () => ({ SupabaseRunStore: class {} }));
vi.mock("@/lib/ai/budget-loader", () => ({ loadBudgetLimits: vi.fn() }));
vi.mock("@/lib/ai/read-tools", () => ({ buildReadToolRegistry: vi.fn() }));

import { providerFromEnv } from "./agent-runtime";

describe("providerFromEnv", () => {
  it("has no provider without a key", () => {
    expect(providerFromEnv({})).toBeNull();
    expect(providerFromEnv({ ANTHROPIC_API_KEY: "  " })).toBeNull();
  });
  it("needs only the key: Claude Haiku 5.5 with low thinking, and its published prices, are the defaults", () => {
    const p = providerFromEnv({ ANTHROPIC_API_KEY: "k" });
    expect(p?.name).toBe("anthropic");
    expect(p?.model).toBe("claude-haiku-5-5");
  });
  it("lets settings change the model", () => {
    expect(providerFromEnv({ ANTHROPIC_API_KEY: "k", ANTHROPIC_MODEL: "claude-sonnet-5-5" })?.model).toBe("claude-sonnet-5-5");
  });
  it("has no provider when a setting is wrong, instead of guessing", () => {
    expect(providerFromEnv({ ANTHROPIC_API_KEY: "k", ANTHROPIC_EFFORT: "max" })).toBeNull();
    expect(providerFromEnv({ ANTHROPIC_API_KEY: "k", ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS: "cheap" })).toBeNull();
  });
  it("ignores the old Grok settings", () => {
    expect(providerFromEnv({ XAI_API_KEY: "k", XAI_MODEL: "grok", XAI_INPUT_PENCE_PER_MILLION_TOKENS: "1", XAI_OUTPUT_PENCE_PER_MILLION_TOKENS: "2", AI_PROVIDER: "xai" })).toBeNull();
  });
});
