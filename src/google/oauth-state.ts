import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60_000;
function signature(data: string, secret: string): Buffer { return createHmac("sha256", secret).update(`faraday-oauth-state-v1:${data}`).digest(); }
export function createSignedOAuthState(secret: string, now = Date.now()): string {
  if (secret.length < 32) throw new Error("GOOGLE_OAUTH_STATE_SECRET must contain at least 32 characters.");
  const payload = `${now}.${randomBytes(24).toString("base64url")}`;
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}
export function verifySignedOAuthState(state: string, secret: string, now = Date.now()): boolean {
  try {
    if (secret.length < 32) return false;
    const parts = state.split(".");
    if (parts.length !== 3) return false;
    const [timestamp, nonce, suppliedSignature] = parts;
    if (!timestamp || !nonce || !suppliedSignature || !/^\d+$/.test(timestamp) || !/^[A-Za-z0-9_-]{32}$/.test(nonce)) return false;
    const issuedAt = Number(timestamp);
    if (!Number.isSafeInteger(issuedAt) || now - issuedAt < 0 || now - issuedAt > STATE_TTL_MS) return false;
    const expected = signature(`${timestamp}.${nonce}`, secret);
    const supplied = Buffer.from(suppliedSignature, "base64url");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  } catch { return false; }
}
