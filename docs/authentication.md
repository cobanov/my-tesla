# Accounts and sign-in

My Tesla signs people in itself. It shows a location history: where the car parks, where it charges, and every route. Every page and every API call needs an account, except the public demo. [Decision 0023](decisions/0023-native-accounts.md) explains the design, and [the research](../research/auth.md) gives the reasons and the sources.

## The rules

1. Serve the dashboard over HTTPS. The session cookie is `Secure` and uses the `__Host-` prefix only over HTTPS. On a plain HTTP address in your home network the cookie still works, without `Secure`.
2. Keep the data volume private. `auth.sqlite` holds the password hashes and the session hashes, next to the Settings file, with mode 0600. Treat its backups as secret.
3. Bind the container port to `127.0.0.1`, or keep it on a private Docker network, and let your reverse proxy or tunnel reach it. The examples in [Installation](installation.md) do this.

## The first start

A new install has no account. Every page then opens the setup page, and the API answers 503.

1. Start the container.
2. Read its log:

   ```bash
   docker logs my-tesla 2>&1 | grep "setup?token"
   ```

   The line reads: `My Tesla has no account yet. Open https://tesla.example.com/setup?token=… to create the admin account.` The address comes from `SITE_URL`, or is `http://localhost:3000`.
3. Open the link, and type your name, your email, and a password of 15 characters or more. A few words in a row work well.

This first account is the admin. The setup token closes the race in which a stranger reaches a new install first. Each restart before the setup prints a new link. After the setup, `/setup` goes to the sign-in page.

## Sign in

The sign-in page asks for the email and the password. A wrong email and a wrong password give the same message. After 5 failures for one email, each try waits longer, from 1 second up to 15 minutes. One network address gets 100 tries a day.

A session lasts 30 days and renews while you use it. **Account**, the round button with your initial in the header, shows every browser, phone, and script token with its last use and address. Each can be signed out there. A new password signs out every other session.

## Phones

The mobile app signs in from Settings on the web:

1. Open Settings for a car, then **Mobile app**, and press **Pair a phone**.
2. In the app, press **Scan the code**.
3. The page asks whether to allow the phone, with its name, system, and address. Press **Allow** only if you just scanned the code yourself.

The code holds the server address, the car, and a single-use code that lasts 90 seconds. The page shows a new code every minute and hides it after 3 minutes. The phone gets its own token, which lasts 90 days after its last use and shows under **Account**. [Mobile app](mobile.md) has the details.

## Scripts

A script or a home automation reads the API with a token. Make one under **Account**, **Tokens for scripts**, and copy it: it shows only once. Send it as a header:

```bash
curl -fsS -H "Authorization: Bearer $MY_TESLA_TOKEN" \
  https://tesla.example.com/api/cars/2/summary.json
```

## Behind Cloudflare, Tailscale, or another proxy

A tunnel or a reverse proxy only carries the traffic now. The app does the sign-in.

- **Cloudflare Tunnel**: route the host name to `http://127.0.0.1:3000`, or to the container on the Docker network. Cloudflare Access is no longer needed. If you keep it, the phones and the scripts must pass it too, so add a Bypass policy for them or remove the Access application.
- **Tailscale**: `tailscale serve --bg 3000` keeps the dashboard on your tailnet. Do not use `tailscale funnel`, which publishes it.

### Verify the Cloudflare Access token

The check of [decision 0010](decisions/0010-verify-access-token.md) stays as an option for a dashboard that keeps Cloudflare Access in front. Set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`, and the app answers 403 to a request without a valid Access token, before its own sign-in. `/api/health` stays open for the container health check.

## A lost password

The app sends no email, so it cannot reset a password. To start over, stop the container, delete `auth.sqlite` from the data volume, and start it again. The log then prints a new setup link. The Settings stay in their file.

## Server actions and the host name

The pages save through Next.js server actions. Next.js accepts an action only when the `Origin` header matches the `Host` header, or `X-Forwarded-Host`. Most proxies send the right headers. If a save fails, make the proxy forward the original host. An API call with a session cookie and a method other than GET also needs a same-origin request.
