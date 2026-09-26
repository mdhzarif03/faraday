import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config/env.js";
import { getGoogleAuthUrl, oauth2Client } from "./auth.js";
import { saveTokens } from "./token-store.js";
import { log } from "../logging.js";
let server: http.Server | undefined;
let oauthState: string | undefined;
function html(res: http.ServerResponse, status: number, text: string): void { res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); res.end(`<h1>${text}</h1>`); }
export function startOAuthServer(): http.Server {
  if (server) return server;
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${config.port}`);
    if (req.method !== "GET") { html(res, 405, "Method not allowed"); return; }
    if (url.pathname === "/health") { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify({ status: "ok", service: "faraday" })); return; }
    if (!config.googleConfigured) { html(res, 503, "Google OAuth is not configured for this installation."); return; }
    if (url.pathname === "/auth") {
      oauthState = randomBytes(24).toString("hex");
      const authUrl = new URL(getGoogleAuthUrl()); authUrl.searchParams.set("state", oauthState);
      res.writeHead(302, { Location: authUrl.toString(), "Cache-Control": "no-store" }); res.end(); return;
    }
    if (url.pathname === "/oauth2callback") {
      const state = url.searchParams.get("state");
      if (!state || !oauthState || state.length !== oauthState.length || !timingSafeEqual(Buffer.from(state), Buffer.from(oauthState))) { html(res, 400, "Google authorization could not be verified. Start again from /auth."); return; }
      oauthState = undefined;
      const code = url.searchParams.get("code");
      if (!code) { html(res, 400, "Google did not return an authorization code."); return; }
      try {
        const { tokens } = await oauth2Client.getToken(code); oauth2Client.setCredentials(tokens); await saveTokens();
        log("google_oauth_success"); html(res, 200, "Faraday connected successfully. You can close this window.");
      } catch (error) { log("google_oauth_failure", { errorType: error instanceof Error ? error.name : "unknown" }); html(res, 500, "Google authorization failed. Check the Faraday server logs for a safe error ID."); }
      return;
    }
    html(res, 404, "Not found");
  });
  server.listen(config.port, "127.0.0.1", () => log("http_server_started", { port: config.port }));
  return server;
}
export async function stopOAuthServer(): Promise<void> { if (!server) return; const current = server; server = undefined; await new Promise<void>((resolve, reject) => current.close((error) => error ? reject(error) : resolve())); }
