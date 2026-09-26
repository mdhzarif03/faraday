import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateConfig } from "./config/env.js";
import { getDiscordClient, startDiscord, stopDiscord } from "./discord/client.js";
import { registerDiscordHandlers } from "./discord/handlers.js";
import { loadTokens, tokenStore } from "./google/token-store.js";
import { config } from "./config/env.js";
import { log } from "./logging.js";

let started = false;
export async function startWorker(): Promise<void> {
  if (started) return;
  validateConfig();
  started = true;
  log("worker_startup", { node: process.version });
  try {
    if (config.googleConfigured) {
      const connected = await loadTokens();
      if (!connected) log("google_not_connected", { authUrl: `http://localhost:${config.port}/auth` });
    } else log("google_not_configured");
    const client = getDiscordClient();
    registerDiscordHandlers(client);
    await startDiscord();
  } catch (error) {
    started = false;
    await stopDiscord().catch(() => undefined);
    throw error;
  }
}
export async function stopWorker(): Promise<void> {
  if (!started) return;
  await stopDiscord();
  await tokenStore.close?.();
  started = false;
  log("worker_shutdown");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void startWorker().catch(() => { log("worker_startup_failure"); process.exitCode = 1; });
  process.once("SIGINT", () => { void stopWorker().finally(() => process.exit(0)); });
  process.once("SIGTERM", () => { void stopWorker().finally(() => process.exit(0)); });
}
