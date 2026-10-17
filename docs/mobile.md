# Mobile app

The `mobile/` folder holds the My Tesla app for iOS and Android. It is an Expo project. It reads the same My Tesla server as the browser and shows the car in the Tesla style of the dashboard. The server can also send push alerts to it. [Decision 0020](decisions/0020-mobile-app-and-push-alerts.md) explains the design.

## What the app does

| Screen | Content |
|---|---|
| Connect | "Scan the code" reads the QR code from Settings on the web, waits until the person allows the phone there, signs in, and opens its car. "Open the demo" connects to the public demo. |
| Overview | The car image, name, and state, the battery and range with the time left of a charge, the odometer, the temperatures, the software version, the Live card, Today, the tire pressures with a slow-leak warning, the location on a map with "Open in Maps", and the last drive and charge. A car switcher shows with more than one car. |
| Drives | The trips by day. A trip opens its route on a map with its start, stops, and end, and its legs. A drive opens its route on a map, its figures, and its speed, power, elevation, and battery charts. |
| Charging | The charges by day, with AC or DC and the levels. A charge opens its figures, the cost breakdown, the power curve, and the battery, power, voltage, and current charts. The place of the charge shows on a map. Older and Newer step through the charges. |
| Insights | Battery, Stats, and Places, the same panels as on the web, with the period of each. Places starts with a map of the visited and charging places. A longest drive or a frequent route opens its drive. |
| Settings | The theme of this phone (System, Light, or Dark, Dark at first), a preview of the units, the Settings of the web that change the app (units, date and time, numbers, charging cost, location with the maps and their theme, and the Overview cards), the alerts that this phone gets with a test alert, and the account with Sign out |

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

## Sign in to a real server

The phone signs in as a person, from Settings on the web. It never sees the password.

1. Set `SITE_URL` on the server to the address that the phone uses. Without it, the code holds the address that the browser uses.
2. On the web, sign in, open Settings for a car, then **Mobile app**, and press **Pair a phone**.
3. In the app, press **Scan the code**.
4. The web page asks whether to allow the phone, with its name, its system, and its address. Press **Allow**. The app opens the car of the code.

The code holds the server address, the car, and a single-use code that lasts 90 seconds, and the page shows a new one every minute. The phone gets its own token. The app keeps it in the Keychain or the Android Keystore through `expo-secure-store`, for this device only, and sends it as `Authorization: Bearer`. It lasts 90 days after its last use. **Account** on the web lists the phone and signs it out. The app then shows the Connect screen again. **Sign out** in the Settings tab of the app also ends the token on the server. [Decision 0023](decisions/0023-native-accounts.md) explains the design.

"Open the demo" connects to the public demo, which needs no account.

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

The server keeps the tokens in `push-devices.json` next to the Settings file. Sign out in the app removes the push token of the phone. Each push token remembers the phone session that saved it, and the server sends alerts only to phones that are still signed in, so a phone signed out from the web gets no more alerts.

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
| `mobile/src/api/` | The request with the phone token, the shape check of each answer, and one query hook for each endpoint. A 401 signs the phone out. |
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
