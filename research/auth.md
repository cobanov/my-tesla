# My Tesla authentication research

Research date: 2026-10-18. Checked against Node.js 24.22 (the Docker base image), Next.js 16.3.8, the OWASP cheat sheets, RFC 10027, and the source code of other self-hosted projects.

## Question

How does a self-hosted dashboard with one to five people replace Cloudflare Access with its own accounts: a root account on the first visit, sign-in for everyone else, and a phone that signs in from a QR code?

## Other self-hosted projects

| Project | First run | Setup race | Roles and invites | Sessions | Phone sign-in |
|---|---|---|---|---|---|
| Coolify | With no user, the login page sends to `/register`. The first user becomes root, and registration closes. | Optional `ROOT_*` variables create the root user. The docs warn: "Anyone who reaches the registration page first can become the instance admin." | Owner, admin, member. Invite links that last 3 days. Root cannot be deleted. | Database, 7 days | No app |
| Immich | An admin sign-up that works only while no admin exists | Only that check | The admin creates users | Opaque token stored as a SHA-256 hash, per-device list | Password or OAuth |
| Home Assistant | Onboarding under a lock | None | The admin adds people | 30-minute access token, a refresh token per device, revocable | OAuth 2 with PKCE |
| Jellyfin | Startup wizard | None | The admin creates users | Device tokens | Quick Connect: the phone shows a code, a signed-in browser approves it |
| Gitea | `/install` until `INSTALL_LOCK` | The lock | `DISABLE_REGISTRATION`. The last admin cannot be deleted. | 31 days | No app |
| Grafana, n8n, Paperless-ngx | First admin from variables or the first visit | The admin from environment variables | Invites | 7 days idle, 30 days at most (Grafana) | No app |

Fresh setup pages are scanned: Wordfence counted about 7,500 scans a day for open WordPress installers in 2017. Jupyter and Rancher print a one-time setup token in the logs.

## Decisions

| Topic | Decision | Reason |
|---|---|---|
| Build or buy | Build a small implementation on the session guide of pilcrow | Better Auth fits many apps, but its first ten advisories of June to September 2026 were critical or high, it has no first-run gate, and its device plugin works in the other direction. Auth.js gets only security fixes. Lucia is deprecated and points to the same guide. The own code is four tables and a few hundred lines with tests. |
| Storage | `node:sqlite` in `auth.sqlite` next to the Settings file, WAL mode, foreign keys, versioned migrations | No new dependency. Release candidate in Node 24.15 and later, no flag. A JSON file has no transactions, so two people could pass the setup at once. TeslaMate stays read-only. |
| Passwords | Argon2id from `node:crypto`: 19 MiB, 2 passes, 1 lane, 16-byte salt, 32-byte hash in the PHC format, NFKC normalized, compared in constant time, at most two hashes at once | The OWASP minimum. `crypto.argon2` exists since Node 24.7 and gives the same result in Bun, so the tests run it. |
| Password rule | 15 to 256 characters, no other rule | NIST SP 800-63B-4 for a password as the only factor |
| Unknown email | A decoy hash is checked, and the error is the same | Equal timing and no account discovery |
| Session token | 120-bit id and 256-bit secret, joined by a dot. Only the SHA-256 of the secret is stored, and it is compared in constant time. | OWASP asks for 128 bits of entropy at least, and a stolen database then holds no usable token. |
| Web cookie | `__Host-mytesla-session`, HttpOnly, Secure, SameSite=Lax, path `/`, over HTTPS. `mytesla-session` without Secure on a plain HTTP address in a home network. | `__Host-` binds the cookie to the host. A plain HTTP address cannot keep a Secure cookie. |
| Web lifetime | 30 days, renewed when used, at most once an hour | The Copenhagen Book default |
| Phone lifetime | 90 days, renewed when used | Home Assistant removes unused refresh tokens after 90 days. |
| Cross-site requests | Server actions check `Origin` against `Host`. A route handler with a cookie session and a method other than GET needs `Sec-Fetch-Site: same-origin` or a matching `Origin`. The phone uses `Authorization: Bearer`. | The Next.js data security guide. A bearer header cannot be sent by another site. |
| Brute force | After 5 failures for one email, a wait that doubles from 1 s up to 15 min. 100 failures a day for one address. The same limits guard the setup and the pairing. | The OWASP authentication cheat sheet |
| Setup | No user means every page goes to `/setup`. The server prints a one-time setup link with a token in its log. The first admin is created in a transaction that checks again that no user exists. After that, `/setup` answers 404. | Coolify and Home Assistant show the flow. The token closes the race that Coolify warns about, as Jupyter and Rancher do. |
| Phone pairing | The web page shows a QR code with the address and a 256-bit code that lasts 90 s and changes every 60 s. The phone claims it once and gets a pending device token. The web page asks "Allow this phone?", and only then does the token work. | RFC 10027 calls a signed-in page that hands its session to a phone "session transfer". Its main risk is a code that someone else sees or forwards, so the approval turns a leaked code into a request that the person must accept. |
| Phone storage | The token in the Keychain or the Keystore through `expo-secure-store` | OWASP MASWE-0003 |

## Sources

- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [pilcrow: sessions](https://auth.pilcrowonpaper.com/sessions), [CSRF](https://auth.pilcrowonpaper.com/csrf), [Argon2](https://auth.pilcrowonpaper.com/argon2)
- [Node.js 24 `node:sqlite`](https://nodejs.org/docs/latest-v24.x/api/sqlite.html), [`crypto.argon2`](https://nodejs.org/docs/latest-v24.x/api/crypto.html)
- [RFC 10027: cross-device flows](https://www.rfc-editor.org/rfc/rfc10027.html), [RFC 8628 §5](https://www.rfc-editor.org/rfc/rfc8628#section-5), [OWASP QRLJacking](https://github.com/owasp/qrljacking)
- [Better Auth advisories](https://github.com/better-auth/better-auth/security), [Better Auth with Next.js](https://better-auth.com/docs/integrations/next)
- [Coolify: create the root user](https://coolify.io/docs/knowledge-base/create-root-user-with-env), [Coolify CreateNewUser](https://github.com/coollabsio/coolify/blob/main/app/Actions/Fortify/CreateNewUser.php), [Immich users](https://docs.immich.app/administration/user-management), [Home Assistant auth API](https://contributors.home-assistant.io/core/internals/auth-api/), [Jellyfin Quick Connect](https://github.com/jellyfin/jellyfin/blob/master/Emby.Server.Implementations/QuickConnect/QuickConnectManager.cs), [Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/), [Wordfence 2017](https://www.wordfence.com/blog/2017/07/wpsetup-attack/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- The Next.js 16 guides in `node_modules/next/dist/docs/`: authentication, authentication with Cache Components, data security, and proxy.

## Open

1. Invite links and the removal of users. The store keeps roles from the start.
2. A passkey or a second factor. A password of 15 characters is the only factor for now.
3. An email to the user when a phone pairs. The app sends no mail yet, so the device list shows each new phone.
