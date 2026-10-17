import type { PeriodId } from "@contract";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useIsFocused } from "expo-router";
import { useConnection } from "@/connection/connection-provider";
import { ApiError, request } from "./client";
import {
  carList,
  chargeDetail,
  chargeList,
  driveDetail,
  driveList,
  insightPage,
  overviewPage,
  pushCatalog,
  tripDetail,
} from "./responses";

const liveRefreshMs = 30_000;

export type InsightKind = "battery" | "stats" | "places";

type AppQuery<T> = {
  key: unknown[];
  path: string;
  read: (value: unknown) => T | null;
  enabled?: boolean;
  refetchInterval?: number;
  keepPrevious?: boolean;
};

function useAppQuery<T>(query: AppQuery<T>) {
  const connection = useConnection();
  const focused = useIsFocused();
  return useQuery({
    queryKey: [connection.url, ...query.key],
    queryFn: async () => {
      const value = query.read(await request(connection, query.path));
      if (value === null) {
        throw new ApiError("The server is not a My Tesla server.");
      }
      return value;
    },
    enabled: query.enabled ?? true,
    subscribed: focused,
    refetchInterval: query.refetchInterval,
    placeholderData: query.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useCars() {
  return useAppQuery({ key: ["cars"], path: "/api/cars.json", read: carList });
}

export function usePushCatalog() {
  return useAppQuery({ key: ["push"], path: "/api/push", read: pushCatalog });
}

export function useOverview(carId: number) {
  return useAppQuery({
    key: ["overview", carId],
    path: `/api/app/cars/${carId}/overview`,
    read: overviewPage,
    refetchInterval: liveRefreshMs,
  });
}

export function useDrives(carId: number) {
  return useAppQuery({
    key: ["drives", carId],
    path: `/api/app/cars/${carId}/drives`,
    read: driveList,
  });
}

export function useDrive(carId: number, driveId: string) {
  return useAppQuery({
    key: ["drive", carId, driveId],
    path: `/api/app/cars/${carId}/drives/${driveId}`,
    read: driveDetail,
  });
}

export function useTrip(carId: number, tripId: string) {
  return useAppQuery({
    key: ["trip", carId, tripId],
    path: `/api/app/cars/${carId}/trips/${tripId}`,
    read: tripDetail,
  });
}

export function useCharges(carId: number) {
  return useAppQuery({
    key: ["charges", carId],
    path: `/api/app/cars/${carId}/charges`,
    read: chargeList,
  });
}

export function useCharge(carId: number, chargeId: string) {
  return useAppQuery({
    key: ["charge", carId, chargeId],
    path: `/api/app/cars/${carId}/charges/${chargeId}`,
    read: chargeDetail,
    refetchInterval: liveRefreshMs,
  });
}

export function useInsight(carId: number, kind: InsightKind, period: PeriodId) {
  return useAppQuery({
    key: ["insight", carId, kind, period],
    path: `/api/app/cars/${carId}/${kind}?period=${period}`,
    read: insightPage,
    keepPrevious: true,
  });
}
