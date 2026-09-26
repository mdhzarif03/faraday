import "dotenv/config";

function list(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean));
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const config = {
  discordToken: optional(process.env.DISCORD_BOT_TOKEN),
  discordClientId: optional(process.env.DISCORD_CLIENT_ID),
  allowedUserIds: list(process.env.DISCORD_ALLOWED_USER_IDS),
  allowedGuildIds: list(process.env.DISCORD_ALLOWED_GUILD_IDS),
  ollamaBaseUrl: optional(process.env.OLLAMA_BASE_URL) ?? "http://127.0.0.1:11434",
  ollamaModel: optional(process.env.OLLAMA_MODEL) ?? "qwen3:1.7b",
  googleClientId: optional(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: optional(process.env.GOOGLE_CLIENT_SECRET),
  googleRedirectUri: optional(process.env.GOOGLE_REDIRECT_URI),
  googleOAuthStateSecret: optional(process.env.GOOGLE_OAUTH_STATE_SECRET),
  databaseUrl: optional(process.env.DATABASE_URL),
  tokenEncryptionKey: optional(process.env.TOKEN_ENCRYPTION_KEY),
  isVercelDeployment: process.env.VERCEL === "1",
  port: Number(process.env.PORT ?? "3000"),
  tokenFile: optional(process.env.GOOGLE_TOKEN_FILE) ?? "token.json",
  get googleConfigured() { return Boolean(this.googleClientId && this.googleClientSecret && this.googleRedirectUri); },
};

export function validateConfig(): void {
  if (!config.discordToken) throw new Error("DISCORD_BOT_TOKEN is required.");
  if (config.allowedUserIds.size === 0) throw new Error("Set DISCORD_ALLOWED_USER_IDS to at least one Discord user ID.");
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("PORT must be a valid TCP port.");
  const hasGoogleConfig = Boolean(config.googleClientId || config.googleClientSecret || config.googleRedirectUri);
  if (hasGoogleConfig && !(config.googleClientId && config.googleClientSecret && config.googleRedirectUri)) throw new Error("Google OAuth requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.");
  if (config.databaseUrl && !config.tokenEncryptionKey) throw new Error("TOKEN_ENCRYPTION_KEY is required when DATABASE_URL is configured.");
}
