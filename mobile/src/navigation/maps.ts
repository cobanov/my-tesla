import { Platform } from "react-native";

export function mapsUrl(
  latitude: number,
  longitude: number,
  name: string,
): string {
  const label = encodeURIComponent(name);
  return Platform.OS === "ios"
    ? `https://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
    : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
}
