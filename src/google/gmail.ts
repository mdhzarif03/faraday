import { google } from "googleapis";
import { oauth2Client } from "./auth.js";

const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
}

function getHeader(
  headers: { name?: string | null; value?: string | null }[],
  name: string,
): string {
  return (
    headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

export async function getRecentEmails(maxResults = 5): Promise<EmailSummary[]> {
  const limit = Math.min(Math.max(maxResults, 1), 10);

  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults: limit,
  });

  const messages = response.data.messages ?? [];

  const emails: EmailSummary[] = [];

  for (const message of messages) {
    if (!message.id) {
      continue;
    }

    const email = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });

    const headers = email.data.payload?.headers ?? [];

    emails.push({
      id: message.id,
      threadId: message.threadId ?? "",
      from: getHeader(headers, "From"),
      subject: getHeader(headers, "Subject"),
      date: getHeader(headers, "Date"),
    });
  }

  return emails;
}
