import Constants from "expo-constants";
import * as Device from "expo-device";
import {
  AndroidImportance,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
} from "expo-notifications";
import { Platform } from "react-native";
import type { PushEvent } from "@contract";
import { palettes } from "@/theme/palette";

export class PushSetupError extends Error {
  name = "PushSetupError";
}

export async function createChannels(
  events: readonly PushEvent[],
): Promise<void> {
  if (Platform.OS !== "android") return;
  await Promise.all(
    events.map((event) =>
      setNotificationChannelAsync(event.id, {
        name: event.title,
        description: event.description,
        importance: AndroidImportance.HIGH,
        lightColor: palettes.light.primary,
      }),
    ),
  );
}

export async function pushToken(ask: boolean): Promise<string | null> {
  if (!Device.isDevice) {
    throw new PushSetupError("Push alerts need a real phone, not a simulator.");
  }
  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new PushSetupError("Set EAS_PROJECT_ID and build the app again.");
  }
  const current = await getPermissionsAsync();
  const granted =
    current.granted || (ask && (await requestPermissionsAsync()).granted);
  if (!granted) return null;
  return (await getExpoPushTokenAsync({ projectId })).data;
}
