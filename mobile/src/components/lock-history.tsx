import type { OverviewPage } from "@contract";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme/tokens";
import { liveToneColor } from "@/theme/tones";
import { usePalette } from "@/theme/use-palette";
import { Button } from "./button";
import { Icon } from "./icon";
import { liveIcons } from "./icons";
import { Panel } from "./panel";
import { Text } from "./text";

const shownFirst = 5;

export function LockHistory({
  history,
}: {
  history: NonNullable<OverviewPage["history"]>;
}) {
  const palette = usePalette();
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? history : history.slice(0, shownFirst);
  const hidden = history.length - shownFirst;
  return (
    <Panel title="Locks and Sentry Mode">
      {history.length ? (
        <>
          {rows.map((event) => (
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
          ))}
          {hidden > 0 ? (
            <Button
              label={expanded ? "Show fewer" : `Show ${hidden} more`}
              kind="secondary"
              onPress={() => setExpanded((value) => !value)}
            />
          ) : null}
        </>
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
