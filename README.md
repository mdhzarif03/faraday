# Faraday

Faraday is a private, open-source, self-hostable assistant controlled through Discord. A local installation runs a persistent Discord worker with its own Ollama model and Google account. An optional HTTP/API deployment can run independently on Vercel.

## Status

### Implemented

- Discord worker with explicit `Faraday` invocation, user allowlist, and optional guild allowlist.
- Local Ollama provider (`qwen3:1.7b` by default), native tool calling, bounded repair, and a deterministic fallback for clear email/contact requests.
- Read-only Gmail recent-message listing, Gmail search, email reading and summarization, and Google Contacts search.
- Typed tool validation; only registered tools are available to the model. No write or destructive email tools are registered.
- Local file OAuth token storage, or encrypted PostgreSQL token storage when `DATABASE_URL` and `TOKEN_ENCRYPTION_KEY` are configured.
- Separate local HTTP server for `/health`, `/auth`, and `/oauth2callback`.
- Vercel function routes for `/api/health`, `/api/auth`, and `/api/oauth2callback`.
- Vercel OAuth state signing and encrypted token persistence through PostgreSQL.

### Planned / not implemented

- Draft, send, reply, forward, delete, or other Gmail write operations. Google scopes remain read-only.
- PostgreSQL repositories for general users, conversations, confirmations, or audit history. PostgreSQL currently stores only the encrypted OAuth token payload.
- A web management interface and production deployment automation.

## Architecture

```text
Local worker                         Local HTTP server
Discord Gateway                      /health, /auth, /oauth2callback
  -> agent                              -> Google OAuth
  -> Ollama                             -> file or PostgreSQL token store
  -> typed read-only tools
  -> Gmail / Google Contacts

Vercel
  -> api/health.ts
  -> api/auth.ts
  -> api/oauth2callback.ts
  -> PostgreSQL encrypted token store
```

The worker and local HTTP server have independent entrypoints and processes. Vercel functions import only the HTTP/OAuth code paths; they do not start Discord or call Ollama. `http://127.0.0.1:11434` refers to the worker's host and cannot reach a self-hoster's machine from Vercel.

## Requirements

- Node.js 24.x
- Ollama for the local worker
- A Discord application and bot for the local worker
- Google Cloud OAuth credentials with Gmail API and People API enabled
- PostgreSQL only when shared/deployed OAuth token storage is needed

## Install and configure

```bash
git clone https://github.com/mdhzarif03/faraday.git
cd faraday
npm install
Copy-Item .env.example .env
```

Configure your own installation credentials in `.env`. `DISCORD_ALLOWED_USER_IDS` must include at least one trusted account ID before the worker starts. IDs can be comma-separated. `DISCORD_ALLOWED_GUILD_IDS` is optional. Never commit `.env`, `token.json`, or database credentials.

### Ollama and Discord

```bash
ollama serve
ollama pull qwen3:1.7b
```

Create your own Discord application/bot, enable the Message Content intent, and set its token and allowlists. Faraday responds only to messages beginning with `Faraday`.

### Google OAuth

Create OAuth credentials in your own Google Cloud project and configure these exact read-only scopes:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/contacts.readonly`

For local development, set `GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback`, start the local HTTP server, and open `http://localhost:3000/auth`. Register the redirect URI in the Google OAuth client. No Gmail write permission is requested.

For Vercel, configure `GOOGLE_REDIRECT_URI=https://<your-domain>/api/oauth2callback` in the Vercel environment and register that URI with Google. Also set `GOOGLE_OAUTH_STATE_SECRET` to at least 32 characters, `DATABASE_URL`, and `TOKEN_ENCRYPTION_KEY`. Generate a unique random 32-byte encryption key, encoded as 64 hex characters or base64. Use the same database and encryption key for the Vercel API and any worker that needs to read those tokens. Keep the key in the deployment's secret environment settings.

OAuth tokens saved to PostgreSQL are encrypted with AES-256-GCM. The PostgreSQL table is initialized by the token-store adapter. Local development without `DATABASE_URL` continues to use ignored `token.json` file storage.

## Configuration

See `.env.example`. Main settings:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:1.7b
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_ALLOWED_USER_IDS=
DISCORD_ALLOWED_GUILD_IDS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_OAUTH_STATE_SECRET=
DATABASE_URL=
TOKEN_ENCRYPTION_KEY=
PORT=3000
```

The example file contains placeholders only. `TOKEN_ENCRYPTION_KEY` is needed only with PostgreSQL token storage. Vercel OAuth additionally requires PostgreSQL, the encryption key, and the signed-state secret; the Vercel health route does not require credentials.

## Run

Run these in separate terminals for a complete local setup:

```bash
npm run dev:worker
npm run dev:server
```

`npm run dev` is an alias for the worker only. Production equivalents are `npm start` for the Discord worker and `npm run start:server` for local HTTP/OAuth. The Vercel deployment serves `/api/health`, `/api/auth`, and `/api/oauth2callback`; it does not run the worker.

## API endpoints

- Local `GET /health` returns `{"status":"ok","service":"faraday"}`.
- Vercel `GET /api/health` returns the same minimal JSON response.
- Local OAuth uses `/auth` and `/oauth2callback`.
- Vercel OAuth uses `/api/auth` and `/api/oauth2callback`.

Health responses do not expose configuration or infrastructure details.

## Privacy and security

- Every installation supplies its own Discord bot, Google OAuth client, tokens, and environment configuration.
- Discord user authorization is enforced in application code; guild authorization is optional and additive.
- Listing/search calls request metadata only. Snippets and bodies are not included in those tool results.
- Email bodies are fetched only for explicit read/summarize operations, truncated and sanitized before inference, and treated as untrusted data.
- The model cannot authorize tools. Tool permissions and argument validation are enforced in application code.
- No send/modify/delete scopes or tools are enabled. Write actions require a deliberate future scope and confirmation design.
- Tokens, email bodies, credentials, and raw exception messages are not logged.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Build and tests

```bash
npm run build
npm test
npm run lint
```

The build and lint commands type-check both the local source and Vercel API routes. Tests do not require a real Gmail account or deployed Vercel project.

## Contributing and license

Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes. Faraday is MIT licensed; see [LICENCE](LICENCE).
