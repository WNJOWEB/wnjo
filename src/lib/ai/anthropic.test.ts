import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { ProviderError } from "./provider";
import { AnthropicProvider, anthropicConfigFromEnv, parseAnthropicMessage, toProviderError, type AnthropicConfig, type MessagesClient } from "./anthropic";

const config: AnthropicConfig = { apiKey: "k", model: "claude-haiku-5-5", inputPencePerMillionTokens: 8, outputPencePerMillionTokens: 40, maxTokens: 4096 };
const env = { ANTHROPIC_API_KEY: "k", ANTHROPIC_MODEL: "claude-haiku-5-5", ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS: "8", ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS: "40" };

const message = (over: Partial<Anthropic.Message> = {}): Anthropic.Message =>
  ({ id: "m", type: "message", role: "assistant", model: "m", content: [{ type: "text", text: "{\"ok\":true}" }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 500 }, ...over }) as Anthropic.Message;

const clientReturning = (m: Anthropic.Message | Error, seen: Anthropic.MessageCreateParamsNonStreaming[] = []): MessagesClient => ({
  messages: { async create(body) { seen.push(body); if (m instanceof Error) throw m; return m; } },
});

describe("anthropicConfigFromEnv", () => {
  it("needs only the key, and defaults to Haiku 5.5 with low thinking and its published prices, rounded up", () => {
    expect(anthropicConfigFromEnv({ ANTHROPIC_API_KEY: "k" })).toEqual({
      apiKey: "k",
      model: "claude-haiku-5-5",
      inputPencePerMillionTokens: 8,
      outputPencePerMillionTokens: 40,
      effort: "low",
      maxTokens: 4096,
    });
  });
  it("lets a setting replace each default, and refuses a wrong price", () => {
    const c = anthropicConfigFromEnv({ ANTHROPIC_API_KEY: "k", ANTHROPIC_MODEL: "m", ANTHROPIC_EFFORT: "high", ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS: "150", ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS: "0" });
    expect(c).toMatchObject({ model: "m", effort: "high", inputPencePerMillionTokens: 150, outputPencePerMillionTokens: 0 });
    expect(() => anthropicConfigFromEnv({ ANTHROPIC_API_KEY: "k", ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS: "-1" })).toThrow(/OUTPUT_PENCE/);
  });
  it("reads the settings, with a default token limit", () => {
    expect(anthropicConfigFromEnv(env)).toMatchObject({ model: "claude-haiku-5-5", inputPencePerMillionTokens: 8, maxTokens: 4096 });
  });
  it("names what is missing or wrong", () => {
    expect(() => anthropicConfigFromEnv({})).toThrow(/ANTHROPIC_API_KEY/);
    expect(() => anthropicConfigFromEnv({ ...env, ANTHROPIC_EFFORT: "max" })).toThrow(/EFFORT/);
    expect(() => anthropicConfigFromEnv({ ...env, ANTHROPIC_MAX_TOKENS: "5" })).toThrow(/MAX_TOKENS/);
    expect(anthropicConfigFromEnv({ ...env, ANTHROPIC_EFFORT: "low" }).effort).toBe("low");
  });
});

describe("AnthropicProvider", () => {
  it("sends the system prompt and messages, and costs the reply in pence, rounded up", async () => {
    const seen: Anthropic.MessageCreateParamsNonStreaming[] = [];
    const p = new AnthropicProvider(config, clientReturning(message(), seen));
    const r = await p.complete({ system: "sys", messages: [{ role: "user", content: "hi" }, { role: "tool", toolName: "t", content: "x" }], tools: [] });
    expect(r).toEqual({ kind: "final", text: "{\"ok\":true}", usage: { inputTokens: 1000, outputTokens: 500, costPence: 1 } });
    expect(seen[0]).toMatchObject({ model: "claude-haiku-5-5", system: "sys", max_tokens: 4096 });
    expect(seen[0].messages[1].content).toBe("Tool result (t): x");
    expect(seen[0]).not.toHaveProperty("tools");
    expect(seen[0]).not.toHaveProperty("output_config");
  });

  it("passes effort and tools only when set", async () => {
    const seen: Anthropic.MessageCreateParamsNonStreaming[] = [];
    await new AnthropicProvider({ ...config, effort: "low" }, clientReturning(message(), seen)).complete({ system: "s", messages: [{ role: "user", content: "q" }], tools: [{ name: "lookup", description: "d" }] });
    expect(seen[0]).toMatchObject({ output_config: { effort: "low" }, tools: [{ name: "lookup", description: "d" }] });
  });

  it("returns a tool call", () => {
    const r = parseAnthropicMessage(message({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "lookup", input: { a: 1 } } as never] }), config);
    expect(r).toMatchObject({ kind: "tool_call", tool: "lookup", args: { a: 1 } });
  });

  it("treats a refusal or an empty reply as unusable, not as an answer", () => {
    expect(() => parseAnthropicMessage(message({ stop_reason: "refusal" }), config)).toThrow(ProviderError);
    expect(() => parseAnthropicMessage(message({ content: [], stop_reason: "max_tokens" }), config)).toThrow(/no text/);
  });

  it("sorts failures into the engine's kinds", () => {
    const err = (status: number) => Anthropic.APIError.generate(status, { type: "error", error: { type: "x", message: "m" } }, "m", new Headers());
    expect(toProviderError(err(401)).kind).toBe("authentication");
    expect(toProviderError(err(429)).kind).toBe("transient");
    expect(toProviderError(err(500)).kind).toBe("transient");
    expect(toProviderError(err(400)).kind).toBe("invalid_response");
    expect(() => toProviderError(new TypeError("bug"))).toThrow(TypeError);
  });
});
