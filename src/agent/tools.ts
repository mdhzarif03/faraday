import { getRecentEmails } from "../google/gmail.js";

export const tools = {
  get_recent_emails: async (args: { limit?: number }) => {
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);

    return await getRecentEmails(limit);
  },
};

export type ToolName = keyof typeof tools;
