import { createHash, timingSafeEqual } from "node:crypto";
export type ActionPermission = "READ" | "DRAFT" | "WRITE" | "DESTRUCTIVE";
export interface PendingConfirmation { userId: string; guildId: string | null; channelId: string; tool: string; args: string; digest: string; expiresAt: number; }
export class ConfirmationStore {
  private readonly pending = new Map<string, PendingConfirmation>();
  constructor(private readonly ttlMs = 2 * 60_000, private readonly now = () => Date.now()) {}
  propose(input: Omit<PendingConfirmation, "args" | "digest" | "expiresAt"> & { args: unknown }): PendingConfirmation {
    if (input.tool === "" || input.userId === "" || input.channelId === "") throw new Error("Confirmation context is incomplete.");
    const args = JSON.stringify(input.args);
    const digest = createHash("sha256").update(args).digest("hex");
    const value = { ...input, args, digest, expiresAt: this.now() + this.ttlMs };
    this.pending.set(input.userId, value);
    return value;
  }
  consume(userId: string, guildId: string | null, channelId: string, tool: string, args: unknown, confirmation: string): boolean {
    const pending = this.pending.get(userId);
    if (!pending) return false;
    this.pending.delete(userId);
    if (this.now() > pending.expiresAt || pending.guildId !== guildId || pending.channelId !== channelId || pending.tool !== tool || confirmation.trim().toLowerCase() !== "confirm") return false;
    const digest = createHash("sha256").update(JSON.stringify(args)).digest("hex");
    return digest.length === pending.digest.length && timingSafeEqual(Buffer.from(digest), Buffer.from(pending.digest));
  }
  clear(userId: string): void { this.pending.delete(userId); }
}
export const confirmationStore = new ConfirmationStore();
export function requiresConfirmation(permission: ActionPermission): boolean { return permission === "WRITE" || permission === "DESTRUCTIVE"; }
