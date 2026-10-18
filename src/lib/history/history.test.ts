import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { historyChanges, historyText } from "./changes";
import { HistoryStore } from "./store";

const t0 = Date.UTC(2026, 9, 18, 12);
let store: HistoryStore;

beforeEach(() => {
  store = new HistoryStore(":memory:");
});

afterEach(() => store.close());

describe("historyChanges", () => {
  test("takes the first values as the baseline without an event", () => {
    const first = historyChanges(
      { locked: null, sentry: null },
      { locked: true, sentryMode: false },
      t0,
    );
    expect(first.events).toEqual([]);
    expect(first.last).toEqual({ locked: true, sentry: false });
  });

  test("records each change once, and keeps a value the feed does not send", () => {
    const next = historyChanges(
      { locked: true, sentry: false },
      { locked: false, sentryMode: null },
      t0,
    );
    expect(next.events).toEqual([{ kind: "locked", value: false, at: t0 }]);
    expect(next.last).toEqual({ locked: false, sentry: false });
    expect(
      historyChanges(next.last, { locked: false, sentryMode: true }, t0 + 1)
        .events,
    ).toEqual([{ kind: "sentry", value: true, at: t0 + 1 }]);
    expect(
      historyChanges(next.last, { locked: false, sentryMode: false }, t0 + 2)
        .events,
    ).toEqual([]);
  });

  test("names each event", () => {
    expect(historyText({ kind: "locked", value: false, at: t0 })).toBe(
      "Unlocked",
    );
    expect(historyText({ kind: "sentry", value: true, at: t0 })).toBe(
      "Sentry Mode on",
    );
  });
});

describe("HistoryStore", () => {
  test("keeps the events of each car, newest first, and the last values", () => {
    store.record(2, [
      { kind: "locked", value: false, at: t0 },
      { kind: "sentry", value: true, at: t0 + 1000 },
      { kind: "locked", value: true, at: t0 + 2000 },
    ]);
    store.record(3, [{ kind: "locked", value: false, at: t0 + 3000 }]);
    expect(store.last(2)).toEqual({ locked: true, sentry: true });
    expect(store.last(4)).toEqual({ locked: null, sentry: null });
    expect(store.recent(2, t0, 10).map((event) => event.at)).toEqual([
      t0 + 2000,
      t0 + 1000,
      t0,
    ]);
    expect(store.recent(2, t0 + 1000, 1)).toEqual([
      { kind: "locked", value: true, at: t0 + 2000 },
    ]);
  });

  test("forgets events before the cut", () => {
    store.record(2, [
      { kind: "locked", value: false, at: t0 },
      { kind: "locked", value: true, at: t0 + 5000 },
    ]);
    store.prune(t0 + 1);
    expect(store.recent(2, 0, 10)).toEqual([
      { kind: "locked", value: true, at: t0 + 5000 },
    ]);
  });
});
