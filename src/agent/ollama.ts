import { config } from "../config/env.js";
import type { AIProvider, ProviderMessage, ProviderResult, ProviderTool } from "./provider.js";

type OllamaResponse = { message?: { content?: unknown; tool_calls?: Array<{ function?: { name?: unknown; arguments?: unknown } }> }; response?: unknown; error?: unknown };

export class OllamaProvider implements AIProvider {
  constructor(private readonly baseUrl = config.ollamaBaseUrl, private readonly model = config.ollamaModel, private readonly timeoutMs = 90_000) {}

  async ask(prompt: string, options: { temperature?: number; maxTokens?: number } = {}): Promise<string> {
    const result = await this.generate([{ role: "user", content: prompt }], undefined, options);
    return result.content.trim();
  }

  async generate(messages: ProviderMessage[], tools?: ProviderTool[], options: { temperature?: number; maxTokens?: number } = {}): Promise<ProviderResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ model: this.model, messages, tools, think: false, stream: false, keep_alive: "10m", options: { temperature: options.temperature ?? 0.1, num_predict: options.maxTokens ?? 240 } }),
      });
      if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`);
      const data = await response.json() as OllamaResponse;
      if (data.error) throw new Error("Ollama reported an error.");
      const content = typeof data.message?.content === "string" ? data.message.content : typeof data.response === "string" ? data.response : "";
      const toolCalls = (data.message?.tool_calls ?? []).flatMap((call) => {
        const fn = call.function;
        return typeof fn?.name === "string" ? [{ name: fn.name, arguments: fn.arguments }] : [];
      });
      if (!content.trim() && toolCalls.length === 0) throw new Error("Ollama returned an empty response.");
      return { content, toolCalls };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("Ollama request timed out.");
      throw error;
    } finally { clearTimeout(timer); }
  }
}

export const ollamaProvider = new OllamaProvider();
export const askOllama = (prompt: string) => ollamaProvider.ask(prompt);
