import type { Formatter } from "./format";
import type { Charge, Drive } from "./queries";

export type CalendarEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string | null;
  url: string | null;
};

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export const calendarScopes = [
  { id: "all", label: "Drives and charges" },
  { id: "drives", label: "Drives only" },
  { id: "charges", label: "Charges only" },
] as const;

export type CalendarScope = (typeof calendarScopes)[number]["id"];

export function calendarScope(value: unknown): CalendarScope {
  const found = calendarScopes.find((scope) => scope.id === value);
  return found ? found.id : "all";
}

export function calendarName(car: string, scope: CalendarScope): string {
  return scope === "all" ? car : `${car} ${scope}`;
}

export function icsStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "");
}

function utf8Length(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  return code < 0x10000 ? 3 : 4;
}

export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = "";
  let size = 0;
  let limit = 75;
  for (const char of line) {
    const length = utf8Length(char);
    if (size + length > limit) {
      parts.push(current);
      current = "";
      size = 0;
      limit = 74;
    }
    current += char;
    size += length;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function calendarFeed(
  name: string,
  events: CalendarEvent[],
  now: Date,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//My Tesla//Drives and charges//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${icsStamp(now)}`,
      `DTSTART:${icsStamp(event.start)}`,
      `DTEND:${icsStamp(event.end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      ...(event.url ? [`URL:${event.url}`] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function driveEvent(
  drive: Drive,
  carId: number,
  f: Formatter,
  url: string | null,
): CalendarEvent {
  return {
    uid: `drive-${carId}-${drive.id}@my-tesla`,
    start: drive.startAt,
    end: drive.endAt,
    summary: `${drive.from} → ${drive.to}`,
    description: [
      drive.distanceKm === null ? null : f.distance(drive.distanceKm),
      drive.durationMin === null ? null : f.duration(drive.durationMin),
      drive.efficiencyWhPerKm === null
        ? null
        : f.efficiency(drive.efficiencyWhPerKm),
    ]
      .filter(Boolean)
      .join(" · "),
    location: drive.to,
    url,
  };
}

export function chargeEvent(
  charge: Charge & { endAt: Date },
  carId: number,
  f: Formatter,
  url: string | null,
): CalendarEvent {
  return {
    uid: `charge-${carId}-${charge.id}@my-tesla`,
    start: charge.startAt,
    end: charge.endAt,
    summary: `Charge at ${charge.place}`,
    description: [
      charge.energyAddedKwh === null
        ? null
        : `+${f.energy(charge.energyAddedKwh)}`,
      charge.startLevel === null || charge.endLevel === null
        ? null
        : `${charge.startLevel}% → ${charge.endLevel}%`,
      charge.cost === null ? null : f.cost(charge.cost),
    ]
      .filter(Boolean)
      .join(" · "),
    location: charge.place,
    url,
  };
}
