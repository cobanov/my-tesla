# Privacy

The dashboard shows a location history. This page lists every place that data goes.

## What stays on your server

- The server reads the database and renders the pages. The browser gets HTML and chart data for the pages that you open.
- The saved Settings stay in `PREFERENCES_FILE` on your server.
- The accounts stay in `auth.sqlite` next to it: name, email, and an Argon2id hash of the password. For each session, phone, and script token it keeps a hash of the token, the phone name and system, the network address of the sign-in, and the time of the last use. Signed-out sessions are deleted.
- With [Live status](live-status.md), the server keeps the last MQTT values in memory only. It saves no history and never publishes to the broker.
- With push alerts, the server keeps the push token and the chosen events of each phone in `push-devices.json`, next to the Settings file.
- A normal install sends no analytics and no telemetry. Only demo mode can load an analytics script, and only when its operator sets `OPEN_ANALYTICS_URL` and `OPEN_ANALYTICS_KEY`. The container image also sets `NEXT_TELEMETRY_DISABLED=1`, which turns off the build telemetry of Next.js.

## What the server sends to outside services

| Service | When | What the service can see | How to stop it |
|---|---|---|---|
| Expo push service (`exp.host`), then Apple Push Notification service or Firebase Cloud Messaging | Only after a phone turns on an alert in the [mobile app](mobile.md), and only with the MQTT feed | The push token of the phone, the alert title, and a sentence with the car name and a value, such as "Rika reached 80%." or a software version. Never a position. | Turn off the alerts in the app, or press Disconnect |

## What the browser asks from outside services

| Service | Request | What the service can see | How to stop it |
|---|---|---|---|
| CARTO basemaps | Map tiles for the map views of the web and the mobile app | Your IP address and the map area around the car, its routes, and your places | Settings, Location, Maps: Hide |
| Tesla image server (`static-assets.tesla.com`) | The picture of your car on Overview | Your IP address and the model, color, wheels, and trim of the car | Settings, Overview: turn off Car image |
| Apple Maps | Only when you press "Open in Maps" | The car position | Do not press the button |

The map library itself loads from your server, not from a CDN.

## Before you share your screen

1. Open Settings.
2. Set Maps to Hide.
3. Set Address detail to City, or Place names to Geofence first with geofences for your private places.

The maps, the route lines, and the place markers then disappear from every page.
