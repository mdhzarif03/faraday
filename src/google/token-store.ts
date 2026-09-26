import fs from "node:fs/promises";
import path from "node:path";
import { oauth2Client } from "./auth.js";
import { config } from "../config/env.js";

export interface TokenStore { load(): Promise<boolean>; save(tokens: object): Promise<void>; }
export class FileTokenStore implements TokenStore {
  private readonly path = path.resolve(config.tokenFile);
  async load(): Promise<boolean> {
    try { const value: unknown = JSON.parse(await fs.readFile(this.path, "utf8")); if (!value || typeof value !== "object") return false; oauth2Client.setCredentials(value); return true; }
    catch { return false; }
  }
  async save(tokens: object): Promise<void> {
    await fs.writeFile(this.path, JSON.stringify(tokens), { encoding: "utf8", mode: 0o600 });
  }
}
export const tokenStore: TokenStore = new FileTokenStore();
export const saveTokens = () => tokenStore.save(oauth2Client.credentials);
export const loadTokens = () => tokenStore.load();
