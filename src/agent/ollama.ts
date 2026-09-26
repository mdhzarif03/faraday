import "dotenv/config";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL ?? "qwen3:4b";

export async function askOllama(prompt: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    response?: string;
  };

  if (!data.response) {
    throw new Error("Ollama returned an empty response.");
  }

  return data.response;
}
