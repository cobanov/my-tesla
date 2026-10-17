import { StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { Text } from "./text";

export function SectionHeading({ title }: { title: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.heading, { backgroundColor: palette.background }]}>
      <Text variant="label" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginHorizontal: -space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
});
