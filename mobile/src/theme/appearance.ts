import { Storage } from "expo-sqlite/kv-store";
import { Appearance } from "react-native";

export const themeChoices = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

export type ThemeChoice = (typeof themeChoices)[number]["id"];

const storageKey = "theme";

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = Storage.getItemSync(storageKey);
    return themeChoices.find((choice) => choice.id === stored)?.id ?? "dark";
  } catch {
    return "dark";
  }
}

export function applyThemeChoice(choice: ThemeChoice): void {
  Appearance.setColorScheme(choice === "system" ? "auto" : choice);
}

export function saveThemeChoice(choice: ThemeChoice): void {
  Storage.setItemSync(storageKey, choice);
  applyThemeChoice(choice);
}
