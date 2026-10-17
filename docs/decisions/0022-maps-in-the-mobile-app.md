# 0022: Maps in the mobile app

Date: 2026-10-18

Status: Accepted.

## Context

The web dashboard shows maps on the Overview, a drive, a trip, a charge, and the Places page. It draws them with MapLibre GL on the CARTO Positron and Dark Matter styles, with the route in Electric Blue and small dots for the start, the end, the stops, and the places. The app showed no map. The app API already sent the car position, the drive route, the trip legs, and the charge position, and it left them out when maps are off in Settings.

## Decision

1. The app draws its maps with `@maplibre/maplibre-react-native` 11.5.0, the React Native build of the same engine as the web, with the same CARTO style URLs. The version is pinned, because it holds native code.
2. `src/components/map.tsx` holds three maps: `LocationMap` for the car on the Overview and the place of a charge, `RouteMap` for a drive and a trip, and `PlacesMap` for the Places page. The colors and the dot sizes copy `src/components/maps.tsx` of the web.
3. Routes and dots are style layers on a GeoJSON source, so a map with many places stays fast. Only the car is a native view, so it can pulse. The pulse stops with Reduce Motion.
4. A map inside a scrolling screen does not pan, rotate, or tilt, so one finger always scrolls the screen. Two fingers zoom. This matches the cooperative gestures of the web.
5. The map theme follows Map theme in Settings, which the app now shows and changes, or the theme of the app.
6. The server builds the trip markers and the place dots in `src/lib/map-points.ts` for the web pages and the app API.

## Alternatives

1. `expo-maps` or `react-native-maps`. They draw Apple or Google maps, which do not look like the web, send the tile requests to Apple or Google, and need a Google key on Android.
2. A static map image from the server. It needs a tile renderer on the server, and the map could not zoom.
3. A full-screen map on tap. It needs a route and the data of each map. It can come later.

## Consequences

The phone loads the map tiles from CARTO, as the browser does. [Privacy](../privacy.md) lists it. Maps off in Settings hides them in the app too.

A native package without an Expo config in `bundledNativeModules.json` can lag behind a new SDK. Build a development app and check the maps before an SDK upgrade.
