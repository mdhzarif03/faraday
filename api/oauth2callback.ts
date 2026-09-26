import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "../src/config/env.js";
import { oauth2Client } from "../src/google/auth.js";
import { verifySignedOAuthState } from "../src/google/oauth-state.js";
import { saveTokens } from "../src/google/token-store.js";
import { log } from "../src/logging.js";
import { validateTokenEncryptionKey } from "../src/security/encryption.js";

function respond(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`<h1>${message}</h1>`);
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "GET") { respond(res, 405, "Method not allowed."); return; }
  if (!config.googleConfigured || !config.googleOAuthStateSecret || !config.databaseUrl || !validateTokenEncryptionKey()) {
    respond(res, 503, "Google OAuth and encrypted PostgreSQL storage must be configured for this deployment.");
    return;
  }
  const url = new URL(req.url ?? "/api/oauth2callback", `https://${req.headers.host ?? "localhost"}`);
  if (url.searchParams.has("error")) { respond(res, 400, "Google authorization was not completed."); return; }
  const state = url.searchParams.get("state");
  if (!state || !verifySignedOAuthState(state, config.googleOAuthStateSecret)) {
    respond(res, 400, "Google authorization could not be verified. Start again from /api/auth.");
    return;
  }
  const code = url.searchParams.get("code");
  if (!code) { respond(res, 400, "Google did not return an authorization code."); return; }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    await saveTokens();
    log("google_oauth_success", { surface: "vercel_api" });
    respond(res, 200, "Faraday connected successfully. You can close this window.");
  } catch (error) {
    log("google_oauth_failure", { surface: "vercel_api", errorType: error instanceof Error ? error.name : "unknown" });
    respond(res, 500, "Google authorization failed. Please try again.");
  }
}
