# Mobile app

The `mobile/` folder holds the My Tesla app for iOS and Android. It is an Expo project. It reads the same My Tesla server as the browser and shows the car in the Tesla style of the dashboard. The server can also send push alerts to it. [Decision 0020](decisions/0020-mobile-app-and-push-alerts.md) explains the design.

## What the app does

| Screen | Content |
|---|---|
| Connect | "Scan the code" reads the QR code from Settings on the web, connects, and opens its car. The server address and an optional Cloudflare Access service token can also be typed in. "Open the demo" connects to the public demo. |
| Overview | The car image, name, and state, the battery and range with the time left of a charge, the odometer, the temperatures, the software version, the Live card, Today, the tire pressures with a slow-leak warning, the location with "Open in Maps", and the last drive and charge. A car switcher shows with more than one car. |
| Drives | The trips by day. A trip opens its legs and stops, and a drive opens its figures and its speed, power, elevation, and battery charts. |
| Charging | The charges by day, with AC or DC and the levels. A charge opens its figures, the cost breakdown, the power curve, and the battery, power, voltage, and current charts. Older and Newer step through the charges. |
| Insights | Battery, Stats, and Places, the same panels as on the web, with the period of each. A longest drive or a frequent route opens its drive. |
| Settings | The theme of this phone (System, Light, or Dark, Dark at first), a preview of the units, the Settings of the web that change the app (units, date and time, numbers, charging cost, location, and the Overview cards), the alerts that this phone gets with a test alert, and the server with Disconnect |

