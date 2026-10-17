import type { LngLat, MapMarker, MapPlace } from "@contract";
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type InitialViewState,
} from "@maplibre/maplibre-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View, useColorScheme } from "react-native";
import { useSettings } from "@/api/queries";
import { motion, radius, space } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";
import { useReducedMotion } from "@/theme/use-reduced-motion";
import {
  boundsOf,
  lines,
  markerPoints,
  placePoints,
  routeEnds,
} from "./map-geometry";
import { Text } from "./text";

const mapStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

const carZoom = 15;
const fitPadding = { top: 40, right: 40, bottom: 40, left: 40 };

function useMapStyle(): string {
  const scheme = useColorScheme();
  const settings = useSettings();
  const chosen = settings.data?.groups
    .flatMap((group) => group.items)
    .find((item) => item.key === "mapTheme")?.value;
  if (chosen === "light" || chosen === "dark") return mapStyles[chosen];
  return scheme === "dark" ? mapStyles.dark : mapStyles.light;
}

function MapCanvas({
  label,
  height,
  view,
  rounded,
  children,
}: {
  label: string;
  height: number;
  view: InitialViewState;
  rounded: number;
  children: ReactNode;
}) {
  const palette = usePalette();
  const mapStyle = useMapStyle();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.frame,
        { height, borderRadius: rounded, backgroundColor: palette.card },
      ]}
    >
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        dragPan={false}
        touchRotate={false}
        touchPitch={false}
        compass={false}
        logo={false}
        attributionPosition={{ bottom: 6, right: 6 }}
      >
        <Camera initialViewState={view} />
        {children}
      </Map>
    </View>
  );
}

function CarDot() {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: motion.durationMs * 5,
        easing: motion.easing,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  return (
    <View style={styles.car}>
      {reduced ? null : (
        <Animated.View
          style={[
            styles.ring,
            {
              backgroundColor: palette.primary,
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 0],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.6],
                  }),
                },
              ],
            },
          ]}
        />
      )}
      <View
        style={[
          styles.dot,
          {
            backgroundColor: palette.primary,
            borderColor: palette.primaryForeground,
          },
        ]}
      />
    </View>
  );
}

export function LocationMap({
  latitude,
  longitude,
  label,
  height = 192,
}: {
  latitude: number;
  longitude: number;
  label: string;
  height?: number;
}) {
  const center: LngLat = [longitude, latitude];
  return (
    <MapCanvas
      label={label}
      height={height}
      rounded={radius.control}
      view={{ center, zoom: carZoom }}
    >
      <Marker id="car" lngLat={center}>
        <CarDot />
      </Marker>
    </MapCanvas>
  );
}

function Markers({ markers }: { markers: readonly MapMarker[] }) {
  const palette = usePalette();
  const white = palette.primaryForeground;
  return (
    <GeoJSONSource id="markers" data={markerPoints(markers)}>
      <Layer
        id="marker-dots"
        type="circle"
        paint={{
          "circle-radius": ["match", ["get", "kind"], ["end", "charge"], 5, 4],
          "circle-color": [
            "match",
            ["get", "kind"],
            "end",
            palette.primary,
            "charge",
            palette.charge,
            palette.background,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "match",
            ["get", "kind"],
            "start",
            palette.foreground,
            "stop",
            palette.primary,
            white,
          ],
        }}
      />
    </GeoJSONSource>
  );
}

export function RouteMap({
  routes,
  markers,
  label,
  width = 4,
}: {
  routes: readonly LngLat[][];
  markers?: readonly MapMarker[];
  label: string;
  width?: number;
}) {
  const palette = usePalette();
  const bounds = boundsOf([
    ...routes.flat(),
    ...(markers ?? []).map((marker): LngLat => [
      marker.longitude,
      marker.latitude,
    ]),
  ]);
  if (!bounds) return null;
  const ends =
    markers ?? (routes.length === 1 && routes[0] ? routeEnds(routes[0]) : []);
  return (
    <MapCanvas
      label={label}
      height={280}
      rounded={radius.card}
      view={{ bounds, padding: fitPadding }}
    >
      <GeoJSONSource id="route" data={lines(routes)}>
        <Layer
          id="route-line"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": palette.primary, "line-width": width }}
        />
      </GeoJSONSource>
      <Markers markers={ends} />
    </MapCanvas>
  );
}

function Legend() {
  const palette = usePalette();
  return (
    <View style={styles.legend}>
      {[
        { label: "Visited", color: palette.primary },
        { label: "Charged", color: palette.charge },
      ].map((entry) => (
        <View key={entry.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
          <Text variant="caption">{entry.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function PlacesMap({ places }: { places: readonly MapPlace[] }) {
  const palette = usePalette();
  const bounds = boundsOf(
    places.map((place): LngLat => [place.longitude, place.latitude]),
  );
  if (!bounds) return null;
  return (
    <View style={styles.places}>
      <MapCanvas
        label={`Map of ${places.length} places`}
        height={320}
        rounded={radius.control}
        view={{ bounds, padding: fitPadding }}
      >
        <GeoJSONSource id="places" data={placePoints(places)}>
          <Layer
            id="place-dots"
            type="circle"
            paint={{
              "circle-radius": [
                "-",
                ["get", "radius"],
                ["match", ["get", "kind"], "both", 3, 2],
              ],
              "circle-color": [
                "match",
                ["get", "kind"],
                "charge",
                palette.charge,
                palette.primary,
              ],
              "circle-stroke-width": ["match", ["get", "kind"], "both", 3, 2],
              "circle-stroke-color": [
                "match",
                ["get", "kind"],
                "both",
                palette.charge,
                palette.primaryForeground,
              ],
            }}
          />
        </GeoJSONSource>
      </MapCanvas>
      <Legend />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", borderCurve: "continuous" },
  car: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: { position: "absolute", width: 24, height: 24, borderRadius: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  places: { gap: space.md },
  legend: { flexDirection: "row", gap: space.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
