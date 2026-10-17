import type { LiveView } from "../live/view";

export const carEvents = [
  {
    id: "charging-started",
    title: "Charging started",
    description: "The car starts to charge.",
  },
  {
    id: "charging-complete",
    title: "Charging complete",
    description: "The charge reaches the limit.",
  },
  {
    id: "charging-stopped",
    title: "Charging stopped",
    description: "A charge stops before the limit.",
  },
  {
    id: "left-unlocked",
    title: "Left unlocked",
    description: "The parked car stays unlocked for 10 minutes.",
  },
  {
    id: "update-available",
    title: "Software update",
    description: "A software update is ready to install.",
  },
  {
    id: "tire-warning",
    title: "Tire pressure",
    description: "The car warns about the pressure of a tire.",
  },
] as const;

export type CarEventId = (typeof carEvents)[number]["id"];

export type CarAlert = { event: CarEventId; body: string };

export type CarWatch = {
  view: LiveView;
  firstSeen: number;
  unlockedSince: number | null;
  unlockedSent: boolean;
};

export const settleMs = 5_000;
export const unlockedAlertMs = 10 * 60_000;

const carEventIds = new Set<string>(carEvents.map((event) => event.id));

export function isCarEventId(value: unknown): value is CarEventId {
  return typeof value === "string" && carEventIds.has(value);
}

export function eventTitle(event: CarEventId): string {
  return carEvents.find((entry) => entry.id === event)?.title ?? event;
}

function parkedUnlocked(view: LiveView): boolean {
  return (
    view.locked === false && view.userPresent !== true && view.driving === null
  );
}

function limitText(view: LiveView): string {
  const limit = view.charging.limitPercent;
  return limit === null ? "the limit" : `${Math.round(limit)}%`;
}

function changes(car: string, before: LiveView, after: LiveView): CarAlert[] {
  const alerts: CarAlert[] = [];
  const was = before.charging.state;
  const now = after.charging.state;
  if (was !== null && was !== "Charging" && now === "Charging") {
    alerts.push({
      event: "charging-started",
      body: `${car} charges to ${limitText(after)}.`,
    });
  }
  if (was === "Charging" && now === "Complete") {
    alerts.push({
      event: "charging-complete",
      body: `${car} reached ${limitText(after)}.`,
    });
  }
  if (
    was === "Charging" &&
    now !== null &&
    now !== "Charging" &&
    now !== "Complete"
  ) {
    alerts.push({
      event: "charging-stopped",
      body: `${car} stopped charging before ${limitText(after)}.`,
    });
  }
  if (
    before.software.updateAvailable === false &&
    after.software.updateAvailable === true
  ) {
    const version = after.software.updateVersion;
    alerts.push({
      event: "update-available",
      body: version
        ? `${car} can install ${version}.`
        : `${car} can install a software update.`,
    });
  }
  for (const tire of after.tireWarnings) {
    if (!before.tireWarnings.includes(tire)) {
      alerts.push({
        event: "tire-warning",
        body: `${car} warns about the ${tire} tire.`,
      });
    }
  }
  return alerts;
}

export function watchStep(
  car: string,
  watch: CarWatch | null,
  view: LiveView,
  now: number,
): { watch: CarWatch; alerts: CarAlert[] } {
  const unlocked = parkedUnlocked(view);
  if (!watch) {
    return {
      watch: {
        view,
        firstSeen: now,
        unlockedSince: unlocked ? now : null,
        unlockedSent: false,
      },
      alerts: [],
    };
  }
  const settled = now - watch.firstSeen >= settleMs;
  const alerts = settled ? changes(car, watch.view, view) : [];
  const unlockedSince = unlocked ? (watch.unlockedSince ?? now) : null;
  let unlockedSent = unlocked && watch.unlockedSent;
  if (
    settled &&
    unlockedSince !== null &&
    !unlockedSent &&
    now - unlockedSince >= unlockedAlertMs
  ) {
    unlockedSent = true;
    alerts.push({
      event: "left-unlocked",
      body: `${car} has been unlocked for ${Math.round((now - unlockedSince) / 60_000)} minutes.`,
    });
  }
  return {
    watch: { view, firstSeen: watch.firstSeen, unlockedSince, unlockedSent },
    alerts,
  };
}
