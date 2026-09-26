# Faraday

Faraday is a private, open-source assistant operated through Discord. Each installation runs its own Discord worker, local Ollama model, Google OAuth client, and data storage. The default setup requires no hosted AI API or paid model subscription.

## Current status

### Implemented

- Discord message invocation with user and optional guild allowlists.
- Local Ollama provider abstraction, defaulting to `qwen3:1.7b`, using Ollama's chat API and native tool definitions.
- Bounded tool-call parser/repair handling. Model output is never sent as raw tool JSON.
- Read-only Gmail metadata listing/search, explicit email reading and local-model email summaries.
- Google Contacts search.
- Email-code/credential masking, minimal metadata results, and per-user observed-message ID checks for reads.
- Local Google OAuth callback with state validation and a file-backed token store.
- Minimal `/health` endpoint, structured privacy-conscious logs, PostgreSQL-ready boundaries, and confirmation-store groundwork.

### Planned / not implemented

- Draft creation, sending, replying, forwarding, deletion, and any other Gmail write operation. OAuth scopes remain read-only. The confirmation store is not currently connected to any action tool.
- PostgreSQL-backed repositories and encrypted production token persistence. `DATABASE_URL` is documented for the next storage adapter; local read-only operation does not require it.
- Vercel API routes or hosted OAuth management. A persistent Discord gateway must run as a separate worker. Vercel cannot reach a developer machine's `127.0.0.1` Ollama endpoint.
- Durable conversation history, multi-installation management, and tool audit persistence.

## Architecture

```text
Discord message
  -> Discord handler (allowlist + explicit Faraday invocation)
  -> application agent service
  -> AIProvider (Ollama by default)
  -> typed tool registry (schema validation + permission check)
  -> Gmail / People service
  -> untrusted, minimized tool result
  -> local model response
  -> Discord reply
```

The Discord layer does not contain Google business logic. Google services do not call the model. Tools accept application context rather than Discord message objects. Only registered capabilities are described to the agent. Email text is treated as untrusted data.

Key source areas:

- `src/agent/`: provider, routing, parsing, response generation, tool registry.
- `src/discord/`: singleton client, authorization, message handling.
- `src/google/`: OAuth, token storage, Gmail and Contacts services.
- `src/config/`: centralized environment parsing and startup validation.
- `src/security/`: confirmation primitives and security helpers.
- `src/index.ts`: local worker lifecycle.

## Requirements

- Node.js 24.x (Node 20+ may work but is not the development target).
- Ollama installed locally.
- A Discord application/bot.
- A Google Cloud project with Gmail API and People API enabled for account access.
- PostgreSQL is optional for this local read-only phase.

## Local installation

```bash
git clone https://github.com/mdhzarif03/faraday.git
cd faraday
npm install
```

### Ollama

Start Ollama and fetch the model:

```bash
ollama serve
ollama pull qwen3:1.7b
```

Faraday keeps the model warm for ten minutes and uses low-temperature, bounded generations. On CPU-limited machines the first response can take time. `OLLAMA_BASE_URL` and `OLLAMA_MODEL` can be changed per installation.

### Discord bot

Create a Discord application and bot in the Discord Developer Portal, enable the Message Content intent, and invite the bot to your server with permission to view/send messages. Copy `.env.example` to `.env`. Set the bot token and at least one trusted Discord user ID in `DISCORD_ALLOWED_USER_IDS`. IDs are comma-separated. `DISCORD_ALLOWED_GUILD_IDS` is optional; when set, the bot responds only in those guilds. Direct messages still require the user allowlist.

Faraday ignores ordinary chat and responds only to messages beginning with `Faraday`, such as `Faraday show my recent emails`.

### Google Cloud and OAuth

Create OAuth client credentials in your own Google Cloud project. Enable Gmail API and People API. Configure the OAuth client redirect URL exactly as `http://localhost:3000/oauth2callback` (or your selected `PORT`). Use your own client ID and client secret. Start Faraday, then open `http://localhost:3000/auth` locally to consent.

The requested scopes are read-only:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/contacts.readonly`

No send, draft, modify, or delete scope is requested. A future write feature must explicitly upgrade scopes and require re-consent. The local token file is `token.json` by default and is ignored by Git; keep the machine and file protected. No token values are logged or sent to the model.

### Environment

```dotenv
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_ALLOWED_USER_IDS=123456789012345678
DISCORD_ALLOWED_GUILD_IDS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_TOKEN_FILE=token.json
DATABASE_URL=
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:1.7b
PORT=3000
```

`DISCORD_BOT_TOKEN` and a non-empty user allowlist are required to start the worker. Google OAuth values can be omitted if Google tools are not configured yet; Google-backed requests then return a safe error. PostgreSQL is optional for local mode. `.env.example` contains placeholders only.

### Run

```bash
npm run dev
```

For a compiled run:

```bash
npm run build
npm start
```

`GET /health` returns only `{"status":"ok","service":"faraday"}`. The local HTTP server binds to loopback. OAuth callback handling is intended for a local installation in this phase.

## Data and privacy

Recent and search results include only message ID, thread ID, sender, subject, and date. Gmail snippets and bodies are not requested for list operations. Email body text is fetched only for explicit read/summarize operations, capped before inference, and filtered for common credential/code patterns. Emails are untrusted input and cannot issue tool instructions. Email bodies, tokens, credentials, and raw exceptions are not logged. In-memory per-user session state retains only recently surfaced message IDs and is not durable.

Each installation uses its own Discord bot credentials, Google OAuth client, token storage, environment configuration, and (when added) database. Maintainers do not provide shared user credentials or receive user data.

## Database and deployment direction

`DATABASE_URL` reserves configuration for a PostgreSQL-compatible storage adapter. Neon is one possible PostgreSQL host, not an application dependency. Local operation currently uses file-backed OAuth tokens and in-memory session/confirmation state; production-grade encrypted PostgreSQL token storage is not implemented yet.

The local deployment is a persistent Discord worker plus local Ollama, Google APIs, and optional PostgreSQL. A future Vercel deployment can host short-lived HTTP/API routes and OAuth management backed by PostgreSQL, but the Discord gateway worker remains a separate persistent process. Local Ollama must not be configured as `127.0.0.1` from a remote Vercel function.

## Security

- Use a unique bot, Google OAuth client, token file, and database for each installation.
- Restrict Discord use with `DISCORD_ALLOWED_USER_IDS`; optionally restrict guilds too.
- Keep `.env`, `token.json`, database credentials, and OAuth secrets out of source control.
- Review Google consent scopes. Current functionality is read-only.
- Do not expose Ollama or Faraday's local HTTP service to untrusted networks without adding an authenticated deployment boundary.
- Write and destructive tools are absent. Confirmation primitives bind the user, guild/channel, operation arguments, and expiry, but cannot execute an operation by themselves.

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## Commands and tests

```bash
npm run build
npm test
npm run lint
```

Tests use mocked/local components and do not require access to a real Gmail account. `lint` currently runs the strict TypeScript checker; a separate style-lint configuration is not yet provided.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), keep services separated from Discord, preserve least-privilege OAuth scopes, and add tests for new tools and authorization boundaries.

## License

MIT. See [LICENCE](LICENCE).
