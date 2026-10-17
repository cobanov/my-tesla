import "server-only";
import { isDemoMode } from "../demo/mode";
import { readMqttConfig } from "../live/config";
import { mqttValues, watchFeed } from "../live/subscriber";
import { liveView } from "../live/view";
import { authStore } from "../auth/session";
import { readDevices, removeDevices } from "./device-store";
import {
  alertMessages,
  deadTokens,
  type PushMessage,
  type PushTicket,
} from "./devices";
import { watchStep, type CarAlert, type CarWatch } from "./events";

const expoPushUrl = "https://exp.host/--/api/v2/push/send";
const batchSize = 100;
const tickMs = 60_000;
const alertsKey = Symbol.for("my-tesla.push-alerts");

type AlertsStore = typeof globalThis & { [alertsKey]?: boolean };

export function pushEnabled(): boolean {
  return !isDemoMode() && readMqttConfig(process.env) !== null;
}

async function sendPush(messages: PushMessage[]): Promise<PushTicket[]> {
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  const tickets: PushTicket[] = [];
  for (let start = 0; start < messages.length; start += batchSize) {
    const response = await fetch(expoPushUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(messages.slice(start, start + batchSize)),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`the Expo push service answered ${response.status}`);
    }
    const { data } = (await response.json()) as { data?: PushTicket[] };
    tickets.push(...(data ?? []));
  }
  return tickets;
}

export async function deliver(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;
  const dead = deadTokens(messages, await sendPush(messages));
  if (dead.length) await removeDevices(dead);
}

function logError(error: unknown): void {
  console.error(
    `Push: ${error instanceof Error ? error.message : String(error)}`,
  );
}

async function sendAlerts(carId: number, alerts: CarAlert[]): Promise<void> {
  try {
    const now = Date.now();
    const signedIn = (await readDevices()).filter(
      (device) =>
        device.sessionId !== null &&
        authStore().sessionActive(device.sessionId, now),
    );
    await deliver(alertMessages(signedIn, carId, alerts));
  } catch (error) {
    logError(error);
  }
}

function canStart(): boolean {
  try {
    return pushEnabled();
  } catch (error) {
    logError(error);
    return false;
  }
}

export function startPushAlerts(): void {
  const store = globalThis as AlertsStore;
  if (store[alertsKey] || !canStart()) return;
  store[alertsKey] = true;
  const watches = new Map<number, CarWatch>();
  const check = async (carId: number) => {
    const feed = await mqttValues(carId);
    if (!feed) return;
    const now = Date.now();
    const car = feed.values.display_name?.trim() || `Car ${carId}`;
    const { watch, alerts } = watchStep(
      car,
      watches.get(carId) ?? null,
      liveView(feed.values, feed.stamps, now),
      now,
    );
    watches.set(carId, watch);
    if (alerts.length) await sendAlerts(carId, alerts);
  };
  const run = (carId: number) => void check(carId).catch(logError);
  watchFeed(run);
  setInterval(() => watches.forEach((_, carId) => run(carId)), tickMs).unref();
}
