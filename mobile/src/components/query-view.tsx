import type { UseQueryResult } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { Button } from "./button";
import { Notice } from "./notice";
import { Panel } from "./panel";
import { Text } from "./text";

const spinnerDelayMs = 400;

function Pending() {
  const palette = usePalette();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), spinnerDelayMs);
    return () => clearTimeout(timer);
  }, []);
  return shown ? (
    <ActivityIndicator color={palette.subtle} style={styles.pending} />
  ) : null;
}

export function Problem({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Panel title="No answer">
      <Text>{message}</Text>
      <Button label="Try again" kind="secondary" onPress={onRetry} />
    </Panel>
  );
}

export function QueryView<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.data !== undefined) {
    return (
      <>
        {query.error ? (
          <View style={styles.banner}>
            <Notice text={`${query.error.message} The values can be old.`} />
          </View>
        ) : null}
        {children(query.data)}
      </>
    );
  }
  if (query.error) {
    return (
      <Problem message={query.error.message} onRetry={() => query.refetch()} />
    );
  }
  return <Pending />;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Text variant="strong">{title}</Text>
      <Text variant="label" style={styles.emptyText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pending: { marginTop: space.xxl * 2 },
  banner: { marginBottom: space.lg },
  empty: {
    paddingVertical: space.xxl * 2,
    alignItems: "center",
    gap: space.sm,
  },
  emptyText: { textAlign: "center", maxWidth: 320 },
});
