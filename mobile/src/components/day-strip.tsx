import type { DayKind, OverviewPage } from "@contract";
import { StyleSheet, View } from "react-native";
import type { Palette } from "@/theme/palette";
import { radius, space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { Text } from "./text";

function dayColors(palette: Palette): Record<DayKind, string> {
  return {
    drive: palette.primary,
    charge: palette.charge,
    online: palette.subtle,
    asleep: `${palette.subtle}59`,
    offline: `${palette.subtle}26`,
  };
}

export function DayStrip({
  today,
}: {
  today: NonNullable<OverviewPage["today"]>;
}) {
  const palette = usePalette();
  const colors = dayColors(palette);
  return (
    <View accessible accessibilityLabel="Today, hour by hour">
      <View style={[styles.strip, { backgroundColor: palette.background }]}>
        {today.segments.map((segment) => (
          <View
            key={`${segment.kind}-${segment.start}`}
            style={[
              styles.segment,
              {
                left: `${segment.start * 100}%`,
                width: `${(segment.end - segment.start) * 100}%`,
                backgroundColor: colors[segment.kind],
              },
            ]}
          />
        ))}
        <View
          style={[
            styles.now,
            {
              left: `${today.now * 100}%`,
              backgroundColor: palette.foreground,
            },
          ]}
        />
      </View>
      <View style={styles.hours}>
        {today.hours.map((hour, index) => (
          <Text key={`${hour}-${index}`} variant="caption" style={styles.hour}>
            {hour}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { height: 32, borderRadius: radius.control, overflow: "hidden" },
  segment: { position: "absolute", top: 0, bottom: 0 },
  now: { position: "absolute", top: 0, bottom: 0, width: 2 },
  hours: {
    marginTop: space.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hour: { fontSize: 11, fontVariant: ["tabular-nums"] },
});
