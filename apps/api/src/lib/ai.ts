import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";

/**
 * AI provider abstraction. Today it is backed by Claude; the interface is
 * kept small so a future first-party Caishen model can be dropped in behind
 * the same `streamInsights` contract without touching the routes.
 */
export interface AiProvider {
  streamInsights(
    prompt: string,
    onDelta: (text: string) => void,
  ): Promise<string>;
}

const SYSTEM_PROMPT = `You are Caishen, a personal finance assistant.
Given a user's financial context, produce concise, actionable insights about
spending, saving, and budgeting. Answer in the user's language (Portuguese by
default). Be specific and reference concrete numbers when available.`;

class ClaudeProvider implements AiProvider {
  private client = new Anthropic({ apiKey: env.anthropicApiKey });

  async streamInsights(
    prompt: string,
    onDelta: (text: string) => void,
  ): Promise<string> {
    const stream = this.client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      // Opus 4.8 runs without thinking by default. Enable adaptive thinking
      // (`thinking: { type: "adaptive" }`) once the SDK version exposes it.
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    stream.on("text", (delta) => onDelta(delta));

    const final = await stream.finalMessage();
    return final.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
}

export const aiProvider: AiProvider = new ClaudeProvider();
