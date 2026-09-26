export function log(event: string, fields: Record<string, string | number | boolean | undefined> = {}): void {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level: "info", event, ...fields })}\n`);
}
