import "dotenv/config";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  throw new Error("Google OAuth configuration is missing from .env");
}

export const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri,
);

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
];

export function getGoogleAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}
