import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { oauth2Client } from "./auth.js";
import { config } from "../config/env.js";
import { decryptTokenPayload, encryptTokenPayload } from "../security/encryption.js";

export interface TokenStore { load(): Promise<boolean>; save(tokens: object): Promise<void>; close?(): Promise<void>; }
export class FileTokenStore implements TokenStore {
  private readonly path = path.resolve(config.tokenFile);
  async load(): Promise<boolean> {
    try { const value: unknown = JSON.parse(await fs.readFile(this.path, "utf8")); if (!value || typeof value !== "object") return false; oauth2Client.setCredentials(value); return true; }
    catch { return false; }
  }
  async save(tokens: object): Promise<void> { await fs.writeFile(this.path, JSON.stringify(tokens), { encoding: "utf8", mode: 0o600 }); }
}

export class PostgresTokenStore implements TokenStore {
  private readonly pool: Pool;
  private schemaReady: Promise<void> | undefined;
  constructor(connectionString = config.databaseUrl) {
    if (!connectionString) throw new Error("DATABASE_URL is required for PostgreSQL token storage.");
    this.pool = new Pool({ connectionString, max: 5 });
  }
  private ensureSchema(): Promise<void> {
    this.schemaReady ??= this.pool.query(`CREATE TABLE IF NOT EXISTS faraday_oauth_tokens (
      installation_id TEXT PRIMARY KEY,
      encrypted_payload TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`).then(() => undefined);
    return this.schemaReady;
  }
  async load(): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.pool.query<{ encrypted_payload: string }>("SELECT encrypted_payload FROM faraday_oauth_tokens WHERE installation_id = $1", ["default"]);
    const encrypted = result.rows[0]?.encrypted_payload;
    if (!encrypted) return false;
    const credentials: unknown = JSON.parse(decryptTokenPayload(encrypted));
    if (!credentials || typeof credentials !== "object") throw new Error("Stored OAuth credentials are invalid.");
    oauth2Client.setCredentials(credentials);
    return true;
  }
  async save(tokens: object): Promise<void> {
    await this.ensureSchema();
    const encrypted = encryptTokenPayload(JSON.stringify(tokens));
    await this.pool.query(`INSERT INTO faraday_oauth_tokens (installation_id, encrypted_payload)
      VALUES ($1, $2)
      ON CONFLICT (installation_id) DO UPDATE SET encrypted_payload = EXCLUDED.encrypted_payload, updated_at = NOW()`, ["default", encrypted]);
  }
  async close(): Promise<void> { await this.pool.end(); }
}

export const tokenStore: TokenStore = config.databaseUrl ? new PostgresTokenStore() : new FileTokenStore();
export const saveTokens = () => tokenStore.save(oauth2Client.credentials);
export const loadTokens = () => tokenStore.load();
