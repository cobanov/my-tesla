import { assessBatteryLevel, assessTirePressure } from "../assessment";
import type { Formatter } from "../format";
import { buildTimeline } from "../insights";
import type { LiveFeed } from "../live/live";
import { liveNotices, liveTiles } from "../live/tiles";
import type { Preferences } from "../preferences";
import type { Car, CarSnapshot, Charge, Drive } from "../queries";
import type { DayRecords } from "../timeline-data";
import { leakWarning, type SlowLeak } from "../tire-leak";
import {
  activityLabel,
  batteryCaption,
  batteryTone,
  carActivity,
  liveActivity,
  ongoingText,
  variantLine,
} from "../vehicle";
import type { AppValue, OverviewPage, RecentRecord } from "./contract";
import { appStat, appValue } from "./values";

export type OverviewInput = {
  car: Car;
  image: string | null;
  snapshot: CarSnapshot;
  lastDrive: Drive | null;
  lastCharge: Charge | null;
  today: (DayRecords & { start: Date; end: Date }) | null;
  live: LiveFeed | null;
  leaks: SlowLeak[];
  show: Preferences["overview"];
  showMaps: boolean;
};

function dayStrip(
  today: NonNullable<OverviewInput["today"]>,
  f: Formatter,
  now: Date,
): OverviewPage["today"] {
  const start = today.start.getTime();
  const total = today.end.getTime() - start;
  const share = (date: Date) => (date.getTime() - start) / total;
  return {
    segments: buildTimeline({ ...today, now }).map((segment) => ({
      kind: segment.kind,
      start: share(segment.start),
      end: share(segment.end),
    })),
    now: Math.min(1, Math.max(0, share(now))),
    hours: [0, 6, 12, 18, 24].map((hour) => f.hour(hour)),
  };
}

function lastDriveRecord(drive: Drive, f: Formatter, now: Date): RecentRecord {
  return {
    title: `${drive.from} → ${drive.to}`,
    detail: `${f.distance(drive.distanceKm)} · ${f.duration(drive.durationMin)} · ${f.day(drive.startAt, now)} ${f.clock(drive.startAt)}`,
    target: { kind: "drive", id: drive.id },
  };
}

function lastChargeRecord(
  charge: Charge,
  f: Formatter,
  now: Date,
): RecentRecord {
  const done = charge.endAt
    ? `+${f.energy(charge.energyAddedKwh)} · ${charge.startLevel ?? "—"}% → ${charge.endLevel ?? "—"}%`
    : `${ongoingText} since ${f.clock(charge.startAt)}`;
  return {
    title: charge.place,
    detail: `${done} · ${f.day(charge.startAt, now)}`,
    target: { kind: "charge", id: charge.id },
  };
}

function tireValue(bar: number, f: Formatter): AppValue {
  return appValue(f.pressure(bar), assessTirePressure(bar, f));
}

export function overviewPage(
  input: OverviewInput,
  f: Formatter,
  now: Date,
): OverviewPage {
  const { car, snapshot, live, show } = input;
  const liveNow = live?.connected ? live.view : null;
  const chargingNow =
    liveNow?.charging.state === "Charging" ? liveNow.charging : null;
  const activity = activityLabel(
    liveActivity(liveNow?.state ?? null) ?? carActivity(snapshot),
  );
  const lastSeen = snapshot.positionAt ?? snapshot.stateSince;
  const charging = snapshot.charging || chargingNow !== null;
  const hasData =
    snapshot.batteryLevel !== null || snapshot.positionAt !== null;
  const range = f.distanceValue(snapshot.rangeKm);
  const tires = liveNow?.tires ?? snapshot.tires;
  const hasPosition = snapshot.latitude !== null && snapshot.longitude !== null;
  return {
    car: {
      id: car.id,
      name: car.name,
      variant: variantLine(car),
      image: show.render ? input.image : null,
    },
    activity: {
      label: activity.label,
      tone: activity.tone,
      updated: `Updated ${f.relative(lastSeen, now).toLowerCase()}`,
    },
    empty: hasData
      ? null
      : `TeslaMate fills this page after ${car.name} wakes up and sends its first position.`,
    battery: hasData
      ? {
          level: snapshot.batteryLevel,
          usable: snapshot.usableBatteryLevel,
          value: appValue(
            snapshot.batteryLevel === null ? "—" : `${snapshot.batteryLevel}%`,
            assessBatteryLevel(snapshot.batteryLevel, charging),
          ),
          range:
            range === null
              ? "—"
              : `${f.number(Math.round(range))} ${f.units.distance}`,
          caption: batteryCaption({
            level: snapshot.batteryLevel,
            usableLevel: snapshot.usableBatteryLevel,
            charging,
            limitPercent: chargingNow?.limitPercent,
          }),
          tone: batteryTone(snapshot.batteryLevel, charging),
          fullAt: chargingNow?.fullAt?.toISOString() ?? null,
        }
      : null,
    stats: hasData
      ? [
          appStat(
            "Odometer",
            f.distanceValue(snapshot.odometerKm) === null
              ? "—"
              : `${f.number(Math.round(f.distanceValue(snapshot.odometerKm) ?? 0))} ${f.units.distance}`,
          ),
          appStat("Outside", f.temperature(snapshot.outsideTemp), {
            detail:
              snapshot.climateOn === null
                ? null
                : snapshot.climateOn
                  ? "Climate on"
                  : "Climate off",
          }),
          appStat("Cabin", f.temperature(snapshot.insideTemp)),
          appStat("Software", snapshot.softwareVersion ?? "—"),
        ]
      : [],
    live:
      hasData && show.live && live
        ? {
            connected: live.connected,
            tiles: live.hasValues
              ? liveTiles(live.view, f).map((tile) => ({
                  ...tile,
                  fullAt: tile.fullAt?.toISOString() ?? null,
                }))
              : [],
            notices: liveNotices(live),
            empty: live.hasValues
              ? null
              : `No live values yet. TeslaMate sends them when ${car.name} is online.`,
          }
        : null,
    today:
      hasData && show.today && input.today
        ? dayStrip(input.today, f, now)
        : null,
    tires:
      hasData && show.tires && tires
        ? {
            frontLeft: tireValue(tires.frontLeft, f),
            frontRight: tireValue(tires.frontRight, f),
            rearLeft: tireValue(tires.rearLeft, f),
            rearRight: tireValue(tires.rearRight, f),
            warnings: input.leaks.map((leak) =>
              leakWarning(leak, (bar) => f.pressure(bar)),
            ),
          }
        : null,
    location:
      hasData && show.location && input.showMaps && hasPosition
        ? {
            latitude: snapshot.latitude ?? 0,
            longitude: snapshot.longitude ?? 0,
            lastSeen: lastSeen
              ? `Last seen ${f.dayInline(lastSeen, now)} at ${f.clock(lastSeen)}`
              : "Never seen",
          }
        : null,
    lastDrive:
      hasData && show.recent && input.lastDrive
        ? lastDriveRecord(input.lastDrive, f, now)
        : null,
    lastCharge:
      hasData && show.recent && input.lastCharge
        ? lastChargeRecord(input.lastCharge, f, now)
        : null,
  };
}
