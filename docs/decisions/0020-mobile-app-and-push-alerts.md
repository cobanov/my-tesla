# 0020: Mobile app and push alerts

Date: 2026-10-17

Status: Accepted. The app has Overview, Drives, Charging, Insights, and Settings.

## Context

The owner wants My Tesla on iOS and Android as a native app, with push alerts for car events such as the end of a charge. The web dashboard renders every value on the server and has no JSON API for its pages. TeslaMate keeps most event values, such as the lock and the charge state, only in the MQTT feed, and [decision 0008](0008-mqtt-live-status.md) keeps them in memory.

## Decision

1. The app lives in `mobile/` in this repository. It is an Expo SDK 58 project with its own `package.json` and `bun.lock`, not a workspace, so the web build, the container image, and the Vercel demo do not change.
2. The app uses Expo Router with native tabs, TanStack Query for server data, `expo-secure-store` for the server address and the service token, `expo-sqlite/kv-store` for the theme and the last Settings, and Inter in the two weights of the web. The colors copy `src/app/globals.css`, and a test fails when the two drift.
3. The app reads the same server as the browser, behind the same proxy. It sends a Cloudflare Access service token when the user gives one. It reads JSON only: `/api/cars.json`, `/api/push`, and the app API at `/api/app/cars/{carId}/`.
4. The server formats every value of the app API with the Settings of the person who asks, through the same formatter as the pages. The app keeps no unit or date logic of its own, so a Settings change on the web shows in the app at the next request. A chart comes with its ticks and labels, so the app only draws it.
5. The five tabs are Overview, Drives, Charging, Insights, and Settings. Settings changes the same Settings as the web through `/api/app/settings`, so it is a destination of its own and not a modal. The app starts dark, and the theme is a choice of the phone. `research/mobile-ui.md` gives the reasons and the sources.
6. The server sends the alerts. `src/instrumentation.ts` starts one watcher per server process when `MQTT_URL` is set and demo mode is off. The watcher compares each new live view with the last one and finds six events: charging started, complete, and stopped, left unlocked for 10 minutes, a software update, and a tire warning. It waits 5 seconds after the first values of a car, so the retained values after a restart send no alert.
7. The server sends each alert through the Expo push service, which hands it to Apple or Google. A phone registers its Expo push token and its events with `PUT /api/push`. The server keeps the tokens in `push-devices.json` next to `PREFERENCES_FILE`, and it drops a token when Expo answers `DeviceNotRegistered`.
8. An alert holds the event name, the car name, and a number such as the charge limit or the software version. It never holds a position.

## Alternatives

1. A separate repository for the app. The API and the app then change in two places, and the design tokens can drift without a test.
2. A Bun workspace with the web app in `apps/web`. It moves every web path, the Dockerfile, the Vercel settings, and the CI for one new folder.
3. ntfy or a webhook instead of Expo push. It needs a second app on the phone, or a public endpoint of the user's own. Expo push needs no extra service on the server and works with the Expo notification API.
4. Direct APNs and FCM calls from the server. Each self-hosted install then needs Apple and Google keys. Expo keeps those keys with the app build.
5. A history database for the MQTT values. Alerts need only the last view, so the store waits for a lock history page.

## Consequences

Push alerts send the car name and the event to Expo, Apple, or Google. [Privacy](../privacy.md) lists this. A server without the MQTT feed answers `enabled: false`, and the app shows why. The demo never stores a token.

The MQTT connection now opens when the server starts, not at the first request, when `MQTT_URL` is set.

Alerts need a long-running server. A serverless deploy, such as the Vercel demo, runs no watcher.

Each server process runs its own watcher. Two replicas of the app would send each alert twice.

The root quality gates also run the mobile lint and type checks, so a clone needs `bun install --cwd mobile` before the commit hook passes. `bun test` at the root also runs the pure mobile tests.
