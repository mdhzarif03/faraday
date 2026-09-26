import { fileURLToPath } from "node:url";
import path from "node:path";
import { startOAuthServer, stopOAuthServer } from "./google/oauth-server.js";
import { config } from "./config/env.js";
import { log } from "./logging.js";

let started = false;
export function startLocalHttpServer(): void {
  if (started) return;
  started = true;
  startOAuthServer();
  log("http_api_startup", { port: config.port });
}
export async function stopLocalHttpServer(): Promise<void> {
  if (!started) return;
  await stopOAuthServer();
  started = false;
  log("http_api_shutdown");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startLocalHttpServer();
  process.once("SIGINT", () => { void stopLocalHttpServer().finally(() => process.exit(0)); });
  process.once("SIGTERM", () => { void stopLocalHttpServer().finally(() => process.exit(0)); });
}
