/**
 * Model provider abstraction. The orchestration engine depends only on this interface, so the provider (today
 * Claude, through `anthropic.ts`) can be replaced later without changing agent logic. Costs are integer pence.
 */

export type ProviderMessage = { role: "user" | "assistant" | "tool"; content: string; toolName?: string };

export type ToolSpec = { name: string; description: string };

export type ProviderUsage = { inputTokens: number; outputTokens: number; costPence: number };

export type ProviderResponse =
  | { kind: "tool_call"; tool: string; args: Record<string, unknown>; usage: ProviderUsage }
  | { kind: "final"; text: string; usage: ProviderUsage };

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  complete(input: { system: string; messages: ProviderMessage[]; tools: ToolSpec[] }): Promise<ProviderResponse>;
}

/** Failures the engine can tell apart, because each needs a different response. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "transient" | "authentication" | "invalid_response",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
