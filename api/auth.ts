import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "../src/config/env.js";
import { getGoogleAuthUrl } from "../src/google/auth.js";
import { createSignedOAuthState } from "../src/google/oauth-state.js";
import { validateTokenEncryptionKey } from "../src/security/encryption.js";

function text(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function deployedRedirectIsValid(): boolean {
  if (!config.isVercelDeployment) return true;
  try {
    if (!config.googleRedirectUri) return false;
    const redirect = new URL(config.googleRedirectUri);
    return redirect.protocol === "https:" && redirect.pathname === "/api/oauth2callback";
  } catch { return false; }
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== "GET") { text(res, 405, "Method not allowed."); return; }
  if (!config.googleConfigured || !config.googleOAuthStateSecret || !config.databaseUrl || !validateTokenEncryptionKey() || !deployedRedirectIsValid()) {
    text(res, 503, "Google OAuth is not configured for this deployment.");
    return;
  }
  try {
    const state = createSignedOAuthState(config.googleOAuthStateSecret);
    res.writeHead(302, { Location: getGoogleAuthUrl(state), "Cache-Control": "no-store" });
    res.end();
  } catch {
    text(res, 503, "Google OAuth is not configured for this deployment.");
  }
}
