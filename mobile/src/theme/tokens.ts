import { Easing } from "react-native";

export const radius = { control: 4, card: 12 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
} as const;

export const motion = {
  durationMs: 330,
  easing: Easing.bezier(0.5, 0, 0, 0.75),
} as const;
