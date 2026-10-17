# 0023: Native accounts and phone pairing

Date: 2026-10-18

Status: Accepted.

## Context

My Tesla has no login of its own. The docs ask for an authenticating proxy, and the owner's server uses Cloudflare Access ([decision 0010](0010-verify-access-token.md)). The settings of each person are kept under the email that the proxy sends. The mobile app passes the proxy with a Cloudflare Access service token, which the QR code in Settings carries ([decision 0021](0021-connect-the-app-with-a-qr-code.md)). A service token has no email, so the app uses the shared `owner` Settings.

Other self-hosted apps sign people in themselves: the first visit creates the root account, and every later visit needs a session. The owner wants the same, with a phone that signs in as the person who shows the code.

## Decision

1. My Tesla keeps users, sessions, phones, and pairing codes in its own SQLite file, `auth.sqlite` next to the Settings file, through `node:sqlite`. It never writes to TeslaMate.
2. With no user, every page goes to `/setup`. The server prints a one-time setup link with a token in its log, and the setup page needs that token. The first account is the admin, and it is created in a transaction that checks again that no user exists. After that, `/setup` goes to the sign-in page.
3. Passwords are Argon2id from `node:crypto` with the OWASP parameters, and need 15 characters at least.
4. A web session is an opaque token in an HttpOnly, SameSite=Lax cookie, Secure and with the `__Host-` prefix over HTTPS. It lasts 30 days and renews when used. The server keeps only a SHA-256 hash of the token.
5. `src/proxy.ts` checks the session of every request. A page without one goes to `/login`. An API call without one gets 401. The data layer checks the session again, so a route never depends on the proxy alone.
6. Login, setup, and pairing are rate limited by account and by address. A wrong email and a wrong password give the same answer in the same time.
7. Settings stay keyed by the email of the account, as in the Cloudflare Access time, so they carry over. An account without them starts from the Settings under `owner`.
8. A signed-in person pairs a phone from Settings. The page shows a QR code with the server address and a single-use code that lasts 90 seconds and changes every minute. The phone claims the code and gets a device token that works only after the person allows it on the page. The device token lasts 90 days, renews when used, and can be revoked from the list of sessions.
9. A script reads the API with a token that the person makes in the account page. It is a device token without a phone, shown once.
10. Demo mode keeps working without accounts.
11. The Cloudflare Access check of decision 0010 stays as an option. The email header and the service token in the QR code go away.

`research/auth.md` gives the reasons, the comparison with other self-hosted apps, and the sources.

## Alternatives

1. Better Auth. It has more features, but it has had many serious advisories this year, needs fast upgrades, has no first-run gate, and its device plugin pairs in the other direction.
2. A setup page without a token, as in Coolify. Whoever reaches a new install first would own it.
3. Sessions in a signed cookie without a store. A session could not be revoked, and a phone could not be listed.
4. A JSON file for the accounts. It has no transactions, so two people could both pass the setup.

## Consequences

A new install needs the setup link from the server log once. Behind Cloudflare Access the owner can keep both checks while moving over, then remove Access.

The `auth.sqlite` file holds password hashes and session hashes. It lives on the same private volume as the Settings, with mode 0600, and backups should treat it as secret.

Phones paired with a service token must pair again with the new code.
