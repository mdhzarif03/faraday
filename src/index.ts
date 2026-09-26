import "dotenv/config";
import { runAgent } from "./agent/agent.js";
import { discordClient, startDiscord } from "./discord/client.js";
import { loadTokens } from "./google/token-store.js";
import { startOAuthServer } from "./google/oauth-server.js";

discordClient.on("messageCreate", async (message) => {
  if (message.author.bot) {
    return;
  }

  if (!message.content.toLowerCase().startsWith("faraday")) {
    return;
  }

  const prompt = message.content.replace(/^faraday[\s,:-]*/i, "").trim();

  if (!prompt) {
    await message.reply("I'm here. What do you need?");
    return;
  }

  try {
    await message.channel.sendTyping();

    const result = await runAgent(prompt);

    if (!result.response) {
      throw new Error("Faraday received an empty response from the AI.");
    }

    await message.reply(result.response);
  } catch (error) {
    console.error("Faraday request failed:", error);

    await message.reply("Sorry, I couldn't process that request right now.");
  }
});

async function main() {
  console.log("Faraday is starting...");
  console.log("Node:", process.version);

  const connected = await loadTokens();

  if (!connected) {
    console.log(
      "Google account not connected. Open http://localhost:3000/auth",
    );
  }

  startOAuthServer();

  await startDiscord();
}

main().catch((error) => {
  console.error("\nFaraday failed to start.");
  console.error(error);
  process.exit(1);
});
