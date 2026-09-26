import type { Client, Message } from "discord.js";
import { randomUUID } from "node:crypto";
import { config } from "../config/env.js";
import { faradayAgent } from "../agent/agent.js";
import { log } from "../logging.js";
const invoker = /^faraday\b[\s,:-]*(.*)$/i;
const unauthorizedMessage = "This Faraday installation is not authorized for your account.";
export function isAuthorized(userId: string, guildId: string | null, users = config.allowedUserIds, guilds = config.allowedGuildIds): boolean {
  return users.has(userId) && (!guildId || guilds.size === 0 || guilds.has(guildId));
}
export async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot || !isAuthorized(message.author.id, message.guildId)) return;
  const match = message.content.trim().match(invoker);
  if (!match) return;
  const started = Date.now();
  try {
    const prompt = match[1]?.trim();
    if (!prompt) { await message.reply("I'm here. What do you need?"); return; }
    if ("sendTyping" in message.channel) await message.channel.sendTyping();
    const result = await faradayAgent.run(prompt, message.author.id);
    await message.reply(result.response);
    log("tool_request", { userId: message.author.id, tool: result.toolUsed ?? "none", success: true, durationMs: Date.now() - started });
  } catch (error) {
    const errorId = randomUUID();
    log("tool_request", { userId: message.author.id, success: false, durationMs: Date.now() - started, errorId, errorType: error instanceof Error ? error.name : "unknown" });
    await message.reply("Sorry, I couldn't process that request right now.").catch(() => undefined);
  }
}
export function registerDiscordHandlers(client: Client): void {
  if (client.listenerCount("messageCreate") > 0) return;
  client.on("messageCreate", (message) => { void handleMessage(message).catch(() => undefined); });
  client.once("clientReady", () => log("discord_ready"));
}
export { unauthorizedMessage };
