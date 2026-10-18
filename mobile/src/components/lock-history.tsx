import type { OverviewPage } from "@contract";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { liveToneColor } from "@/theme/tones";
import { usePalette } from "@/theme/use-palette";
import { Icon } from "./icon";
import { liveIcons } from "./icons";
import { Panel } from "./panel";
import { Text } from "./text";

export function LockHistory({
  history,
}: {
  history: NonNullable<OverviewPage["history"]>;
}) {
  const palette = usePalette();
  return (
    <Panel title="Locks and Sentry Mode">
      {history.length ? (
        history.map((event) => (
          <View
            key={event.key}
            accessible
            accessibilityLabel={`${event.title}, ${event.when}`}
            style={styles.row}
          >
            <Icon
              name={liveIcons[event.icon]}
              color={liveToneColor(palette, event.tone)}
            />
            <Text variant="strong" style={styles.title}>
              {event.title}
            </Text>
            <Text variant="caption" style={styles.when}>
              {event.when}
            </Text>
          </View>
        ))
      ) : (
        <Text variant="label" tone="subtle">
          No change in the last 7 days. My Tesla records each lock and Sentry
          Mode change from the MQTT feed.
        </Text>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { flex: 1 },
  when: { fontVariant: ["tabular-nums"] },
});
