import type { OverviewCallout } from "@contract";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { motion, space } from "@/theme/tokens";
import { liveToneColor } from "@/theme/tones";
import { usePalette } from "@/theme/use-palette";
import { useReducedMotion } from "@/theme/use-reduced-motion";
import { Text } from "./text";

function Callout({ callout }: { callout: OverviewCallout }) {
  const palette = usePalette();
  const align = { left: "flex-start", top: "center", right: "flex-end" }[
    callout.side
  ] as "flex-start" | "center" | "flex-end";
  return (
    <View
      accessible
      accessibilityLabel={`${callout.label}, ${callout.value}`}
      style={[styles.callout, styles[callout.side], { alignItems: align }]}
    >
      <Text variant="caption" tone="subtle" style={styles.calloutLabel}>
        {callout.label}
      </Text>
      <Text
        variant="strong"
        color={
          callout.tone === "normal"
            ? palette.foreground
            : liveToneColor(palette, callout.tone)
        }
        numberOfLines={1}
      >
        {callout.value}
      </Text>
      <View style={[styles.line, { backgroundColor: palette.input }]} />
    </View>
  );
}

export function CarStage({
  image,
  name,
  callouts,
}: {
  image: string | null;
  name: string;
  callouts: OverviewCallout[];
}) {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const shown = image && !failed ? image : null;
  return (
    <View style={[styles.stage, !shown && styles.stageWithoutCar]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="62%" rx="55%" ry="45%">
            <Stop offset="0" stopColor={palette.card} stopOpacity={1} />
            <Stop offset="1" stopColor={palette.background} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
      {shown ? (
        <Image
          source={shown}
          accessibilityLabel={name}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={
            reduced
              ? null
              : { duration: motion.durationMs, skipOnCacheHit: "all" }
          }
          onError={() => setFailed(true)}
          style={styles.image}
        />
      ) : null}
      {callouts.map((callout) => (
        <Callout key={callout.key} callout={callout} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    aspectRatio: 4 / 3,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  stageWithoutCar: { aspectRatio: 2 },
  image: {
    width: "84%",
    aspectRatio: 16 / 9,
    alignSelf: "center",
    marginBottom: "3%",
  },
  callout: { position: "absolute", gap: 2, maxWidth: "34%" },
  calloutLabel: { textTransform: "uppercase", letterSpacing: 1 },
  left: { left: 0, top: "34%" },
  top: { top: space.xs, left: "22%", right: "22%", maxWidth: "100%" },
  right: { right: 0, top: "34%" },
  line: { width: 1, height: 24, marginTop: space.xs },
});
