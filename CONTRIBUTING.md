# Contributing to Faraday

Thanks for your interest in contributing to Faraday.

Faraday is an open-source project and contributions of all kinds are welcome.

## Ways to Contribute

You can contribute through:

- Bug fixes
- New features
- Documentation
- Security improvements
- Tests
- Performance improvements
- UI/UX improvements
- New integrations
- Issue reports

## Development

Fork the repository and clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/faraday.git
cd faraday
```

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Configure your own credentials.

Never use another person's credentials or commit secrets to the repository.

## Pull Requests

Before opening a pull request:

1. Make sure the project builds successfully.
2. Run the available tests.
3. Check formatting and linting.
4. Update documentation when necessary.
5. Keep changes focused and understandable.
6. Do not include secrets or private user data.

## Security Issues

Please do not publicly disclose security vulnerabilities before they have been investigated.

For sensitive security issues, contact the project maintainer privately.

## Code Style

Prefer simple, readable code over unnecessary abstraction.

Keep service integrations separated from the agent layer.

Do not give the AI unrestricted access to external services when a narrowly scoped tool can accomplish the task.

## Philosophy

Faraday should remain:

- Privacy-conscious
- Self-hostable
- Understandable
- Modular
- Reliable
- User-controlled

Thanks for helping improve Faraday.
