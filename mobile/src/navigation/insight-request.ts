import { useSyncExternalStore } from "react";
import type { InsightKind } from "@/api/queries";

type InsightRequest = { kind: InsightKind; count: number };

let current: InsightRequest = { kind: "battery", count: 0 };
const listeners = new Set<() => void>();

export function requestInsight(kind: InsightKind): void {
  current = { kind, count: current.count + 1 };
  listeners.forEach((listener) => listener());
}

export function useInsightRequest(): InsightRequest {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
