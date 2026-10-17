import { Stack } from "expo-router";
import { useStackOptions } from "@/navigation/header";

export const unstable_settings = { anchor: "index" };

export default function SettingsLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen
        name="index"
        options={{ title: "Settings", headerLargeTitleEnabled: true }}
      />
    </Stack>
  );
}
