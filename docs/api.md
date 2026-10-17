# API

The app has five read-only `GET` endpoints for scripts, widgets, home automation, and the [mobile app](mobile.md), and one endpoint for push alerts. They sit behind the same proxy as the pages. Read [Protect the dashboard](authentication.md) first.

| Endpoint | Gives |
|---|---|
| `/api/cars.json` | The cars, as JSON: `id`, `name`, `model`, and `trim` of each car, and `defaultCarId`, the car with the latest position |
| `/api/cars/{carId}/summary.json` | The car status now, as JSON. Add `?location=1` for the position and the navigation. |
| `/api/cars/{carId}/drives.csv` | All drives as CSV. Optional `from` and `to` dates, as `YYYY-MM-DD`. |
| `/api/cars/{carId}/charges.csv` | All charges as CSV, with the same optional dates. |
| `/api/cars/{carId}/drives/{driveId}.gpx` | One drive as a GPX track. |

The car id is the TeslaMate number of the car. The dashboard address uses the car name, such as `/cars/red-rocket`, and the id address, such as `/cars/2`, opens the same car. The API takes only the id, so a new car name does not break a script. An unknown car gives status 404.

## Car summary

`summary.json` gives the values of the Overview page: the state, the battery, the range, the odometer, the temperatures, the tire pressures, and the software version. With the [MQTT feed](live-status.md), it also gives the live values: locks, Sentry Mode, open doors and windows, charging, climate, driving, and a software update.

The units are always metric, so a script does not depend on the Settings page:

| Field suffix | Unit |
|---|---|
| `Km` | Kilometers |
| `Kmh` | Kilometers per hour |
| `C` | Degrees Celsius |
| `Bar` | Bar |
| `Kw` | Kilowatts |
| `Percent` | Percent |

Times are ISO 8601 in UTC. A value that TeslaMate does not have is `null`.

| Field | Meaning |
|---|---|
| `state` | `driving`, `charging`, `online`, `asleep`, `offline`, or `unknown`. A connected MQTT feed sets it first. |
| `updatedAt` | The time of the last position or state change |
| `battery.rangeKind` | `rated` or `ideal`, from the Settings of the shared `owner` user |
| `live` | `null` without `MQTT_URL`. `{ "connected": false }` when the feed is down. |
| `live.charging.fullAt` | The time at which the charge reaches the limit, from the estimate of the car. `null` when the car does not charge. |
| `live.openParts` | The names of the open doors, windows, trunk, frunk, and sunroof. `null` when the feed has not sent them. |
| `location` | Only with `?location=1`: `latitude`, `longitude`, `at`, and `navigation` with the destination of the active route |

The response leaves out the position unless the request asks for it. A widget that shows only the battery and the lock does not need a location history.

```json
{
  "car": { "id": 2, "name": "Juniper", "model": "Model Y", "trim": "SR" },
  "state": "online",
  "updatedAt": "2026-10-01T22:58:16.660Z",
  "battery": { "levelPercent": 50, "usableLevelPercent": 50, "rangeKm": 220.7, "rangeKind": "rated", "at": "2026-10-01T22:58:16.660Z" },
  "odometerKm": 4286.7,
  "tiresBar": { "frontLeft": 2.9, "frontRight": 2.9, "rearLeft": 2.7, "rearRight": 2.9 },
  "live": { "connected": true, "locked": true, "sentryMode": true, "openParts": [] }
}
```

The example shows some of the fields. Each response has the header `Cache-Control: private, no-store`.

## Push alerts

`/api/push` registers a phone for push alerts. Only the [mobile app](mobile.md) uses it. Each request with a body needs `Content-Type: application/json`.

| Method | Body | Effect |
|---|---|---|
| `GET` | None | `{ "enabled": true, "events": [...] }`: whether the server can send alerts, and the events with `id`, `title`, and `description` |
| `PUT` | `{ "token": "ExponentPushToken[...]", "events": ["charging-complete"] }` | Saves the phone and its events. An empty list removes the phone. |
| `DELETE` | `{ "token": "ExponentPushToken[...]" }` | Removes the phone. Answers 204. |
| `POST` | `{ "token": "ExponentPushToken[...]" }` | Sends a test alert to a saved phone. Answers 204. |

`enabled` is `false` without `MQTT_URL` and in demo mode, and `PUT` and `POST` then answer 409. An unknown event or a token in another form gives 400.

## Call the API through Cloudflare Access

A script cannot do the login in a browser. Give it a Cloudflare Access service token:

1. In Cloudflare Zero Trust, open Access, Service credentials, Service Tokens. Make a token, and keep the Client ID and the Client Secret in your password manager.
2. Open the Access application of the dashboard. Add a policy with the action **Service Auth**, and include only this service token.
3. Send the two values as headers:

   ```bash
   curl -fsS \
     -H "CF-Access-Client-Id: $CF_CLIENT_ID" \
     -H "CF-Access-Client-Secret: $CF_CLIENT_SECRET" \
     https://tesla.example.com/api/cars/2/summary.json
   ```

The token check in the app accepts a service token. A service token has no email, so the request uses the Settings of the shared `owner` user. The CSV files use these units and this time zone.

To stop the access, delete the service token in Zero Trust. Give each script its own token, so that you can stop one without the others.

## Other proxies

With Authelia, Authentik, or oauth2-proxy, use the token or the API key feature of the proxy. With Tailscale, call the endpoint from a device on your tailnet.
