
# Meet, *Faraday*

> A self-hostable AI agent for managing Gmail through Discord.

Faraday is an open-source personal email agent that lets you interact with your Gmail account through a Discord bot.

Instead of opening Gmail for every task, you can simply talk to Faraday.

```text
You: What's important in my inbox today?

Faraday:
You have 14 new emails.

Important:
• Google — Security alert
• School — Examination notice

I found 11 other emails that appear less urgent.
```

Faraday can search, summarize, compose, draft, and send emails through natural conversation.

## ✨ Features

* Manage Gmail through Discord
* Search and read emails
* Summarize individual emails or your inbox
* Search Gmail using natural language
* Search Google Contacts
* Generate emails from context
* Create email drafts
* Send emails
* Reply to emails
* Forward emails
* CC and BCC support
* Google OAuth authentication
* PostgreSQL database support
* Self-hostable
* Open source
* Designed to support additional services in the future

## 🛡️ Security First

Faraday is designed around a simple principle:

> Your credentials and private data belong to you.

Faraday does not require the project maintainer's Gmail, Discord, database, or AI credentials.

Every self-hosted installation can use its own:

* Google OAuth credentials
* Discord bot
* PostgreSQL database
* AI API credentials
* Environment variables

Never commit secrets, OAuth tokens, API keys, or private data to the repository.

## 🏗️ Architecture

```text
                    Discord
                       │
                       ▼
                ┌─────────────┐
                │   Faraday   │
                │    Agent    │
                └──────┬──────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Gmail       Contacts      Database
        API           API          Neon
          │            │            │
          └────────────┼────────────┘
                       ▼
                   Your Data
```

Faraday is designed to be self-hosted.

Your installation uses your own infrastructure and credentials.

## 🚀 Getting Started

### Requirements

Before installing Faraday, you will need:

* Node.js
* A Discord application and bot
* A Google Cloud project
* Gmail API enabled
* Google People API enabled
* Google OAuth credentials
* A PostgreSQL database
* An AI model/API
* Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/faraday.git
cd faraday
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then configure your own credentials.

```env
DATABASE_URL=

DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

AI_API_KEY=
```

Never commit your `.env` file.

### 4. Set up the database

```bash
npx prisma migrate dev
```

### 5. Start Faraday

```bash
npm run dev
```

Faraday should now connect to Discord and be ready to use.

## 🔐 Google Authentication

Faraday uses Google OAuth rather than storing your Gmail password.

During setup, you authorize Faraday to access the Google services required by the application.

You can revoke access through your Google account at any time.

The exact OAuth scopes required by Faraday may change as features are added. Always review the permissions requested by your installation before authorizing access.

## 💬 Example Commands

Faraday is designed around natural language rather than requiring users to memorize commands.

```text
What's new in my inbox?

Summarize the emails from today.

Find the email from Google about my account.

Find Mugdho's email address.

Draft an email to Mugdho about tomorrow's ACOB meeting.

CC Khan and BCC Shafayat.

Reply to that email and tell them I'll handle it tomorrow.
```

For actions that have external side effects, such as sending an email, Faraday should request confirmation before executing the action.

Example:

```text
Faraday:

I've prepared the following email:

To: example@email.com
CC: ...
BCC: ...

Subject: ACOB Meeting

[Email content]

Send this email?

You: Send it.
```

## 🧠 Agent Tools

Faraday's AI agent interacts with external services through controlled tools.

Examples include:

```text
search_emails()
read_email()
summarize_email()
search_contacts()
create_draft()
send_email()
reply_to_email()
forward_email()
```

This approach allows the AI layer to reason about tasks without giving it unrestricted access to the underlying services.

## 🗄️ Database

Faraday uses PostgreSQL for persistent application data.

Neon is recommended for hosted PostgreSQL deployments, but Faraday is not tied to Neon.

Any compatible PostgreSQL provider can be used.

## ☁️ Deployment

Faraday can be deployed using services such as Vercel for supported application components.

The project is designed to remain self-hostable and should not require users to use the maintainer's infrastructure.

## 🔒 Secrets

The following must never be committed to Git:

```text
.env
OAuth client secrets
OAuth refresh tokens
Discord bot tokens
AI API keys
Database credentials
Private email data
Contact data
```

Use `.env.example` to document required environment variables without exposing their values.

## 🤝 Contributing

Contributions are welcome.

Please read `CONTRIBUTING.md` before opening a pull request.

Ideas, bug reports, documentation improvements, security improvements, and feature contributions are all welcome.

## 📄 License

Faraday is released under the MIT License.

See `LICENSE` for the full license text.

## ⚠️ Disclaimer

Faraday is an open-source software project.

You are responsible for configuring your own Google, Discord, AI, database, and hosting services and for reviewing the permissions granted to the application.

Do not use Faraday with accounts or data you are not authorized to access.
