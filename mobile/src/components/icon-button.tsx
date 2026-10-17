import { Pressable, StyleSheet } from "react-native";
import { radius } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { Icon } from "./icon";
import type { IconName } from "./icons";

export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      android_ripple={{ color: palette.accent, borderless: true }}
      style={({ pressed }) => [
        styles.button,
        pressed && { backgroundColor: palette.accent },
      ]}
    >
      <Icon name={icon} color={palette.foreground} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
});
