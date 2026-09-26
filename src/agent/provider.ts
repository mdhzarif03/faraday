export interface ProviderTool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}
export interface ProviderMessage { role: "system" | "user" | "tool"; content: string; }
export interface ProviderResult { content: string; toolCalls: Array<{ name: string; arguments: unknown }>; }
export interface AIProvider {
  ask(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>;
  generate(messages: ProviderMessage[], tools?: ProviderTool[], options?: { temperature?: number; maxTokens?: number }): Promise<ProviderResult>;
}
