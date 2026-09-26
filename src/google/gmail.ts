import { google, type gmail_v1 } from "googleapis";
import { oauth2Client } from "./auth.js";

const gmail = google.gmail({ version: "v1", auth: oauth2Client });
export interface EmailSummary { id: string; threadId: string; from: string; subject: string; date: string; }
export interface EmailMessage extends EmailSummary { to: string; bodyText: string; }
function header(headers: gmail_v1.Schema$MessagePartHeader[] | null | undefined, name: string): string { return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""; }
function safeHeader(value: string): string { return value.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 500); }
export function transformEmailMetadata(input: { id: string; threadId?: string | null; headers?: gmail_v1.Schema$MessagePartHeader[] | null }): EmailSummary {
  return { id: input.id, threadId: input.threadId ?? "", from: safeHeader(header(input.headers, "From")), subject: safeSubject(safeHeader(header(input.headers, "Subject"))), date: safeHeader(header(input.headers, "Date")) };
}
function safeSubject(value: string): string { return /verification|security\s*code|one[- ]time|otp|pass(?:word|code)|login\s*code|authentication\s*code|reset\s*code/i.test(value) ? "[Sensitive email]" : maskSensitiveText(value); }
export function maskSensitiveText(value: string): string {
  return value.replace(/\b(?:\d[ -]?){6,10}\b/g, "[REDACTED CODE]")
    .replace(/\b(?:otp|verification|security|authentication|login|one[- ]time|reset)\s*(?:code|token|password)\s*[:=]?\s*[A-Z0-9_-]{4,64}\b/gi, "[REDACTED CODE]")
    .replace(/\b(?:password|passcode|access token|refresh token|api key|secret|reset token)\s*[:=]\s*\S+/gi, "[REDACTED CREDENTIAL]");
}
function decode(data?: string | null): string { if (!data) return ""; try { return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); } catch { return ""; } }
function findBody(part: gmail_v1.Schema$MessagePart | null | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decode(part.body.data);
  for (const child of part.parts ?? []) { const body = findBody(child); if (body) return body; }
  if (part.mimeType === "text/html" && part.body?.data) return decode(part.body.data).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#\d+;/g, " ");
  return "";
}
export interface GmailService {
  getRecentEmails(limit?: number): Promise<EmailSummary[]>;
  searchEmails(query: string, limit?: number): Promise<EmailSummary[]>;
  getEmailMetadata(messageId: string): Promise<EmailSummary>;
  getEmailBody(messageId: string): Promise<string>;
  getEmail(messageId: string): Promise<EmailMessage>;
}
export class GoogleGmailService implements GmailService {
  private async list(query: string | undefined, count = 5): Promise<EmailSummary[]> {
    const limit = Math.min(Math.max(Math.trunc(count), 1), 10);
    const result = await gmail.users.messages.list({ userId: "me", maxResults: limit, q: query });
    const rows = await Promise.all((result.data.messages ?? []).filter((m): m is gmail_v1.Schema$Message & { id: string } => Boolean(m.id)).map((m) => this.getEmailMetadata(m.id)));
    return rows;
  }
  getRecentEmails(limit = 5): Promise<EmailSummary[]> { return this.list(undefined, limit); }
  searchEmails(query: string, limit = 5): Promise<EmailSummary[]> { return this.list(query, limit); }
  async getEmailMetadata(messageId: string): Promise<EmailSummary> {
    const response = await gmail.users.messages.get({ userId: "me", id: messageId, format: "metadata", metadataHeaders: ["From", "Subject", "Date"] });
    return transformEmailMetadata({ id: response.data.id ?? messageId, threadId: response.data.threadId, headers: response.data.payload?.headers });
  }
  async getEmailBody(messageId: string): Promise<string> {
    const response = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    return maskSensitiveText(findBody(response.data.payload).replace(/\r/g, "").slice(0, 12000));
  }
  async getEmail(messageId: string): Promise<EmailMessage> {
    const response = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    const headers = response.data.payload?.headers;
    return { id: response.data.id ?? messageId, threadId: response.data.threadId ?? "", from: safeHeader(header(headers, "From")), to: safeHeader(header(headers, "To")), subject: safeSubject(safeHeader(header(headers, "Subject"))), date: safeHeader(header(headers, "Date")), bodyText: maskSensitiveText(findBody(response.data.payload).replace(/\r/g, "").slice(0, 12000)) };
  }
}
export const gmailService: GmailService = new GoogleGmailService();
export const getRecentEmails = (limit?: number) => gmailService.getRecentEmails(limit);
