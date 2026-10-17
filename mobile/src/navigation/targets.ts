import type { AppTarget } from "@contract";
import type { Href } from "expo-router";

export type TabStack = "drives" | "charging" | "insights";

export function targetHref(target: AppTarget, stack: TabStack): Href {
  switch (target.kind) {
    case "drive":
      return stack === "insights"
        ? {
            pathname: "/insights/drives/[driveId]",
            params: { driveId: String(target.id) },
          }
        : {
            pathname: "/drives/[driveId]",
            params: { driveId: String(target.id) },
          };
    case "trip":
      return {
        pathname: "/drives/trips/[tripId]",
        params: { tripId: String(target.id) },
      };
    case "charge":
      return stack === "drives"
        ? {
            pathname: "/drives/charges/[chargeId]",
            params: { chargeId: String(target.id) },
          }
        : {
            pathname: "/charging/[chargeId]",
            params: { chargeId: String(target.id) },
          };
  }
}
