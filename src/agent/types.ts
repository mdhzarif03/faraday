export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type AgentResult = {
  response: string;
  toolUsed?: string;
};
