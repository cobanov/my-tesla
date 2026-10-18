import type { DriveRow } from "@contract";
import { useRouter } from "expo-router";
import { targetHref, type TabStack } from "@/navigation/targets";
import { toneColor } from "@/theme/tones";
import { usePalette } from "@/theme/use-palette";
import { ListRow, RowTime } from "./list-row";
import { TripStrip } from "./strips";
import { Text } from "./text";

export function DriveListRow({
  row,
  stack,
}: {
  row: DriveRow;
  stack: TabStack;
}) {
  const router = useRouter();
  const palette = usePalette();
  const consumption = row.consumption;
  return (
    <ListRow
      label={`${row.clock}, ${row.title}, ${row.subtitle}, ${row.distance}, ${consumption.text}`}
      onPress={() => router.push(targetHref(row.target, stack))}
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
