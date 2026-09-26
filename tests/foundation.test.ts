import test from "node:test";
import assert from "node:assert/strict";
import { parseToolCall, FaradayAgent, deterministicToolFallback } from "../src/agent/agent.js";
import { toolRegistry, executeTool } from "../src/agent/tools.js";
import type { AIProvider, ProviderMessage, ProviderResult, ProviderTool } from "../src/agent/provider.js";
import { ConfirmationStore, requiresConfirmation } from "../src/security/permissions.js";
import { isAuthorized } from "../src/discord/handlers.js";
import { maskSensitiveText, transformEmailMetadata } from "../src/google/gmail.js";
import { transformContacts } from "../src/google/contacts.js";
import { OllamaProvider } from "../src/agent/ollama.js";
import { getDiscordClient } from "../src/discord/client.js";
import { registerDiscordHandlers } from "../src/discord/handlers.js";

test("tool parser accepts raw, whitespace, fenced, tagged and explanatory JSON", () => {
  for (const value of [
    '{"name":"search_emails","arguments":{"query":"OpenAI"}}',
    '  {"name":"search_emails","arguments":{"query":"OpenAI"}}  ',
    '```json\n{"name":"search_emails","arguments":{"query":"OpenAI"}}\n```',
    '<tool_call>{"name":"search_emails","arguments":{"query":"OpenAI"}}</tool_call>',
    'I will search now: {"name":"search_emails","arguments":{"query":"OpenAI"}} done.',
  ]) assert.equal(parseToolCall(value)?.name, "search_emails");
  assert.equal(parseToolCall("{bad json}"), null);
});

test("deterministic fallback routes only clear recent-email and sender-search requests", () => {
  assert.deepEqual(deterministicToolFallback("Faraday show me my recent emails"), { name: "get_recent_emails", arguments: { limit: 5 } });
  assert.deepEqual(deterministicToolFallback("Faraday find emails from OpenAI"), { name: "search_emails", arguments: { query: "from:OpenAI", limit: 5 } });
  assert.equal(deterministicToolFallback("Faraday read this email"), null);
});

test("registry validates bounded arguments and refuses unknown or non-read operations", async () => {
  const search = toolRegistry.find((tool) => tool.name === "search_emails");
  assert.ok(search);
  assert.deepEqual(search.validate({ query: " OpenAI ", limit: 5 }), { query: "OpenAI", limit: 5 });
  assert.throws(() => search.validate({ query: "" }));
  assert.throws(() => search.validate({ query: "ok", limit: 11 }));
  await assert.rejects(() => executeTool("send_email", {}, { userId: "u", seenMessageIds: new Set() }));
});

test("read tools cannot use IDs not previously seen by the user session", async () => {
  await assert.rejects(() => executeTool("read_email", { message_id: "abcdefghij" }, { userId: "u", seenMessageIds: new Set() }));
});

test("Discord allowlist requires user match and, when configured, guild match", () => {
  assert.equal(isAuthorized("u1", "g1", new Set(["u1"]), new Set(["g1"])), true);
  assert.equal(isAuthorized("u2", "g1", new Set(["u1"]), new Set()), false);
  assert.equal(isAuthorized("u1", "g2", new Set(["u1"]), new Set(["g1"])), false);
});

test("Discord client is a singleton with exactly one message handler after repeated registration", () => {
  const first = getDiscordClient();
  const second = getDiscordClient();
  assert.equal(first, second);
  registerDiscordHandlers(first);
  registerDiscordHandlers(first);
  assert.equal(first.listenerCount("messageCreate"), 1);
});

test("Discord event flow ignores unauthorized users and replies exactly once for an authorized invocation", async () => {
  const { Client } = await import("discord.js");
  const client = new Client({ intents: [] });
  let calls = 0;
  let replies = 0;
  let finishReply: (() => void) | undefined;
  const replySent = new Promise<void>((resolve) => { finishReply = resolve; });
  const agent = { async run() { calls++; return { response: "I am ready." }; } };
  const authorize = (userId: string) => userId === "authorized";
  registerDiscordHandlers(client, agent, authorize);
  registerDiscordHandlers(client, agent, authorize);
  assert.equal(client.listenerCount("messageCreate"), 1);
  const emit = (userId: string) => client.emit("messageCreate", {
    author: { id: userId, bot: false }, guildId: "guild", content: "Faraday how are you?",
    channel: { sendTyping: async () => undefined },
    reply: async () => { replies++; finishReply?.(); return {} as never; },
  } as never);
  emit("unauthorized");
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(calls, 0);
  assert.equal(replies, 0);
  emit("authorized");
  await replySent;
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(replies, 1);
  client.destroy();
});

