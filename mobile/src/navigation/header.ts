import type { Stack } from "expo-router";
import type { ComponentProps } from "react";
import { fonts } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

type StackOptions = NonNullable<ComponentProps<typeof Stack>["screenOptions"]>;

export function useStackOptions(): Exclude<
  StackOptions,
  (...args: never[]) => unknown
> {
  const palette = usePalette();
  return {
    headerTitleStyle: { fontFamily: fonts.medium },
    headerLargeTitleStyle: { fontFamily: fonts.medium },
    headerBackTitleStyle: { fontFamily: fonts.regular },
    headerTintColor: palette.foreground,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: palette.background },
  };
}
