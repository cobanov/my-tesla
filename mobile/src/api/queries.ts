import type { PeriodId, SettingItem, SettingsPage } from "@contract";
import {
  keepPreviousData,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useIsFocused } from "expo-router";
import { Storage } from "expo-sqlite/kv-store";
import { useConnection } from "@/connection/connection-provider";
import type { Connection } from "@/connection/server";
import { ApiError, request } from "./client";
import {
  carList,
  chargeDetail,
  chargeList,
  driveDetail,
  driveList,
  insightPage,
  overviewPage,
  appMe,
  pushCatalog,
  reportPage,
  settingsPage,
  timelinePage,
  tripDetail,
  yearPage,
} from "./responses";

const liveRefreshMs = 30_000;

export type InsightKind = "battery" | "stats" | "places" | "charging";

type AppQuery<T> = {
  key: unknown[];
  path: string;
  read: (value: unknown) => T | null;
  enabled?: boolean;
  refetchInterval?: number;
  keepPrevious?: boolean;
  stored?: string;
};

const storedAnswers = ["cars", "settings"] as const;

function storageKey(
  connection: Connection,
  name: (typeof storedAnswers)[number],
): string {
  return `${name}:${connection.url}`;
}

export function forgetStored(connection: Connection): void {
  for (const name of storedAnswers) {
    Storage.removeItemSync(storageKey(connection, name));
  }
}

function readStored<T>(
  key: string,
  read: (value: unknown) => T | null,
): T | undefined {
  try {
    const stored = Storage.getItemSync(key);
    return (stored ? read(JSON.parse(stored)) : null) ?? undefined;
  } catch {
    return undefined;
  }
}

function useAppQuery<T>(query: AppQuery<T>) {
  const connection = useConnection();
  const focused = useIsFocused();
  const stored = query.stored;
  return useQuery({
    queryKey: [connection.url, ...query.key],
    queryFn: async () => {
      const value = query.read(await request(connection, query.path));
      if (value === null) {
        throw new ApiError("The server is not a My Tesla server.");
      }
      if (stored) Storage.setItemSync(stored, JSON.stringify(value));
      return value;
    },
    initialData: stored ? () => readStored(stored, query.read) : undefined,
    initialDataUpdatedAt: 0,
    enabled: query.enabled ?? true,
    subscribed: focused,
    refetchInterval: query.refetchInterval,
    placeholderData: query.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useCars() {
  const connection = useConnection();
  return useAppQuery({
    key: ["cars"],
    path: "/api/cars.json",
    read: carList,
    stored: storageKey(connection, "cars"),
  });
}

export function useMe() {
  const connection = useConnection();
  return useAppQuery({
    key: ["me"],
    path: "/api/app/me",
    read: appMe,
    enabled: connection.token !== null,
  });
}

export async function signOutPhone(connection: Connection): Promise<void> {
  if (!connection.token) return;
  await request(connection, "/api/app/me", { method: "DELETE" }).catch(
    () => null,
  );
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

export function useTimeline(carId: number, day: string | null) {
  return useAppQuery({
    key: ["timeline", carId, day],
    path: `/api/app/cars/${carId}/timeline${day ? `?day=${day}` : ""}`,
    read: timelinePage,
    keepPrevious: true,
  });
}

export function useReport(
  carId: number,
  range: { from: string; to: string } | null,
) {
  return useAppQuery({
    key: ["report", carId, range?.from, range?.to],
    path: `/api/app/cars/${carId}/report${range ? `?from=${range.from}&to=${range.to}` : ""}`,
    read: reportPage,
    keepPrevious: true,
  });
}

export function useYear(carId: number, year: number | null) {
  return useAppQuery({
    key: ["year", carId, year],
    path: `/api/app/cars/${carId}/year${year === null ? "" : `?year=${year}`}`,
    read: yearPage,
    keepPrevious: true,
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

export function useInsight(
  carId: number,
  kind: InsightKind,
  period: PeriodId | null,
) {
  return useAppQuery({
    key: ["insight", carId, kind, period],
    path: `/api/app/cars/${carId}/${kind}${period ? `?period=${period}` : ""}`,
    read: insightPage,
    keepPrevious: true,
  });
}

const settingsMutation = ["settings"];

export function useSettings() {
  const connection = useConnection();
  return useAppQuery({
    key: ["settings"],
    path: "/api/app/settings",
    read: settingsPage,
    stored: storageKey(connection, "settings"),
  });
}

export type SettingChange = { key: string; value: string | boolean };

function withValue(item: SettingItem, change: SettingChange): SettingItem {
  if (item.key !== change.key) return item;
  if (item.kind === "choice" && typeof change.value === "string") {
    return { ...item, value: change.value };
  }
  if (item.kind === "switch" && typeof change.value === "boolean") {
    return { ...item, value: change.value };
  }
  return item;
}

export function useSettingsBusy(): boolean {
  return useIsMutating({ mutationKey: settingsMutation }) > 0;
}

export function useSettingChange() {
  const connection = useConnection();
  const queryClient = useQueryClient();
  const key = [connection.url, "settings"];
  return useMutation({
    mutationKey: settingsMutation,
    mutationFn: async (change: SettingChange) => {
      const page = settingsPage(
        await request(connection, "/api/app/settings", {
          method: "PUT",
          body: change,
        }),
      );
      if (!page) throw new ApiError("The server is not a My Tesla server.");
      return page;
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SettingsPage>(key);
      if (previous) {
        queryClient.setQueryData<SettingsPage>(key, {
          ...previous,
          groups: previous.groups.map((group) => ({
            ...group,
            items: group.items.map((item) => withValue(item, change)),
          })),
        });
      }
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (page) => {
      queryClient.setQueryData(key, page);
      Storage.setItemSync(
        storageKey(connection, "settings"),
        JSON.stringify(page),
      );
      return queryClient.invalidateQueries({
        queryKey: [connection.url],
        predicate: (query) => query.queryKey[1] !== "settings",
      });
    },
  });
}
