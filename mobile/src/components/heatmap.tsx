import type { AppBlock } from "@contract";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { Text } from "./text";

type HeatmapBlock = Extract<AppBlock, { kind: "heatmap" }>;

export function Heatmap({ block }: { block: HeatmapBlock }) {
  const palette = usePalette();
  return (
    <View>
      {block.rows.map((row) => {
        const total = row.values.reduce((sum, value) => sum + value, 0);
        return (
          <View
            key={row.label}
            accessible
            accessibilityLabel={`${row.label}: ${total} ${block.unit}`}
            style={styles.row}
          >
            <Text variant="caption" style={styles.label}>
              {row.label}
            </Text>
            <View style={styles.cells}>
              {row.values.map((value, hour) => (
                <View
                  key={hour}
                  style={[styles.cell, { backgroundColor: palette.muted }]}
                >
                  {value > 0 ? (
                    <View
                      style={[
                        styles.fill,
                        {
                          backgroundColor: palette.primary,
                          opacity: 0.2 + (value / block.max) * 0.8,
                        },
                      ]}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        );
      })}
      <View style={styles.hours}>
        {block.hours.map((hour, index) => (
          <Text key={`${hour}-${index}`} variant="caption" style={styles.hour}>
            {hour}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  label: { width: 36 },
  cells: { flex: 1, flexDirection: "row", gap: 2 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 2, overflow: "hidden" },
  fill: { flex: 1 },
  hours: {
    marginTop: space.xs,
    marginLeft: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hour: { fontSize: 11, fontVariant: ["tabular-nums"] },
});
