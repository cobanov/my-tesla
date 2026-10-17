import { NativeTabs } from "expo-router/native-tabs";
import { useAlertRefresh, useAlertRouting } from "@/alerts/use-alerts";
import { CarProvider } from "@/car/car-provider";
import { fonts } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

function Tabs() {
  const palette = usePalette();
  useAlertRefresh();
  useAlertRouting();
  return (
    <NativeTabs
      tintColor={palette.foreground}
      labelStyle={{ fontFamily: fonts.medium, color: palette.subtle }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="gauge.with.dots.needle.67percent"
          md="speed"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="drives">
        <NativeTabs.Trigger.Label>Drives</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="point.topleft.down.to.point.bottomright.curvepath.fill"
          md="route"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="charging">
        <NativeTabs.Trigger.Label>Charging</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bolt.fill" md="ev_station" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabsLayout() {
  return (
    <CarProvider>
      <Tabs />
    </CarProvider>
  );
}
