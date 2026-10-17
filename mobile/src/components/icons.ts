import type { LiveIcon } from "@contract";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";

export type IconName = { ios: SFSymbol; android: AndroidSymbol };

export const icons = {
  settings: { ios: "gearshape", android: "settings" },
  chevron: { ios: "chevron.right", android: "chevron_right" },
  warning: { ios: "exclamationmark.triangle.fill", android: "warning" },
  info: { ios: "info.circle", android: "info" },
  drive: {
    ios: "point.topleft.down.to.point.bottomright.curvepath.fill",
    android: "route",
  },
  charge: { ios: "bolt.fill", android: "bolt" },
  stop: { ios: "parkingsign.circle.fill", android: "local_parking" },
} as const satisfies Record<string, IconName>;

export const liveIcons: Record<LiveIcon, IconName> = {
  lock: { ios: "lock.fill", android: "lock" },
  "lock-open": { ios: "lock.open.fill", android: "lock_open" },
  "door-closed": { ios: "door.left.hand.closed", android: "door_front" },
  "door-open": { ios: "door.left.hand.open", android: "door_open" },
  plug: { ios: "powerplug.fill", android: "power" },
  "plug-zap": { ios: "bolt.fill", android: "bolt" },
  unplug: { ios: "bolt.slash.fill", android: "power_off" },
  fan: { ios: "fan.fill", android: "mode_fan" },
  "badge-check": { ios: "checkmark.seal.fill", android: "verified" },
  download: { ios: "arrow.down.circle.fill", android: "download" },
  gauge: { ios: "gauge.with.dots.needle.67percent", android: "speed" },
  navigation: { ios: "location.fill", android: "navigation" },
};
