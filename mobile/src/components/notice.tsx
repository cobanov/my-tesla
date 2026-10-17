import { StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { Icon } from "./icon";
import { icons } from "./icons";
import { Text } from "./text";

export function Notice({ text }: { text: string }) {
  const palette = usePalette();
  return (
    <View style={styles.notice} accessible accessibilityLabel={text}>
      <Icon name={icons.warning} color={palette.warning} size={16} />
      <Text variant="label" style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  text: { flex: 1 },
});
