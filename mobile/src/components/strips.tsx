import type { DriveRow, LevelRange } from "@contract";
import { StyleSheet, View } from "react-native";
import { usePalette } from "@/theme/use-palette";

export function TripStrip({ segments }: { segments: DriveRow["segments"] }) {
  const palette = usePalette();
  if (segments.length === 0) return null;
  const colors = {
    drive: palette.primary,
    stop: palette.input,
    charge: palette.charge,
  };
  return (
    <View style={[styles.strip, styles.track]}>
      {segments.map((segment, index) => (
        <View
          key={index}
          style={[
            styles.part,
            { flexGrow: segment.share, backgroundColor: colors[segment.kind] },
            segment.kind !== "drive" && styles.visible,
          ]}
        />
      ))}
    </View>
  );
}

export function LevelBar({
  levels,
  wide = false,
}: {
  levels: LevelRange;
  wide?: boolean;
}) {
  const height = wide ? 8 : 4;
  const palette = usePalette();
  return (
    <View
      style={[
        styles.track,
        wide && styles.wide,
        { height, borderRadius: height / 2, backgroundColor: palette.muted },
      ]}
    >
      <View
        style={[
          styles.fill,
          { width: `${levels.start}%`, backgroundColor: palette.input },
        ]}
      />
      <View
        style={[
          styles.fill,
          {
            left: `${levels.start}%`,
            width: `${Math.max(0, levels.end - levels.start)}%`,
            backgroundColor: palette.charge,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    marginTop: 8,
    width: "100%",
    maxWidth: 192,
    overflow: "hidden",
  },
  wide: { marginTop: 0, maxWidth: undefined },
  strip: { height: 4, flexDirection: "row", gap: 2, borderRadius: 2 },
  part: { flexBasis: 0, height: "100%" },
  visible: { minWidth: 3 },
  fill: { position: "absolute", top: 0, bottom: 0, borderRadius: 2 },
});
