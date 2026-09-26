import { Client, GatewayIntentBits } from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  throw new Error("DISCORD_BOT_TOKEN is missing from .env");
}

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

discordClient.once("clientReady", (client) => {
  console.log(`Discord connected as ${client.user.tag}`);
});

export async function startDiscord() {
  await discordClient.login(token);
}
