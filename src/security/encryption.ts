import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "../config/env.js";

function encryptionKey(material = config.tokenEncryptionKey): Buffer {
  if (!material) throw new Error("Token encryption is not configured.");
  const key = /^[a-f0-9]{64}$/i.test(material) ? Buffer.from(material, "hex") : Buffer.from(material, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes as hex or base64.");
  return key;
}
export function validateTokenEncryptionKey(material = config.tokenEncryptionKey): boolean {
  try { encryptionKey(material); return true; } catch { return false; }
}

export function encryptTokenPayload(plaintext: string, material?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(material), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptTokenPayload(payload: string, material?: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Stored token payload is invalid.");
  const [ivPart, tagPart, ciphertextPart] = parts;
  if (!ivPart || !tagPart || ciphertextPart === undefined) throw new Error("Stored token payload is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(material), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextPart, "base64url")), decipher.final()]).toString("utf8");
}
