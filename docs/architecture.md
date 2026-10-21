# My Tesla architecture

A Next.js App Router app that reads the TeslaMate PostgreSQL database on the server. TeslaMate logs the cars. teslamate-mcp gives chat access. This app gives the web view. The three parts share one database, and this app has read-only access to it.

## Modules and boundaries

| Boundary | Responsibility |
|---|---|
| `src/lib/database-config.ts` | Reads and checks `DATABASE_URL`, `STATEMENT_TIMEOUT_MS`, and `DATABASE_POOL_MAX`. Refuses privileged users. |
| `src/lib/database.ts` | One lazy `postgres` client. Read-only sessions with a statement timeout. Server only. |
| `src/lib/health.ts` | Turns one database ping into a health result, with a timeout. No I/O of its own. |
| `src/app/api/health/route.ts` | `GET /api/health`. Returns 200 or 503 with `Cache-Control: no-store`. |
| `src/lib/queries.ts` | The read queries: cars, the car snapshot, drives, and charges. Each one calls `connection()`, so every page renders at request time. Server only. |
| `src/lib/car-route.ts` | Turns the `carId` route parameter, a name slug or an id, into a car, or calls `notFound()`. |
| `src/lib/car-slug.ts` | Pure logic for the car address: the slug of each car name, the path, and the lookup by slug or id. Full test cover. Read [decision 0016](decisions/0016-car-names-in-urls.md). |
| `src/lib/car-image.ts` | Maps the TeslaMate model, color, wheel, and badge to a Tesla compositor URL. No I/O. |
| `src/lib/preferences.ts`, `units.ts`, `date-format.ts`, `format.ts` | Pure logic for the settings: the option lists, the parser that drops unknown values, unit conversion, date and clock text, and `createFormatter`, which turns the settings into one formatter for every page and chart. No I/O, full test cover. |
| `src/lib/preferences-store.ts` | Reads and writes the settings file at `PREFERENCES_FILE`, one entry for each user. Writes go through one queue, to a temporary file, then a rename. Server only. |
| `src/lib/auth/` | The accounts: `store.ts` keeps users, sessions, phones, pairing codes, invites, and reset links in `auth.sqlite` through `node:sqlite`; `password.ts` hashes with Argon2id; `tokens.ts`, `paths.ts`, and `limits.ts` hold the token, request, and rate-limit rules. All of them are pure or take the store, with tests. `session.ts` reads the session cookie or the bearer token for one request, and `actions.ts` holds the server actions for setup, sign-in, invites, the password reset, the account, and pairing. `src/cli/reset-password.ts` is the reset command in the container, built into `reset-password.mjs`. Read [decision 0023](decisions/0023-native-accounts.md). |
| `src/app/login/`, `setup/`, `account/` | The sign-in page, the first-run setup page, and the account page with the sessions, the password, and the script tokens. |
| `src/lib/viewer.ts` | The Settings key: the email of the signed-in account, or `owner`. Merges the TeslaMate settings table and the saved settings, both through `"use cache"` with tags, and gives `getPreferences()` and `getFormatter()` for each request. Server only. Read [decision 0005](decisions/0005-cache-components.md). |
| `src/lib/range-columns.ts` | Picks the rated or the ideal range column for a query, from the Range setting. Server only. |
| `src/app/cars/[carId]/settings/` | The Settings page and its two server actions, `savePreferences` and `resetPreferences`. Each action parses the input again on the server. |
| `src/lib/vehicle.ts`, `time-zone.ts` | Pure logic: place labels, efficiency, tab order, and the time zone check. No I/O, full test cover. |
| `src/app/layout.tsx` | Inter, the viewport, and the splash. |
| `src/app/loading.tsx` | The first-load T mark. The only route-level loading file. |
| `src/app/cars/[carId]/layout.tsx` | The header, the car switcher, the tabs, the phone tab bar, the live refresh, and `CanonicalCarPath`, which puts the slug in the address of an id link. |
| `src/app/cars/[carId]/page.tsx`, `drives/`, `charging/` | Overview, Drives, and Charging. Server components read through `src/lib/queries.ts`. Overview also shows the day strip for today. |
| `src/app/cars/[carId]/battery/`, `stats/`, `places/` | The three insight tabs. Each one reads the `period` search parameter: 7 days, 30 days, 90 days, 1 year, or all. |
| `src/app/cars/[carId]/timeline/` | One local day: the 24 h strip, the day totals, and the list of drives, charges, and parked times. Reads the `day` search parameter. |
| `src/app/cars/[carId]/charging/[chargeId]/` | The charge page: the power curve by battery level, battery and power, voltage and current, and the place. |
| `src/lib/charge-data.ts`, `timeline-data.ts`, `battery-data.ts`, `stats-data.ts`, `places-data.ts` | The read queries for the insight pages. The SQL follows the TeslaMate Grafana dashboards. Server only. |
| `src/lib/insights.ts` | Pure logic for the insight pages: local day windows, the timeline, battery capacity and health, level shares, idle drain, temperature bands, and the week grid. No I/O, full test cover. |
| `src/components/charts/` | `SeriesChart` and `ScatterPoints` on Recharts through the shadcn chart part, the axis formats, and `niceDomain`, which gives five even ticks. |
| `src/lib/demo/` | The demo data generator, the demo schema, the PGlite database for `DEMO_MODE`, and the Settings cookie. Read [decision 0006](decisions/0006-built-in-demo-database.md). |
| `src/lib/live/` | The optional MQTT feed. `topics.ts`, `view.ts`, and `config.ts` are pure, with tests. `subscriber.ts` holds one read-only MQTT.js connection for each server process. `live.ts` gives `getLive()` and `watchLive()`, with demo values in demo mode. Read [decision 0008](decisions/0008-mqtt-live-status.md). |
| `src/app/api/cars/[carId]/live/route.ts` | `GET` server-sent events: a change signal for the open Overview, with no car values. 204 without a feed. |
| `src/lib/site.ts`, `src/app/manifest.ts`, `robots.ts`, `sitemap.ts`, `opengraph-image.jpg` | The public address from `SITE_URL`, the link preview metadata, the JSON-LD data, the manifest, and the crawler rules. Read [Link previews and icons](demo-site.md#link-previews-and-icons). |
| `src/proxy.ts`, `src/lib/access.ts` | Checks the session of every request: no account goes to `/setup`, no session goes to `/login` or gets 401, and a cookie write from another site gets 403. It renews the session cookie. With `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`, it also checks the Cloudflare Access token first. Read [decision 0010](decisions/0010-verify-access-token.md). |
| `src/lib/analytics.ts` | The Open Analytics settings for demo mode, the event names, `eventProps()` for click attributes, and `trackEvent()`. Pure, with tests. Read [decision 0009](decisions/0009-demo-analytics.md). |
| `tools/layout/audit.ts` | The layout check: it opens every page in WebKit and Chrome at five widths and reports wrapped, cut, or overflowing values. Read [Quality](quality.md#layout-check). |
| `tools/brand/render.ts` | Builds the preview images and icons from the T mark with headless Chrome and `sips`. |
| `src/lib/charge-insights-data.ts`, `charge-insights.ts` | The charging insights: charge starts by weekday and hour, the AC and DC totals, and the DC curves (server), plus the curve rows and the cost ratios (pure, with tests). |
| `src/lib/charge-time-sql.ts`, `charge-time.ts` | The charging time: the median and the slow time that past charges spent at each battery percent (SQL, with PGlite tests), plus the legs and the sum for one leg (pure, with tests). Read [decision 0014](decisions/0014-charging-time.md). |
| `src/lib/frequent-routes-sql.ts` | The frequent routes: drives grouped by start and end place, where a place is a geofence or a grid cell of about 500 m. PGlite tests. Read [decision 0015](decisions/0015-frequent-routes.md). |
| `src/lib/tire-leak.ts`, `speed-bands.ts` | Pure logic: the slow-leak test, which compares each tire with the median of the other three so that temperature cancels out, and the consumption by speed band. Full test cover. |
| `src/lib/drive-sessions-sql.ts` | One SQL relation for the Drives list, a drive page, the drives CSV, and the trips: it fills a drive that TeslaMate left open from its positions. PGlite tests. Read [decision 0018](decisions/0018-drives-left-open.md). |
| `src/lib/trip-legs-sql.ts`, `trip-data.ts` | The trips: one SQL pass joins the drives of a car into trips, with the stop limits of teslamate-mcp (SQL, with PGlite tests), and the server module that loads the drives and the charges of those trips, also for the Drives tab. Read [decision 0017](decisions/0017-trips-from-drives.md) and [decision 0019](decisions/0019-drives-list-trips.md). |
| `src/lib/trip.ts` | Pure logic for the trip lists and pages: the date range with its default and its 366-day limit, the presets, the totals, the trips with their legs and stops, the pause and no-movement rules, the destination of a round trip, the link and the time bar of a trip, and the list. Full test cover. |
| `src/app/cars/[carId]/drives/trip/`, `trip/[tripId]/` | The Report page for a date range, and the page of one trip with its legs and stops. `tripId` is the id of the first drive, and the id of any drive of the trip opens the same page. |
| `src/lib/drive-series.ts`, `gpx.ts`, `csv.ts`, `trip-log.ts` | Pure logic for the drive charts (sampling, energy used and recovered), the GPX track, the CSV writer with its formula guard, and the export rows in the user's units and time zone. Full test cover. |
| `src/app/api/cars/[carId]/drives/[file]/route.ts`, `src/app/api/cars/[carId]/[file]/route.ts` | `GET` exports: one drive as GPX, and all drives or charges as CSV, with an optional date range. Behind the same login as the pages. |
| `src/lib/summary.ts`, `src/app/api/cars/[carId]/summary.json/route.ts` | The car summary for scripts: the snapshot and the live values in metric units, with the location only on request. The pure part has tests. Read [API](api.md). |
| `src/lib/charge-sessions-sql.ts`, `charge-sessions.ts`, `charge-cost.ts` | One SQL relation for every charge query: it fills a charge that TeslaMate left open, and it adds the cost from the price in Settings when TeslaMate has none. `charge-cost.ts` holds the price input rules and the cost breakdown. PGlite and pure tests. Read decisions [0011](decisions/0011-charging-cost-from-a-price.md) and [0012](decisions/0012-charges-left-open.md). |
| `src/lib/app/` | The app API: one pure builder for each screen (`overview.ts`, `drives.ts`, `charges.ts`, `battery.ts`, `stats.ts`, `places.ts`) that turns the query results and the formatter into the JSON of `contract.ts`, the chart builder with its ticks and labels, and the panel blocks of the insight pages: stats, charts, shares, tables, records, a heatmap, progress, notices, and notes. Full test cover. `request.ts` finds the car and the user's formatter for a route. `settings.ts` builds the app Settings and applies one change. `pairing.ts` builds the link of the QR code in Settings and the path of its modules. `src/lib/map-points.ts` builds the trip markers and the place dots for the web maps and the app. |
| `src/app/api/app/cars/[carId]/` | The app API routes. They read through the same `src/lib/` modules as the pages. Read [API](api.md#app-api). |
| `src/lib/push/events.ts`, `devices.ts` | Pure logic for push alerts: the event list, the rule that compares two live views, the device parser, and the Expo messages. Full test cover. Read [decision 0020](decisions/0020-mobile-app-and-push-alerts.md). |
| `src/lib/push/device-store.ts`, `alerts.ts`, `src/instrumentation.ts` | The push device file next to the Settings file, and the watcher that the server starts at boot when `MQTT_URL` is set. It sends each alert through the Expo push service. Server only. |
| `src/app/api/push/route.ts`, `src/app/api/cars.json/route.ts` | The push device endpoints and the car list for the mobile app. Read [API](api.md). |
| `src/lib/json-file.ts` | Reads a JSON file, and writes it through one queue, to a temporary file, then a rename. The Settings and the push devices use it. Server only. |
| `mobile/` | The Expo app for iOS and Android. It reads the JSON endpoints through the same proxy. Read [Mobile app](mobile.md). |
| `src/lib/assessment.ts`, `src/components/assessed.tsx` | The value colors: pure rules with tests that give a tone, a verdict, and the expected value, and the popover that shows them. Read [Value colors](value-colors.md) and [decision 0013](decisions/0013-value-colors.md). |
| `src/lib/sql-template.ts` | The postgres.js tag interface on top of PGlite: parameters, nested fragments, and identifiers. Pure, with tests. |
| `src/components/landing/`, `src/lib/github.ts`, `src/lib/project.ts` | The landing page of the demo site, the cached GitHub star count, and the project links. |
| `tools/demo/` | The seed tool for the PostgreSQL demo database. Read [decision 0003](decisions/0003-demo-database.md). |
| `src/lib/route.ts`, `maplibre-asset.ts` | Pure logic: route sampling and bounds, and the allowed MapLibre worker files. |
| `src/app/maplibre/[version]/[file]/route.ts` | Serves the MapLibre worker and its shared chunk from `node_modules`, with an immutable cache for the installed version only. |
| `src/app/cars/[carId]/drives/[driveId]/page.tsx` | The drive page with the route map. |
| `src/components/maps.tsx` | The location map, the route map, and the places map on mapcn. |
| `src/components/` | Client parts: splash, tab navigation, car switcher, pending state, animated numbers, and live refresh. `ui/` holds generated shadcn/ui files. |

## Data flow

TeslaMate writes car data into PostgreSQL. A request reaches this app, and `src/proxy.ts` checks its session. A server component or route handler calls a `src/lib/` module. The module runs a read-only query as `teslamate_ro` and returns typed rows. The page renders the rows on the server.

With `MQTT_URL` set, the server also reads the TeslaMate MQTT feed. It keeps the last values in memory, and a change sends a signal to the open Overview, which renders again on the server. Read [Live status](live-status.md).

With `MQTT_URL` set, the server also starts a push watcher at boot. It compares each live view of a car with the last one, and it sends an alert to the phones that chose that event, through the Expo push service. Read [Mobile app](mobile.md#push-alerts).

The settings change how the server renders, not what it reads. The root layout and each page call `getPreferences()`. The page formats every value with `getFormatter()` before it sends HTML or chart data to the browser. The Settings page saves a change through a server action, which writes the settings file and calls `updateTag()` for that user, so the next render reads the new file. The TeslaMate database stays read-only. Read [decision 0004](decisions/0004-saved-settings.md).

## Runtime and deployment

The `Dockerfile` builds a Next.js standalone server on `node:24-bookworm-slim`. It runs as an unprivileged user on port 3000, keeps the saved settings and `auth.sqlite` in `/data`, checks `/api/health`, and holds `reset-password.mjs` for a lost password. The container joins the Docker network of the TeslaMate database. A reverse proxy or a tunnel with HTTPS sits in front of it. [Installation](installation.md) gives the methods, and `.github/workflows/image.yml` publishes the image to GitHub Container Registry on each version tag.

## Decisions

Read [the foundation decision](decisions/0001-project-foundation.md), [the UI decision](decisions/0002-ui-stack-and-motion.md), [the demo database decision](decisions/0003-demo-database.md), [the saved settings decision](decisions/0004-saved-settings.md), [the cache decision](decisions/0005-cache-components.md), [the built-in demo decision](decisions/0006-built-in-demo-database.md), [the logo decision](decisions/0007-silver-logo.md), [the live status decision](decisions/0008-mqtt-live-status.md), [the demo analytics decision](decisions/0009-demo-analytics.md), [the Access token decision](decisions/0010-verify-access-token.md), [the charging time decision](decisions/0014-charging-time.md), [the frequent routes decision](decisions/0015-frequent-routes.md), [the car address decision](decisions/0016-car-names-in-urls.md), [the trips decision](decisions/0017-trips-from-drives.md), [the open drives decision](decisions/0018-drives-left-open.md), [the trip list decision](decisions/0019-drives-list-trips.md), [the mobile app decision](decisions/0020-mobile-app-and-push-alerts.md), [the QR code decision](decisions/0021-connect-the-app-with-a-qr-code.md), [the app maps decision](decisions/0022-maps-in-the-mobile-app.md), [the stack research](../research/stack.md), and [the UI stack research](../research/ui-stack.md).
Add a decision record when a choice changes a boundary or creates a lasting tradeoff.
Keep operational steps in [Installation](installation.md) and [Troubleshooting](troubleshooting.md).
