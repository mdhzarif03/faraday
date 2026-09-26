import "dotenv/config";
import { askOllama } from "./agent/ollama.js";

async function main() {
  console.log("Faraday is starting...");
  console.log("Node:", process.version);

  const response = await askOllama(
    "You are Faraday, a personal AI email assistant. " +
    "Briefly introduce yourself in one sentence.",
  );

  console.log("\nFaraday:");
  console.log(response);
}

main().catch((error) => {
  console.error("\nFaraday failed to start.");
  console.error(error);
  process.exit(1);
});
