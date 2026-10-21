import { usePalette } from "@/theme/use-palette";
import { Icon } from "./icon";
import { icons } from "./icons";
import { ListRow } from "./list-row";

export function LinkRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const palette = usePalette();
  return (
    <ListRow
      label={`${title}, ${subtitle}`}
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      end={<Icon name={icons.chevron} color={palette.subtle} size={14} />}
    />
  );
}
