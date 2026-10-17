import type { AppStat, OverviewPage, RecentRecord } from "@contract";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { useOverview } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { Battery } from "@/components/battery";
import { Button } from "@/components/button";
import { DayStrip } from "@/components/day-strip";
import { ListRow } from "@/components/list-row";
import { LivePanel } from "@/components/live-tiles";
import { LocationMap, MapSection } from "@/components/map";
import { Notice } from "@/components/notice";
import { Panel } from "@/components/panel";
import { EmptyState, QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { SegmentedControl } from "@/components/segmented-control";
import { StatGrid } from "@/components/stat";
import { Text } from "@/components/text";
import { useRefresh } from "@/hooks/use-refresh";
import { targetHref, type TabStack } from "@/navigation/targets";
import { motion, space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { useReducedMotion } from "@/theme/use-reduced-motion";

function CarImage({ uri, name }: { uri: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  if (failed) return null;
  return (
    <Image
      source={uri}
      accessibilityLabel={name}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={
        reduced ? null : { duration: motion.durationMs, skipOnCacheHit: "all" }
      }
      onError={() => setFailed(true)}
      style={styles.image}
    />
  );
}

function Heading({ page }: { page: OverviewPage }) {
  const palette = usePalette();
  const dot = {
    active: palette.primary,
    charge: palette.charge,
    quiet: palette.subtle,
  }[page.activity.tone];
  return (
    <View>
      <Text variant="label" numberOfLines={1}>
        {page.car.variant}
      </Text>
      <Text variant="display" numberOfLines={1} accessibilityRole="header">
        {page.car.name}
      </Text>
      <View
        style={styles.status}
        accessible
        accessibilityLabel={`${page.activity.label}, ${page.activity.updated}`}
      >
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text variant="strong">{page.activity.label}</Text>
        <Text variant="label" numberOfLines={1} style={styles.updated}>
          · {page.activity.updated.toLowerCase()}
        </Text>
      </View>
    </View>
  );
}

function Tires({ tires }: { tires: NonNullable<OverviewPage["tires"]> }) {
  const stats: AppStat[] = [
    { label: "Front left", value: tires.frontLeft, detail: null },
    { label: "Front right", value: tires.frontRight, detail: null },
    { label: "Rear left", value: tires.rearLeft, detail: null },
    { label: "Rear right", value: tires.rearRight, detail: null },
  ];
  return (
    <Panel title="Tire pressure">
      <StatGrid stats={stats} />
      {tires.warnings.map((warning) => (
        <Notice key={warning} text={warning} />
      ))}
    </Panel>
  );
}

function mapsUrl(latitude: number, longitude: number, name: string): string {
  const label = encodeURIComponent(name);
  return Platform.OS === "ios"
    ? `https://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
    : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
}

function Location({ page }: { page: OverviewPage }) {
  const location = page.location;
  if (!location) return null;
  return (
    <MapSection title="Location">
      <LocationMap
        latitude={location.latitude}
        longitude={location.longitude}
        label={`Map of where ${page.car.name} is`}
      />
      <Text variant="label" tone="subtle">
        {location.lastSeen}
      </Text>
      <Button
        label="Open in Maps"
        kind="secondary"
        onPress={() =>
          Linking.openURL(
            mapsUrl(location.latitude, location.longitude, page.car.name),
          )
        }
      />
    </MapSection>
  );
}

function Recent({
  title,
  record,
  stack,
}: {
  title: string;
  record: RecentRecord;
  stack: TabStack;
}) {
  const router = useRouter();
  return (
    <Panel title={title}>
      <ListRow
        label={`${title}: ${record.title}, ${record.detail}`}
        onPress={() =>
          router.push(targetHref(record.target, stack), { withAnchor: true })
        }
        title={record.title}
        subtitle={record.detail}
      />
    </Panel>
  );
}

function OverviewContent({ page }: { page: OverviewPage }) {
  return (
    <>
      {page.car.image ? (
        <CarImage uri={page.car.image} name={page.car.name} />
      ) : null}
      <Heading page={page} />
      {page.empty ? (
        <EmptyState
          title={`No data from ${page.car.name} yet`}
          text={page.empty}
        />
      ) : null}
      {page.battery ? <Battery battery={page.battery} /> : null}
      {page.stats.length ? (
        <View style={styles.stats}>
          <StatGrid stats={page.stats} />
        </View>
      ) : null}
      {page.live ? <LivePanel live={page.live} /> : null}
      {page.today ? (
        <Panel title="Today">
          <DayStrip today={page.today} />
        </Panel>
      ) : null}
      {page.tires ? <Tires tires={page.tires} /> : null}
      <Location page={page} />
      {page.lastDrive ? (
        <Recent title="Last drive" record={page.lastDrive} stack="drives" />
      ) : null}
      {page.lastCharge ? (
        <Recent title="Last charge" record={page.lastCharge} stack="charging" />
      ) : null}
    </>
  );
}

export default function OverviewScreen() {
  const { cars, car, choose } = useCar();
  const overview = useOverview(car.id);
  const refresh = useRefresh(overview);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      {cars.length > 1 ? (
        <SegmentedControl
          label="Car"
          size="compact"
          items={cars.map((entry) => ({
            id: String(entry.id),
            label: entry.name,
          }))}
          value={String(car.id)}
          onChange={(id) => choose(Number(id))}
        />
      ) : null}
      <QueryView query={overview}>
        {(page) => <OverviewContent page={page} />}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", aspectRatio: 16 / 7 },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  updated: { flexShrink: 1 },
  stats: { marginVertical: space.xl },
});
