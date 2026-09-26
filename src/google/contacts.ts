import { google } from "googleapis";
import { oauth2Client } from "./auth.js";
export interface ContactSummary { name: string; email: string; }
export interface ContactsService { searchContacts(query: string, limit?: number): Promise<ContactSummary[]>; }
export function transformContacts(rows: Array<{ names?: Array<{ displayName?: string | null }> | null; emailAddresses?: Array<{ value?: string | null }> | null }>): ContactSummary[] {
  return rows.flatMap((person) => {
    const name = person.names?.[0]?.displayName?.trim();
    const email = person.emailAddresses?.[0]?.value?.trim();
    return name || email ? [{ name: (name ?? "").slice(0, 160), email: (email ?? "").slice(0, 254) }] : [];
  });
}
export class GoogleContactsService implements ContactsService {
  async searchContacts(query: string, limit = 5): Promise<ContactSummary[]> {
    const people = google.people({ version: "v1", auth: oauth2Client });
    const response = await people.people.searchContacts({ query: query.trim(), pageSize: Math.min(Math.max(Math.trunc(limit), 1), 10), readMask: "names,emailAddresses" });
    return transformContacts((response.data.results ?? []).flatMap((row) => row.person ? [row.person] : []));
  }
}
export const contactsService: ContactsService = new GoogleContactsService();
