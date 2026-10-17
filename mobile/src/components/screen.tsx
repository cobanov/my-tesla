import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

export const screenPadding = space.xl;

export function Screen({
  children,
  refreshing,
  onRefresh,
  stickyHeaderIndices,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  stickyHeaderIndices?: number[];
}) {
  const palette = usePalette();
  return (
    <ScrollView
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      stickyHeaderIndices={stickyHeaderIndices}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={palette.subtle}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: space.lg,
    paddingBottom: space.xxl * 3,
    gap: space.lg,
  },
});
