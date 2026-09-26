import { google } from "googleapis";
import { config } from "../config/env.js";

export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/contacts.readonly"];
export const oauth2Client = new google.auth.OAuth2(config.googleClientId ?? "", config.googleClientSecret ?? "", config.googleRedirectUri);
export function getGoogleAuthUrl(): string {
  return oauth2Client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: GOOGLE_SCOPES, state: "faraday-local" });
}
