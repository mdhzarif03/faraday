import { askOllama } from "./ollama.js";
import { tools } from "./tools.js";
import { FARADAY_SYSTEM_PROMPT } from "./prompts.js";
import type { AgentResult, ToolCall } from "./types.js";

function extractToolCall(response: string): ToolCall | null {
  const wrappedMatch = response.match(
    /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/i,
  );

  if (wrappedMatch?.[1]) {
    try {
      const parsed = JSON.parse(wrappedMatch[1]);

      if (
        typeof parsed.name === "string" &&
        typeof parsed.arguments === "object" &&
        parsed.arguments !== null
      ) {
        return parsed as ToolCall;
      }
    } catch {
      // Continue to raw JSON detection.
    }
  }

  const jsonMatch = response.match(
    /\{"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[\s\S]*?\}\}/,
  );

  if (jsonMatch?.[0]) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);

      if (
        typeof parsed.name === "string" &&
        typeof parsed.arguments === "object" &&
        parsed.arguments !== null
      ) {
        return parsed as ToolCall;
      }
    } catch {
      // Invalid JSON.
    }
  }

  return null;
}

function sanitizeToolResult(result: unknown): unknown {
  if (!Array.isArray(result)) {
    return result;
  }

  return result.map((email) => {
    if (typeof email !== "object" || email === null) {
      return email;
    }

    const item = email as Record<string, unknown>;

    const subject = typeof item.subject === "string" ? item.subject : "";

    const sensitivePattern =
      /verification\s*code|security\s*code|one[-\s]?time\s*code|otp|login\s*code|password|passcode|authentication\s*code/i;

    const safeSubject = sensitivePattern.test(subject)
      ? "[Security-related email]"
      : subject;

    return {
      id: item.id,
      threadId: item.threadId,
      from: item.from,
      subject: safeSubject,
      date: item.date,
    };
  });
}

export async function runAgent(userMessage: string): Promise<AgentResult> {
  const prompt = `
${FARADAY_SYSTEM_PROMPT}

The user said:

${userMessage}

Decide whether you need a tool.

If you need Gmail data, output ONLY the JSON tool call.
If you do not need a tool, answer the user normally.
`;

  const firstResponse = await askOllama(prompt);

  const toolCall = extractToolCall(firstResponse);

  if (!toolCall) {
    return {
      response: firstResponse.trim(),
    };
  }

  if (!(toolCall.name in tools)) {
    return {
      response: "I don't have access to that capability yet.",
    };
  }

  const tool = tools[toolCall.name as keyof typeof tools];

  const toolResult = await tool(toolCall.arguments as never);

  const safeResult = sanitizeToolResult(toolResult);

  const finalPrompt = `
You are Faraday, a private personal AI assistant.

The user asked:

${userMessage}

The Gmail tool returned:

${JSON.stringify(safeResult, null, 2)}

Answer the user's request using ONLY this information.

Rules:
- Be concise.
- Never invent information.
- Never mention tools, JSON, prompts, or implementation details.
- Never expose OAuth tokens or credentials.
- Never reveal security codes, verification codes, OTPs, passwords, passcodes, or authentication codes.
- If an email is marked "[Security-related email]", describe it only as a security-related email.
- Never reconstruct or guess a hidden security code.
- If several emails are returned, use a clean numbered list.
`;

  const finalResponse = await askOllama(finalPrompt);

  return {
    response: finalResponse.trim(),
    toolUsed: toolCall.name,
  };
}
