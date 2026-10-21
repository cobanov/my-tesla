import type { TimelinePage } from "@contract";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTimeline } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { Button } from "@/components/button";
import { DayStrip } from "@/components/day-strip";
import { Icon } from "@/components/icon";
import { icons } from "@/components/icons";
import { ListRow } from "@/components/list-row";
import { Panel } from "@/components/panel";
import { EmptyState, QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { StatGrid } from "@/components/stat";
import { Text } from "@/components/text";
import { useRefresh } from "@/hooks/use-refresh";
import { targetHref } from "@/navigation/targets";
import { space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

const rowIcons = {
  drive: icons.drive,
  charge: icons.charge,
  parked: icons.stop,
} as const;

function TimelineRow({ row }: { row: TimelinePage["rows"][number] }) {
  const router = useRouter();
  const palette = usePalette();
  const color =
    row.kind === "drive"
      ? palette.primary
      : row.kind === "charge"
        ? palette.charge
        : palette.subtle;
  const target = row.target;
  return (
    <ListRow
      label={`${row.time}, ${row.title}, ${row.detail}`}
      onPress={
        target ? () => router.push(targetHref(target, "drives")) : undefined
      }
      start={<Icon name={rowIcons[row.kind]} color={color} />}
      startWidth={28}
      title={row.title}
      subtitle={row.detail}
      end={
        <Text variant="caption" style={styles.time}>
          {row.time}
        </Text>
      }
    />
  );
}

export default function TimelineScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const asked =
    typeof params.day === "string" && dayPattern.test(params.day)
      ? params.day
      : null;
  const [day, setDay] = useState<string | null>(asked);
  const { car } = useCar();
  const timeline = useTimeline(car.id, day);
  const refresh = useRefresh(timeline);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <Stack.Screen options={{ title: timeline.data?.title ?? "Timeline" }} />
      <QueryView query={timeline}>
        {(page) => (
          <View
            style={[
              styles.content,
              timeline.isPlaceholderData && styles.dimmed,
            ]}
          >
            <View style={styles.days}>
              <View style={styles.day}>
                <Button
                  label="Day before"
                  kind="secondary"
                  onPress={() => setDay(page.previous)}
                />
              </View>
              <View style={styles.day}>
                <Button
                  label="Day after"
                  kind="secondary"
                  disabled={page.next === null}
                  onPress={() => page.next && setDay(page.next)}
                />
              </View>
            </View>
            <StatGrid stats={page.stats} />
            <Panel title="Hour by hour">
              <DayStrip
                today={page.strip}
                label={`${page.title}, hour by hour`}
              />
            </Panel>
            {page.rows.length ? (
              <View style={styles.rows}>
                {page.rows.map((row) => (
                  <TimelineRow key={row.key} row={row} />
                ))}
              </View>
            ) : (
              <EmptyState
                title="No record yet"
                text="TeslaMate recorded nothing on this day."
              />
            )}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  dimmed: { opacity: 0.6 },
  days: { flexDirection: "row", gap: space.md },
  day: { flex: 1 },
  rows: { gap: 2 },
  time: { fontVariant: ["tabular-nums"] },
});
