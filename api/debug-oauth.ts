import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "../src/config/env.js";
import { validateTokenEncryptionKey } from "../src/security/encryption.js";

function deployedRedirectIsValid(): boolean {
  if (!config.isVercelDeployment) return true;

  try {
    if (!config.googleRedirectUri) return false;

    const redirect = new URL(config.googleRedirectUri);

    return (
      redirect.protocol === "https:" &&
      redirect.pathname === "/api/oauth2callback"
    );
  } catch {
    return false;
  }
}

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  if (req.method !== "GET") {
    res.writeHead(405, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Allow: "GET",
    });

    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const result = {
    googleConfigured: config.googleConfigured,
    googleClientId: Boolean(config.googleClientId),
    googleClientSecret: Boolean(config.googleClientSecret),
    googleRedirectUri: Boolean(config.googleRedirectUri),
    oauthStateSecret: Boolean(config.googleOAuthStateSecret),
    databaseUrl: Boolean(config.databaseUrl),
    encryptionKeyValid: validateTokenEncryptionKey(),
    redirectValid: deployedRedirectIsValid(),
    vercel: config.isVercelDeployment,
  };

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  res.end(JSON.stringify(result, null, 2));
}
