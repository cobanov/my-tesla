import {
  eventTitle,
  isCarEventId,
  type CarAlert,
  type CarEventId,
} from "./events";

export type PushDevice = {
  token: string;
  events: CarEventId[];
  updatedAt: string;
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { event: CarEventId | "test"; carId: number | null; url: string };
  sound: "default";
  priority: "high";
  channelId?: CarEventId;
};

export type PushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

const pushTokenPattern = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;

export function isPushToken(value: unknown): value is string {
  return typeof value === "string" && pushTokenPattern.test(value);
}

export function parseDevice(input: unknown, now: Date): PushDevice | null {
  if (!input || typeof input !== "object") return null;
  const { token, events } = input as Record<string, unknown>;
  if (!isPushToken(token) || !Array.isArray(events)) return null;
  if (!events.every(isCarEventId)) return null;
  return { token, events: [...new Set(events)], updatedAt: now.toISOString() };
}

export function parseDevices(input: unknown): PushDevice[] {
  if (!input || typeof input !== "object" || !("devices" in input)) return [];
  const { devices } = input;
  if (!Array.isArray(devices)) return [];
  return devices.flatMap((entry: unknown) => {
    const updatedAt = (entry as { updatedAt?: unknown } | null)?.updatedAt;
    const device = parseDevice(entry, new Date(0));
    if (!device) return [];
    return typeof updatedAt === "string"
      ? [{ ...device, updatedAt }]
      : [device];
  });
}

export function withDevice(
  devices: PushDevice[],
  device: PushDevice,
): PushDevice[] {
  const others = devices.filter((entry) => entry.token !== device.token);
  return device.events.length ? [...others, device] : others;
}

export function alertUrl(event: CarEventId): string {
  return event.startsWith("charging-") ? "/charging" : "/";
}

export function alertMessages(
  devices: PushDevice[],
  carId: number,
  alerts: CarAlert[],
): PushMessage[] {
  return alerts.flatMap((alert) =>
    devices
      .filter((device) => device.events.includes(alert.event))
      .map((device) => ({
        to: device.token,
        title: eventTitle(alert.event),
        body: alert.body,
        data: { event: alert.event, carId, url: alertUrl(alert.event) },
        sound: "default" as const,
        priority: "high" as const,
        channelId: alert.event,
      })),
  );
}

export function testMessage(token: string): PushMessage {
  return {
    to: token,
    title: "My Tesla",
    body: "Alerts reach this phone.",
    data: { event: "test", carId: null, url: "/" },
    sound: "default",
    priority: "high",
  };
}

export function deadTokens(
  messages: PushMessage[],
  tickets: PushTicket[],
): string[] {
  return messages.flatMap((message, index) => {
    const ticket = tickets[index];
    return ticket?.status === "error" &&
      ticket.details?.error === "DeviceNotRegistered"
      ? [message.to]
      : [];
  });
}
