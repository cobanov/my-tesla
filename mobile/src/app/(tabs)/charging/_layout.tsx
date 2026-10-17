import { Stack } from "expo-router";
import { useStackOptions } from "@/navigation/header";

export const unstable_settings = { anchor: "index" };

export default function ChargingLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen
        name="index"
        options={{ title: "Charging", headerLargeTitleEnabled: true }}
      />
    </Stack>
  );
}
