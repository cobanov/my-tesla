import type { OverviewPage } from "@contract";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useCar } from "@/car/car-provider";
import { radius, space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { Icon } from "./icon";
import { icons } from "./icons";
import { Text } from "./text";

function BatteryGlyph({
  level,
  tone,
}: {
  level: number | null;
  tone: "charge" | "low" | "normal";
}) {
  const palette = usePalette();
  const fill = {
    charge: palette.charge,
    low: palette.destructive,
    normal: palette.foreground,
  }[tone];
  const share = Math.min(100, Math.max(0, level ?? 0));
  return (
    <View style={styles.glyph} accessibilityElementsHidden>
      <View style={[styles.glyphBody, { borderColor: palette.subtle }]}>
        <View
          style={[
            styles.glyphFill,
            { width: `${share}%`, backgroundColor: fill },
          ]}
        />
      </View>
      <View style={[styles.glyphTip, { backgroundColor: palette.subtle }]} />
    </View>
  );
}

export function CarTitle({ page }: { page: OverviewPage }) {
  const palette = usePalette();
  const { cars, car, choose } = useCar();
  const [open, setOpen] = useState(false);
  const others = cars.filter((entry) => entry.id !== car.id);
  const battery = page.battery;
  const state = [battery?.value.text, page.activity.label]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={styles.title}>
      <Pressable
        accessibilityRole={others.length ? "button" : "header"}
        accessibilityLabel={
          others.length ? `${page.car.name}, change the car` : page.car.name
        }
        accessibilityState={others.length ? { expanded: open } : undefined}
        disabled={!others.length}
        onPress={() => setOpen((value) => !value)}
        style={styles.name}
      >
        <Text variant="display" numberOfLines={1} style={styles.nameText}>
          {page.car.name}
        </Text>
        {others.length ? (
          <Icon
            name={open ? icons.chevronUp : icons.chevronDown}
            color={palette.mutedForeground}
            size={16}
          />
        ) : null}
      </Pressable>
      <View
        accessible
        accessibilityLabel={`${state}, ${page.activity.updated}`}
        style={styles.state}
      >
        {battery ? (
          <BatteryGlyph level={battery.level} tone={battery.tone} />
        ) : null}
        <Text variant="strong" numberOfLines={1}>
          {state}
        </Text>
      </View>
      <Text variant="caption" numberOfLines={1}>
        {page.car.variant} · {page.activity.updated.toLowerCase()}
      </Text>
      {open && others.length ? (
        <View style={[styles.list, { backgroundColor: palette.card }]}>
          {others.map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`Show ${entry.name}`}
              onPress={() => {
                choose(entry.id);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.pressed,
              ]}
            >
              <Text variant="strong">{entry.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { gap: space.xs },
  name: { flexDirection: "row", alignItems: "center", gap: space.sm },
  nameText: { flexShrink: 1 },
  state: { flexDirection: "row", alignItems: "center", gap: space.sm },
  glyph: { flexDirection: "row", alignItems: "center" },
  glyphBody: {
    width: 24,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 3,
    padding: 1.5,
  },
  glyphFill: { height: "100%", borderRadius: 1 },
  glyphTip: { width: 2, height: 5, borderRadius: 1, marginLeft: 1 },
  list: {
    marginTop: space.sm,
    borderRadius: radius.card,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  option: { paddingHorizontal: space.lg, paddingVertical: space.md },
  pressed: { opacity: 0.6 },
});
