import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ProviderError, type AiProvider, type ProviderMessage, type ProviderResponse, type ToolSpec } from "@/lib/ai/provider";

/**
 * Anthropic (Claude) provider, through the official SDK, and the only model provider we use. Only the key is
 * required: the model defaults to Claude Haiku 5.5 with low thinking, and the prices default to Anthropic's published
 * rates. Every default can be overridden with a setting, so the model can change without a code change.
 * Not yet verified against the live service; it needs ANTHROPIC_API_KEY.
 *
 * Settings: ANTHROPIC_API_KEY (required), and optionally ANTHROPIC_MODEL, ANTHROPIC_EFFORT (low, medium or high),
 * ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS, ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS and ANTHROPIC_MAX_TOKENS.
 * Prices are in pence per million tokens, so a dollar price needs converting first.
 */

export type AnthropicConfig = {
  apiKey: string;
  model: string;
  inputPencePerMillionTokens: number;
  outputPencePerMillionTokens: number;
  effort?: "low" | "medium" | "high";
  maxTokens: number;
};

const DEFAULT_MAX_TOKENS = 4096;
export const DEFAULT_MODEL = "claude-haiku-5-5";
/**
 * Haiku 5.5 costs $0.10 in and $0.50 out per million tokens. At about 1.35 dollars to the pound that is 7.4p and 37p,
 * rounded up so the spend we record is never too low. Set the price settings if the model or the rate changes.
 */
export const DEFAULT_INPUT_PENCE_PER_MILLION = 8;
export const DEFAULT_OUTPUT_PENCE_PER_MILLION = 40;

export function anthropicConfigFromEnv(env: Record<string, string | undefined> = process.env): AnthropicConfig {
  const need = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`${key} is not configured`);
    return value;
  };
  const num = (key: string, fallback: number) => {
    if (!env[key]?.trim()) return fallback;
    const n = Number(env[key]);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${key} must be a non-negative number`);
    return n;
  };
  const effort = env.ANTHROPIC_EFFORT?.trim() || "low";
  if (!["low", "medium", "high"].includes(effort)) throw new Error("ANTHROPIC_EFFORT must be low, medium or high");
  const maxTokens = env.ANTHROPIC_MAX_TOKENS?.trim() ? Number(env.ANTHROPIC_MAX_TOKENS) : DEFAULT_MAX_TOKENS;
  if (!Number.isInteger(maxTokens) || maxTokens < 256) throw new Error("ANTHROPIC_MAX_TOKENS must be a whole number of at least 256");
  return {
    apiKey: need("ANTHROPIC_API_KEY"),
    model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    inputPencePerMillionTokens: num("ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS", DEFAULT_INPUT_PENCE_PER_MILLION),
    outputPencePerMillionTokens: num("ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS", DEFAULT_OUTPUT_PENCE_PER_MILLION),
    effort: effort as AnthropicConfig["effort"],
    maxTokens,
  };
}

/** The part of the SDK client this provider uses, so tests can supply a stand-in. */
export type MessagesClient = { messages: { create(body: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> } };

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  readonly model: string;
  private readonly client: MessagesClient;

  constructor(
    private readonly config: AnthropicConfig,
    client?: MessagesClient,
  ) {
    this.model = config.model;
    this.client = client ?? new Anthropic({ apiKey: config.apiKey, maxRetries: 1, timeout: 60_000 });
  }

  async complete(input: { system: string; messages: ProviderMessage[]; tools: ToolSpec[] }): Promise<ProviderResponse> {
    // The API needs the conversation to start with, and alternate from, a user turn. Tool results travel as user text.
    const messages: Anthropic.MessageParam[] = input.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.role === "tool" ? `Tool result (${m.toolName ?? "tool"}): ${m.content}` : m.content,
    }));

    let message: Anthropic.Message;
    try {
      message = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: input.system,
        messages,
        ...(this.config.effort ? { output_config: { effort: this.config.effort } } : {}),
        ...(input.tools.length > 0
          ? { tools: input.tools.map((t) => ({ name: t.name, description: t.description, input_schema: { type: "object" as const, properties: {} } })) }
          : {}),
      });
    } catch (error) {
      throw toProviderError(error);
    }
    return parseAnthropicMessage(message, this.config);
  }
}

/** Sorts SDK failures into the three kinds the engine tells apart. */
export function toProviderError(error: unknown): ProviderError {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new ProviderError(`Provider refused the credentials (${error.status})`, "authentication");
  }
  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
    return new ProviderError("Provider unavailable", "transient");
  }
  if (error instanceof Anthropic.APIError) return new ProviderError(`Provider rejected the request (${error.status ?? "unknown"})`, "invalid_response");
  throw error;
}

/** Turns a reply into the engine's shape. Anything unexpected is an invalid response, not a guess. */
export function parseAnthropicMessage(message: Anthropic.Message, config: AnthropicConfig): ProviderResponse {
  if (message.stop_reason === "refusal") throw new ProviderError("The model declined the request", "invalid_response");
  const inputTokens = Math.max(0, Math.floor(message.usage?.input_tokens ?? 0));
  const outputTokens = Math.max(0, Math.floor(message.usage?.output_tokens ?? 0));
  const costPence = Math.ceil((inputTokens * config.inputPencePerMillionTokens + outputTokens * config.outputPencePerMillionTokens) / 1_000_000);
  const usage = { inputTokens, outputTokens, costPence };

  const call = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (call) {
    if (!call.input || typeof call.input !== "object" || Array.isArray(call.input)) {
      throw new ProviderError("Provider returned tool arguments that are not an object", "invalid_response");
    }
    return { kind: "tool_call", tool: call.name, args: call.input as Record<string, unknown>, usage };
  }
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  if (!text && message.stop_reason !== "end_turn") throw new ProviderError("Provider returned no text", "invalid_response");
  return { kind: "final", text, usage };
}
