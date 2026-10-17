import { SymbolView } from "expo-symbols";
import type { IconName } from "./icons";

export function Icon({
  name,
  color,
  size = 20,
}: {
  name: IconName;
  color: string;
  size?: number;
}) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
