import { Client, GatewayIntentBits } from "discord.js";
import { config } from "../config/env.js";
let client: Client | undefined;
let loginPromise: Promise<string> | undefined;
export function getDiscordClient(): Client {
  if (!client) client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  return client;
}
export function startDiscord(): Promise<string> {
  if (loginPromise) return loginPromise;
  loginPromise = getDiscordClient().login(config.discordToken).catch((error: unknown) => { loginPromise = undefined; throw error; });
  return loginPromise;
}
export async function stopDiscord(): Promise<void> { if (client?.isReady()) await client.destroy(); client = undefined; loginPromise = undefined; }
