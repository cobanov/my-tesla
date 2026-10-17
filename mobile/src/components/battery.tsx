import type { OverviewPage } from "@contract";
import { useEffect, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, View } from "react-native";
import { chargeLeftText } from "@/format";
import { useNow } from "@/hooks/use-now";
import { motion, space } from "@/theme/tokens";
import { toneColor } from "@/theme/tones";
import { usePalette } from "@/theme/use-palette";
import { useReducedMotion } from "@/theme/use-reduced-motion";
import { Text } from "./text";

const countdownMs = 15_000;

export function Battery({
  battery,
}: {
  battery: NonNullable<OverviewPage["battery"]>;
}) {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const now = useNow(countdownMs);
  const [fill] = useState(() => new Animated.Value(0));
  const percent = Math.min(
    100,
    Math.max(0, battery.usable ?? battery.level ?? 0),
  );
  const fillColor = {
    charge: palette.charge,
    low: palette.destructive,
    normal: palette.foreground,
  }[battery.tone];
  const left = chargeLeftText(battery.fullAt, now);
  const note = battery.value.note;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: percent,
      duration: reduced ? 0 : motion.durationMs * 2,
      easing: motion.easing,
      useNativeDriver: false,
    }).start();
  }, [fill, percent, reduced]);

  return (
    <View>
      <View style={styles.numbers}>
        <Pressable
          accessibilityRole={note ? "button" : "text"}
          accessibilityLabel={`Battery ${battery.value.text}`}
          accessibilityHint={note ? "Explains the value" : undefined}
          disabled={!note}
          onPress={() => note && Alert.alert("Battery", note)}
        >
          <Text
            variant="hero"
            color={toneColor(palette, battery.value.tone)}
            numberOfLines={1}
          >
            {battery.value.text}
          </Text>
        </Pressable>
        <Text variant="value" tone="mutedForeground">
          {battery.range}
        </Text>
        {left ? (
          <Text variant="value" tone="charge">
            {left}
          </Text>
        ) : null}
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Battery level"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: battery.level ?? undefined,
        }}
        style={[styles.track, { backgroundColor: palette.muted }]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: fillColor,
              width: fill.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text variant="label" style={styles.caption}>
        {battery.caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  numbers: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: space.xl,
    rowGap: space.sm,
  },
  track: {
    marginTop: space.xl,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
  caption: { marginTop: space.md },
});
