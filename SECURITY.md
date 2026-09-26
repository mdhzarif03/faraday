
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Faraday, please report it privately to the project maintainer rather than opening a public issue.

Include:

* A description of the vulnerability
* Steps to reproduce it
* Potential impact
* Any relevant logs or screenshots that do not contain private information

Please do not include passwords, OAuth tokens, API keys, private emails, or other sensitive information in a report.

## Credential Safety

Never commit the following to the repository:

* Google OAuth secrets
* Google refresh tokens
* Discord bot tokens
* AI API keys
* Database credentials
* Private keys
* User email contents
* Contact information

Use environment variables or an appropriate secret-management system.

## OAuth Security

Faraday should request only the Google permissions required for its functionality.

OAuth tokens should be protected and never exposed to Discord users, logs, error messages, or client-side code.

## Email Actions

Actions that create external side effects, particularly sending, replying to, forwarding, or deleting emails, should use explicit authorization and confirmation mechanisms where appropriate.

Faraday should never assume that an AI-generated action is automatically authorized simply because the AI proposed it.

## User Responsibility

Self-hosted installations are responsible for securing their own infrastructure, credentials, databases, hosting environment, and Google/Discord accounts.
