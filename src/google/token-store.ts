import fs from "node:fs/promises";
import path from "node:path";
import { oauth2Client } from "./auth.js";

const TOKEN_PATH = path.resolve("token.json");

export async function saveTokens() {
  const tokens = oauth2Client.credentials;

  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf8");

  console.log("Google tokens saved.");
}

export async function loadTokens(): Promise<boolean> {
  try {
    const data = await fs.readFile(TOKEN_PATH, "utf8");
    const tokens = JSON.parse(data);

    oauth2Client.setCredentials(tokens);

    console.log("Google tokens loaded.");
    return true;
  } catch {
    return false;
  }
}
