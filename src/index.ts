import { validateConfig } from "./config/env.js";
import { getDiscordClient, startDiscord, stopDiscord } from "./discord/client.js";
import { registerDiscordHandlers } from "./discord/handlers.js";
import { loadTokens } from "./google/token-store.js";
import { startOAuthServer, stopOAuthServer } from "./google/oauth-server.js";
import { config } from "./config/env.js";
import { log } from "./logging.js";

let started = false;
export async function start(): Promise<void> {
  if (started) return;
  validateConfig();
  started = true;
  log("startup", { node: process.version, mode: "local-worker" });
  if (config.googleConfigured) {
    const connected = await loadTokens();
    if (!connected) log("google_not_connected", { authUrl: `http://localhost:${config.port}/auth` });
  } else log("google_not_configured");
  startOAuthServer();
  const client = getDiscordClient();
  registerDiscordHandlers(client);
  try { await startDiscord(); }
  catch (error) { started = false; await stopOAuthServer().catch(() => undefined); throw error; }
}
export async function stop(): Promise<void> {
  if (!started) return;
  await Promise.all([stopDiscord(), stopOAuthServer()]);
  started = false;
  log("shutdown");
}
if (process.argv[1] && new URL(import.meta.url).pathname.toLowerCase().endsWith(process.argv[1].replace(/\\/g, "/").toLowerCase())) {
  void start().catch(() => { log("startup_failure"); process.exitCode = 1; });
  process.once("SIGINT", () => { void stop().finally(() => process.exit(0)); });
  process.once("SIGTERM", () => { void stop().finally(() => process.exit(0)); });
}
