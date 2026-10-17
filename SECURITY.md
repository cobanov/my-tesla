# Security policy

## Report a vulnerability

Do not open a public issue for a security problem.

1. Open the repository on GitHub.
2. Go to Security, then "Report a vulnerability".
3. Describe the problem, the affected version, and the steps to reproduce it.

You get an answer within 7 days. A fix and an advisory follow as soon as possible.

## Supported versions

Only the latest release gets security fixes.

## Security model

- Every page and API call needs an account. A new install prints a one-time setup link in its log, and the first account is the admin. Read [Accounts and sign-in](docs/authentication.md) and [decision 0023](docs/decisions/0023-native-accounts.md).
- Passwords are hashed with Argon2id. Sessions, phone tokens, and script tokens are random, and the server keeps only their SHA-256 hash in `auth.sqlite`. Each one can be revoked.
- Sign-in, setup, and phone pairing are rate limited. A phone works only after the person allows it on the web.
- Behind Cloudflare Access, `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` add a check of the signed Access token before the app's own sign-in.
- The app connects to the database with a read-only role. It refuses the TeslaMate superuser. Every session is read-only and has a statement timeout.
- The app never sends database values to the browser outside the rendered pages.
- The container runs as an unprivileged user.

These reports are in scope:

- a way to write to the TeslaMate database through the app,
- a way to read data from the app without passing the proxy, when the deployment follows the docs,
- cross-site scripting or request forgery in the app,
- a leak of secrets or database values into logs, HTML, or client bundles.
