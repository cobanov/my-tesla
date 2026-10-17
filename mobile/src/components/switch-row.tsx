import { StyleSheet, Switch, View } from "react-native";
import { space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { Text } from "./text";

export function SwitchRow({
  label,
  detail,
  value,
  disabled,
  onChange,
}: {
  label: string;
  detail: string | null;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const palette = usePalette();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="strong">{label}</Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: palette.primary, false: palette.input }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.lg },
  text: { flex: 1, gap: 2 },
});
