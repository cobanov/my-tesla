# 0024: A history of locks and Sentry Mode

Date: 2026-10-18

Status: Accepted.

## Context

TeslaMate publishes the lock state and Sentry Mode of each car on its MQTT feed, but it saves neither in its database. My Tesla reads the feed for Live status and push alerts ([decision 0020](0020-mobile-app-and-push-alerts.md)) and keeps the values in memory only, so nobody can see when the car was unlocked or when Sentry Mode was on. The TeslaMate database stays read-only.

## Decision

1. My Tesla keeps its own SQLite file, `history.sqlite`, next to the Settings file, through `node:sqlite`, with the same open, migration, and transaction code as `auth.sqlite` (`src/lib/sqlite.ts`). It is a separate file because it holds car events, not accounts, and it can be deleted on its own.
2. The file has one table, `car_events`: the car, the kind (`locked` or `sentry`), the new value, and the time. The recorder in `src/lib/history/recorder.ts` listens to the feed and saves only a change. The first value after an empty file is the baseline and makes no event, and after a restart the last saved value is the baseline, so a restart adds no false event.
3. The time is when My Tesla saw the change. A change while the server was down shows with the time of the next start.
4. Events older than 366 days are deleted, at most once an hour.
5. The Overview shows the changes of the last 7 days under Live status. The panel exists only with the MQTT feed and outside demo mode.
6. The push channel of the task stays the Expo push service of decision 0020. No second channel such as ntfy is added.

## Alternatives

1. Save every MQTT value. The feed sends many values each second while driving, and most of them are already in TeslaMate.
2. Keep the history in memory. It would vanish at each restart.
3. Put the table in `auth.sqlite`. That file holds secrets and has its own backup rules.

## Consequences

The data volume holds one more file. Like the Settings, it holds no secret, but it shows when the car was unlocked, so it belongs on the same private volume.
