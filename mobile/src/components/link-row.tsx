import type { IconName } from "./icons";
import { MenuRow } from "./menu-row";

export function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <MenuRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      chevron
      onPress={onPress}
    />
  );
}
