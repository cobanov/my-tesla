import type { DriveRow } from "@contract";
import { useRouter } from "expo-router";
import { useDrives } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { DayList } from "@/components/day-list";
import { ListRow, RowTime } from "@/components/list-row";
import { EmptyState, QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { TripStrip } from "@/components/strips";
import { Text } from "@/components/text";
import { useRefresh } from "@/hooks/use-refresh";
import { targetHref } from "@/navigation/targets";
import { toneColor } from "@/theme/tones";
import { usePalette } from "@/theme/use-palette";

function DriveListRow({ row }: { row: DriveRow }) {
  const router = useRouter();
  const palette = usePalette();
  const consumption = row.consumption;
  return (
    <ListRow
      label={`${row.clock}, ${row.title}, ${row.subtitle}, ${row.distance}, ${consumption.text}`}
      onPress={() => router.push(targetHref(row.target, "drives"))}
      start={<RowTime clock={row.clock} caption={row.duration} />}
      title={row.title}
      subtitle={row.subtitle}
      accessory={<TripStrip segments={row.segments} />}
      end={
        <>
          <Text variant="strong" numberOfLines={1}>
            {row.distance}
          </Text>
          <Text
            variant="caption"
            numberOfLines={1}
            color={
              consumption.tone
                ? toneColor(palette, consumption.tone)
                : palette.subtle
            }
          >
            {consumption.text}
          </Text>
        </>
      }
    />
  );
}

export default function DrivesScreen() {
  const { car } = useCar();
  const drives = useDrives(car.id);
  const refresh = useRefresh(drives);
  if (!drives.data) {
    return (
      <Screen>
        <QueryView query={drives}>{() => null}</QueryView>
      </Screen>
    );
  }
  if (drives.data.sections.length === 0) {
    return (
      <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
        <EmptyState
          title="No drives yet"
          text="A drive shows here after the car drives. TeslaMate records only from the moment you sign in."
        />
      </Screen>
    );
  }
  return (
    <DayList
      summary={[car.name, ...drives.data.summary]}
      sections={drives.data.sections}
      renderRow={(row) => <DriveListRow row={row} />}
      refreshing={refresh.refreshing}
      onRefresh={refresh.onRefresh}
    />
  );
}
