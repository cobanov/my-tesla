import { useColorScheme } from "react-native";
import { palettes, type Palette } from "./palette";

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? palettes.dark : palettes.light;
}