The server formats every value with the Settings of the person who signs in: units, number style, date and clock format, currency, time zone, place names, and the Overview cards. Change them in the Settings tab or on the web. Both change the same Settings. The phone keeps the car list, the last Settings, and the theme, so the Settings tab opens at once and without a network. Read [API](api.md#app-api).

Every list refreshes when you pull it down. The Overview and a charge also refresh every 30 s while they are on screen. A value in green or red explains itself when you press it.

## Tools

| Tool | Version | Use |
|---|---|---|
| Expo SDK | 58 (React Native 0.88, React 19.3) | The app runtime, from `mobile/package.json` |
| Bun | 1.3.14 | Installs the packages and runs the tests |
| EAS CLI | 25 or newer | Cloud builds, push credentials, store uploads |
| Xcode | 27 or newer | Local iOS builds and the iOS Simulator |
| Android Studio | Current | Local Android builds and the emulator |

Push alerts do not work in Expo Go, so the app runs as a development build.

## First setup

```bash
bun install --cwd mobile --frozen-lockfile
```

The root quality gates also lint and type-check `mobile/`, so the commit hook needs this install.

### Run on a simulator or a phone

1. Build and install the development app. Pick one:

   ```bash
   cd mobile
   APP_VARIANT=development bun run ios
   APP_VARIANT=development bun run android
   ```

   Or build in the cloud with `eas build --profile development --platform ios`, and install the result on the phone.

2. Start Metro for the installed app:

   ```bash
   cd mobile
   APP_VARIANT=development bun run start
   ```

3. In the app, open the demo, or type the address of your server.

`APP_VARIANT=development` gives the app its own name, "My Tesla Dev", its own bundle ID, `bi.chele.mytesla.dev`, and the scheme `mytesla-dev`, so it sits next to a store build.

### Use a local server

Start the dashboard with demo data on all network interfaces:

```bash
DEMO_MODE=1 ALLOWED_DEV_ORIGINS=my-laptop.local bun run dev -- -H 0.0.0.0
```

In the app, type `http://my-laptop.local:3000`. The iOS Simulator also reaches `http://localhost:3000`, and the Android emulator reaches `http://10.0.2.2:3000`. Use `https` for every server outside your own network.

## Connect to a real server

The server sits behind an authenticating proxy. Read [Protect the dashboard](authentication.md).

| Proxy | What the app needs |
|---|---|
| Cloudflare Access | A service token. Make it as in [API](api.md#call-the-api-through-cloudflare-access), and type the Client ID and the Client Secret in the app. The app keeps both in the Keychain or the Android Keystore through `expo-secure-store`. |
| Tailscale | Only the address, such as `https://tesla.your-tailnet.ts.net`, from a phone on the tailnet |
| Other proxies | The app sends no browser login. Use a path that the proxy lets through for the phone, such as a VPN. |

Give the app its own service token, so that you can stop it without the scripts.

## Connect with a QR code

1. Behind Cloudflare Access, make a service token for the app as in [API](api.md#call-the-api-through-cloudflare-access), and set `MOBILE_ACCESS_CLIENT_ID` and `MOBILE_ACCESS_CLIENT_SECRET` on the server. On a private network, skip this step.
2. Set `SITE_URL` to the address that the phone uses. Without it, the code holds the address in the browser.
3. On the web, open Settings for the car, then Mobile app, and press "Show the code".
4. In the app, press "Scan the code" on the Connect screen. To switch servers, press Disconnect in the Settings tab first.

The code holds the address, the car, and the service token when the server has one. Anyone who scans or photographs it can open the dashboard, so show it only to yourself. It hides after 2 minutes. To stop the phones, delete the service token in Cloudflare and set a new one. [Decision 0021](decisions/0021-connect-the-app-with-a-qr-code.md) explains the design.

## Push alerts

The server watches the TeslaMate MQTT feed and sends an alert when an event happens. It needs `MQTT_URL`. Read [Live status](live-status.md).

| Event | When |
|---|---|
| Charging started | The charge state turns to Charging |
| Charging complete | A charge reaches the limit |
| Charging stopped | A charge stops before the limit, for example when the cable comes out |
| Left unlocked | The parked car stays unlocked for 10 minutes with nobody inside |
| Software update | The car has a new software update |
| Tire pressure | The car warns about a tire |

`GET /api/push` lists these events, so a new event on the server shows in the app without an app update. Each alert has its own notification channel on Android, so the phone settings can mute one kind.

### Set up push for your own build

1. The repository is linked to the EAS project `@woosal/my-tesla`. `app.config.ts` holds its project ID and owner. For a build of your own, make an Expo account, run `eas init` in `mobile/`, and set the new values in the environment of every build:

   ```bash
   export EAS_PROJECT_ID=<the project id>
   export EAS_OWNER=<your Expo account>
   ```

2. Run `eas credentials` once for each platform. EAS keeps the Apple push key and the Firebase key. Android needs a Firebase project with FCM v1. Read [Expo push notification setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).
3. Build the app again. A token comes only from a real phone, not from a simulator.
4. Optional: turn on enhanced push security in the Expo dashboard, and set its token as `EXPO_ACCESS_TOKEN` on the My Tesla server.
5. In the app, open Settings, turn on an alert, and press "Send a test alert".

The server keeps the tokens in `push-devices.json` next to the Settings file. Disconnect in the app removes the token of the phone.

### Add an event

1. Add the event to `carEvents` in `src/lib/push/events.ts`, and add its rule to `changes()` or to `watchStep()`.
2. Add a test to `src/lib/push/events.test.ts`.
3. Update the table above.

The app needs no change. It reads the list from the server.

## Code layout

`mobile/AGENTS.md` describes each folder and the rules for the code. The main parts:

| Path | Content |
|---|---|
| `mobile/app.config.ts` | The app name, the IDs, the icons, the splash, and the plugins. `APP_VARIANT` and `EAS_PROJECT_ID` come from the environment. |
| `mobile/eas.json` | The build profiles: `development`, `development-simulator`, `preview`, and `production` |
| `mobile/src/app/` | The Expo Router routes: the root stack with Connect, and the five tabs with a stack each |
| `mobile/src/screens/` | The drive, trip, and charge screens, which more than one tab shows |
| `mobile/src/components/` | The shared components: text, panels, stats, rows, the segmented control, the chart, and the dashboard parts |
| `mobile/src/api/` | The request with the service token, the shape check of each answer, and one query hook for each endpoint |
| `src/lib/app/contract.ts` | The types of every answer, shared by the server and the app |

## Rules

`mobile/AGENTS.md` holds the rules for the app code, and `research/mobile-ui.md` holds the research behind them. Coding agents read `mobile/AGENTS.md` when they work in `mobile/`.

## Checks

| Command | Effect |
|---|---|
| `bun run --cwd mobile lint` | ESLint with the Expo rules and the React Compiler rules |
| `bun run --cwd mobile typecheck` | TypeScript in strict mode |
| `bun test mobile` | The pure mobile tests |
| `bun x expo-doctor` in `mobile/` | Checks the Expo setup and the package versions |
| `bun x expo export --platform ios --platform android` in `mobile/` | Bundles both platforms without a device |

`python3 tools/quality.py check` runs the lint and the type check with the web gates.
