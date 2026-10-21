import "server-only";
import { dataFile } from "../data-file";
import { isDemoMode } from "../demo/mode";
import { readMqttConfig } from "../live/config";
import { mqttValues, watchFeed } from "../live/subscriber";
import { liveView } from "../live/view";
import { openPrivately, processWide } from "../sqlite";
import { historyChanges } from "./changes";
import { HistoryStore, type HistoryEvent, type LastValues } from "./store";

const keepMs = 366 * 24 * 60 * 60 * 1000;
const pruneEveryMs = 60 * 60 * 1000;
const shownMs = 7 * 24 * 60 * 60 * 1000;
const shownEvents = 50;

function historyEnabled(): boolean {
  return !isDemoMode() && readMqttConfig(process.env) !== null;
}

function historyStore(): HistoryStore {
  return processWide("history-store", () =>
    openPrivately(
      dataFile(process.env, "history.sqlite"),
      (path) => new HistoryStore(path),
    ),
  );
}

function logError(error: unknown): void {
  console.error(
    `History: ${error instanceof Error ? error.message : String(error)}`,
  );
}

export function startHistory(): void {
  let enabled = false;
  try {
    enabled = historyEnabled();
  } catch (error) {
    logError(error);
  }
  if (!enabled) return;
  processWide("history-recorder", () => {
    const lasts = new Map<number, LastValues>();
    let prunedAt = 0;
    const record = async (carId: number) => {
      const feed = await mqttValues(carId);
      if (!feed) return;
      const now = Date.now();
      const store = historyStore();
      const { events, last } = historyChanges(
        lasts.get(carId) ?? store.last(carId),
        liveView(feed.values, feed.stamps, now),
        now,
      );
      lasts.set(carId, last);
      store.record(carId, events);
      if (now - prunedAt >= pruneEveryMs) {
        store.prune(now - keepMs);
        prunedAt = now;
      }
    };
    watchFeed((carId) => void record(carId).catch(logError));
    return true;
  });
}

export function lockHistory(carId: number, now: number): HistoryEvent[] | null {
  if (!historyEnabled()) return null;
  try {
    return historyStore().recent(carId, now - shownMs, shownEvents);
  } catch (error) {
    logError(error);
    return null;
  }
}
