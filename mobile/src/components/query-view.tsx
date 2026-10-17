import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { Button } from "./button";
import { Notice } from "./notice";
import { Panel } from "./panel";
import { TeslaMark } from "./tesla-mark";
import { Text } from "./text";

function Pending() {
  return (
    <View
      accessible
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={styles.pending}
    >
      <TeslaMark size={44} kind="breathe" />
    </View>
  );
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
  pending: { marginTop: space.xxl * 3, alignItems: "center" },
  banner: { marginBottom: space.lg },
  empty: {
    paddingVertical: space.xxl * 2,
    alignItems: "center",
    gap: space.sm,
  },
  emptyText: { textAlign: "center", maxWidth: 320 },
});