test("confirmation is tied to user, location, action, exact args, expires and is one-use", () => {
  let now = 100;
  const confirmations = new ConfirmationStore(50, () => now);
  assert.equal(requiresConfirmation("WRITE"), true);
  assert.equal(requiresConfirmation("DESTRUCTIVE"), true);
  assert.equal(requiresConfirmation("READ"), false);
  confirmations.propose({ userId: "u", guildId: "g", channelId: "c", tool: "send_email", args: { to: "a@example.test" } });
  assert.equal(confirmations.consume("u", "g", "c", "send_email", { to: "b@example.test" }, "confirm"), false);
  confirmations.propose({ userId: "u", guildId: "g", channelId: "c", tool: "send_email", args: { to: "a@example.test" } });
  assert.equal(confirmations.consume("u", "g", "c", "send_email", { to: "a@example.test" }, "confirm"), true);
  assert.equal(confirmations.consume("u", "g", "c", "send_email", { to: "a@example.test" }, "confirm"), false);
  confirmations.propose({ userId: "u", guildId: "g", channelId: "c", tool: "send_email", args: {} }); now += 51;
  assert.equal(confirmations.consume("u", "g", "c", "send_email", {}, "confirm"), false);
});

test("email metadata and contacts are minimized and sensitive content is masked", () => {
  const email = transformEmailMetadata({ id: "m1", threadId: "t1", headers: [{ name: "From", value: "Person <p@example.test>" }, { name: "Subject", value: "Your verification code is 382910" }, { name: "Date", value: "today" }] });
  assert.deepEqual(email, { id: "m1", threadId: "t1", from: "Person <p@example.test>", subject: "[Sensitive email]", date: "today" });
  assert.equal(maskSensitiveText("Password: mysecret"), "[REDACTED CREDENTIAL]");
  assert.deepEqual(transformContacts([{ names: [{ displayName: " Ada Lovelace " }], emailAddresses: [{ value: " ada@example.test " }] }]), [{ name: "Ada Lovelace", email: "ada@example.test" }]);
});

test("agent handles malformed routing once and never leaks malformed model output", async () => {
  class FakeProvider implements AIProvider {
    calls = 0;
    async ask(): Promise<string> { return ""; }
    async generate(_messages: ProviderMessage[], _tools?: ProviderTool[]): Promise<ProviderResult> {
      this.calls++;
      return { content: this.calls === 1 ? '<tool_call>{oops}</tool_call>' : '<tool_call>{still broken}</tool_call>', toolCalls: [] };
    }
  }
  const provider = new FakeProvider();
  const result = await new FaradayAgent(provider).run("Faraday do something unknown", "test-user");
  assert.equal(provider.calls, 2);
  assert.match(result.response, /couldn't safely understand/i);
  assert.equal(result.response.includes("<tool_call>"), false);
});

test("agent retries a plain non-tool answer once for an explicit account-data request", async () => {
  class FakeProvider implements AIProvider {
    calls = 0;
    async ask(): Promise<string> { return ""; }
    async generate(): Promise<ProviderResult> {
      this.calls++;
      return this.calls === 1
        ? { content: "I can help with that.", toolCalls: [] }
        : { content: "Which emails should I look for?", toolCalls: [] };
    }
  }
  const provider = new FakeProvider();
  const result = await new FaradayAgent(provider).run("Faraday read this email", "repair-route-user");
  assert.equal(provider.calls, 2);
  assert.equal(result.toolUsed, undefined);
  assert.equal(result.response.includes("<tool_call>"), false);
});

test("Ollama provider rejects empty and malformed API responses safely", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: "  " } }), { status: 200 });
    await assert.rejects(() => new OllamaProvider("http://127.0.0.1:1", "model", 100).ask("hello"), /empty response/i);
    globalThis.fetch = async () => new Response("not-json", { status: 200 });
    await assert.rejects(() => new OllamaProvider("http://127.0.0.1:1", "model", 100).ask("hello"));
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(() => new OllamaProvider("http://127.0.0.1:1", "model", 100).ask("hello"), /HTTP 503/);
  } finally { globalThis.fetch = originalFetch; }
});

test("health endpoint returns the minimal service status", async () => {
  const { startOAuthServer, stopOAuthServer } = await import("../src/google/oauth-server.js");
  const server = startOAuthServer();
  try {
    await new Promise<void>((resolve, reject) => server.once("listening", resolve).once("error", reject));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "faraday" });
  } finally { await stopOAuthServer(); }
});
