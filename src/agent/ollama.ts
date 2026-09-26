import "dotenv/config";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";

const model = process.env.OLLAMA_MODEL ?? "qwen3:1.7b";

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
      keep_alive: "10m",
      options: {
        temperature: 0.2,
        num_predict: 300,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    response?: string;
    done?: boolean;
    error?: string;
  };

  if (data.error) {
    throw new Error(`Ollama error: ${data.error}`);
  }

  const result = typeof data.response === "string" ? data.response.trim() : "";

  if (!result) {
    throw new Error("Ollama returned an empty response.");
  }

  return result;
}
