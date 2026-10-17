# My Tesla mobile UI research

Research date: 2026-10-17. Checked against Expo SDK 58 (React Native 0.88, React 19.3, expo-router 58.0.23), the Apple Human Interface Guidelines, Material Design 3, WCAG 2.2, and the package registries.

## Question

Which navigation, components, charts, and maps give a native iOS and Android app that follows the Tesla style of the web dashboard, stays small, and is accessible?

## Navigation

| Topic | Decision | Reason |
|---|---|---|
| Tabs | Five native tabs: Overview, Drives, Charging, Insights, Settings | Apple asks for the minimum number of tabs and, in general, three to five on iPhone. Material 3 and the Android navigation bar allow three to five destinations, and Android native tabs allow at most five. Battery, Stats, and Places already share one period control on the web, so they form Insights. |
| Settings | A tab, not a modal | Settings now changes the web Settings, with a picker for each choice. A tab keeps that stack of screens, and the gear button on Overview is gone. Five is the limit, so a new destination needs a decision record. |
| Choice lists | A pushed screen with one row for each option and a check mark on the chosen one. It stays open after a choice. | The Settings pattern of iOS: the check mark moves at once, and Back returns. A choice saves at once, with the old value back when the server refuses it. |
| Search in a long list | `Stack.SearchBar` on a choice list with more than 12 options, such as the time zone | The native search field of the header. SDK 55 and later replace `headerSearchBarOptions` with this component. |
| Stacks | A `Stack` inside each tab folder, with `unstable_settings = { anchor: "index" }` | `initialRouteName` is gone in SDK 58. The anchor puts the list under a deep link, so Back returns to it. |
| Headers | Native large titles on the list screens, a small title on the detail screens | The ScrollView must be the first child for the large title to collapse. iOS 26 makes headers transparent with Liquid Glass by default, so the app adds no blur. |
| Header fonts | `headerTitleStyle` and `headerLargeTitleStyle` set Inter | iOS 26 headers ignore the theme fonts in SDK 58. |
| Lists | A ScrollView with sticky day headings | Native tabs scroll a ScrollView to the top and pop the stack when the active tab is pressed again. They do not do this for a FlatList. A list holds at most 50 rows. |
| Links from an alert | `router.navigate` to a known route only, after the car is chosen | The notification data comes from outside the app, so the app accepts only the routes in its own list. |
| Two controls | One full-width segmented control for Battery, Stats, and Places. The period is a compact control in the section that it changes. | Apple uses a segmented control for closely related views. Two stacked controls of the same weight confuse. `Stack.Toolbar` would need `@expo/ui` on Android. |

## Components

| Topic | Decision | Source |
|---|---|---|
| Pressables | `Pressable`, with `accessibilityRole`, an explicit `accessibilityLabel`, and `accessibilityState` for disabled, busy, and selected | React Native docs recommend Pressable over the Touchable components. A busy button replaces its text with a spinner, so the label must stay on the Pressable. |
| Touch targets | 48 pt high buttons, 44 pt icon buttons with `hitSlop` | Apple: 44 × 44 pt. Material 3: 48 × 48 dp. WCAG 2.2 rule 2.5.8: at least 24 px. |
| Android feedback | `android_ripple` with the accent color, `overflow: "hidden"` on rounded controls | Material ripple, clipped to the radius |
| Haptics | None | The app is read-only. Apple asks to use haptics only for their system meaning. |
| `@expo/ui` | Not used | It needs a `Host` wrapper, ignores flexbox inside it, draws the system look over the flat Tesla style, and SDK 58 changed its API. |
| Styling | `StyleSheet.create` for layout, colors from `usePalette()` inline | Expo's color-theme guide shows this pattern, and the React Compiler memoizes the inline objects. NativeWind 5 is a release candidate, and Unistyles adds native packages. |
| Numbers | `fontVariant: ["tabular-nums"]` | The Inter 400 and 500 files of `@expo-google-fonts/inter` 0.4.2 contain the `tnum` feature. React Native passes it on both platforms. |
| Large text | Body text scales freely. The hero, display, and title sizes stop at 1.2 times. | A 64 pt number at full Dynamic Type no longer fits a phone. |
| Reduce motion | `AccessibilityInfo.isReduceMotionEnabled()` plus the `reduceMotionChanged` event | Reanimated's hook reads the setting only at start. |
| Loading | Nothing for 400 ms, then a spinner. Old data stays on screen with a notice when a refresh fails. | Nielsen Norman Group: no indicator under 1 s. The web keeps the old screen instead of a skeleton (decision 0002). |
| Pull to refresh | A `refreshing` state of its own, not `isRefetching` | `isRefetching` is true for every background refetch, so the spinner would flash every 30 s. |
| Polling | `subscribed: useIsFocused()` on every query | Tab screens stay mounted. A hidden tab must not poll. |
| Theme | Dark at first. System, Light, or Dark, kept on the phone and set with `Appearance.setColorScheme` before the first screen. | `setColorScheme` overrides the scheme for the app only. React Native 0.88 takes `'auto'` to follow the system again and marks `'unspecified'` as old. The API keeps no choice, so the app stores it. The splash is dark, because the native splash cannot read the stored choice. |
| Stored values | `expo-sqlite/kv-store` for the theme, the car list, and the last Settings answer. `expo-secure-store` stays for the server address, the token, and the alert choices. | Expo's storage guide names `expo-sqlite/kv-store` as the AsyncStorage replacement, and it reads synchronously, so the theme applies before the first frame. A stored answer passes the same shape check as a server answer, and it is shown at once and fetched again. |
| QR scanner | `CameraView.launchScanner` from `expo-camera`, with one listener on `onModernBarcodeScanned` for the Connect screen | The system scanner: VisionKit `DataScannerViewController` on iOS 16 and later, and the Google code scanner on Android. The app draws no camera screen. On iOS the scanner reports a code again on every frame, so the app takes the first one and closes it with `dismissScanner()`. iOS needs the camera permission first, and Android needs none. The plugin leaves out the microphone and `RECORD_AUDIO`. |
| Remote images | `expo-image` with `cachePolicy="memory-disk"` and a 330 ms fade on the first load only | The car image comes from the Tesla compositor with `max-age=60`. React Native `Image` follows that header on iOS and fetched the 290 KB image again after a minute and at each start. `expo-image` keeps it in memory and on disk. |
| Period changes | `placeholderData: keepPreviousData` | The old panels stay while the next period loads. |

## Charts

A small `react-native-svg` chart (SDK 58 bundles 15.16.0), not a chart library.

| Option | Why not |
|---|---|
| victory-native 42 | It needs Skia, which adds about 6 MB on iOS and 4 MB on Android. It also computes its own ticks, while the server already gives the ticks and labels in the user's format. |
| react-native-gifted-charts 1.4 | One view per point, and an open issue reports slow rendering at 300 points. |
| @wuba/react-native-echarts | A large JavaScript bundle |

The server sends each chart as points in the user's units, the axis domains, the ticks, and the tooltip labels. The app scales and draws one path for each series, the bars, a faint horizontal grid, and a scrubbing tooltip. A vertical scroll takes over from scrubbing.

## Maps

Not built yet. The choice is `@maplibre/maplibre-react-native` 11, the same map engine as the web, with the CARTO styles. Only CARTO sees the tile requests. With `expo-maps` or `react-native-maps`, Apple or Google would see them, and Android needs a Google key.

Two open points:

1. Nobody has confirmed MapLibre React Native 11 on React Native 0.88 yet. Build a development app before you depend on it.
2. CARTO now asks for a free API key. Raster tiles without a key show only a watermark. The vector styles that the web uses still answer without a key, and CARTO says that they are next.

## Package versions

| Package | Version | Note |
|---|---|---|
| expo | 58.0.14 | |
| expo-router | 58.0.23 | Native tabs from `expo-router/native-tabs` |
| expo-symbols | 58.0.4 | Android tab icons need it. It is an optional peer of expo-router. |
| react-native-svg | 15.16.0 | |
| react-native-gesture-handler | 3.3.0 | Pinned. Bun had installed 3.4.0 as a peer, one day after its release. |
| react-native-reanimated, react-native-worklets | 4.7.1, 0.13.0 | Peers of expo-router, pinned to the SDK versions |
| @tanstack/react-query | 5.104 | `subscribed` and `keepPreviousData` |
| eslint | 9 | ESLint 10 breaks `eslint-plugin-react` inside `eslint-config-expo` 58. |

## Sources

- [Expo native tabs](https://docs.expo.dev/router/advanced/native-tabs/), [Expo Router stack](https://docs.expo.dev/router/advanced/stack/), [SDK 57 to 58 router migration](https://docs.expo.dev/router/migrate/sdk-57-to-58/), [router settings](https://docs.expo.dev/router/advanced/router-settings/), [SDK 58 changelog](https://expo.dev/changelog/sdk-58)
- [Expo bundled native modules for SDK 58](https://github.com/expo/expo/blob/sdk-58/packages/expo/bundledNativeModules.json)
- [Apple HIG: tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls), [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- [Android navigation bar](https://developer.android.com/develop/ui/compose/components/navigation-bar), [Material Components bottom navigation](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [React Native Pressable](https://reactnative.dev/docs/pressable), [accessibility](https://reactnative.dev/docs/accessibility), [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo), [text style props](https://reactnative.dev/docs/text-style-props)
- [Expo React Compiler guide](https://docs.expo.dev/guides/react-compiler/), [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/)
- [TanStack Query for React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [React Native Appearance](https://reactnative.dev/docs/appearance), [Expo storage guide](https://docs.expo.dev/develop/user-interface/store-data/), [Expo SQLite kv-store](https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/), [expo-image](https://docs.expo.dev/versions/v58.0.0/sdk/image/), [expo-camera](https://docs.expo.dev/versions/v58.0.0/sdk/camera/), [React Native image cache control](https://reactnative.dev/docs/images#cache-control-ios-only), [Expo Router stack search bar](https://docs.expo.dev/versions/v58.0.0/sdk/router/stack/)
- [Nielsen Norman Group: skeleton screens](https://www.nngroup.com/articles/skeleton-screens/)
- [victory-native releases](https://github.com/FormidableLabs/victory-native-xl/releases), [gifted-charts issue 789](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/789), [Skia bundle size](https://github.com/wcandillon/react-native-skia/blob/2.x/apps/docs/docs/getting-started/bundle-size.md)
- [MapLibre React Native 11](https://github.com/maplibre/maplibre-react-native/releases/tag/v11.0.0), [its Expo setup](https://github.com/maplibre/maplibre-react-native/blob/main/docs/content/setup/expo.md), [CARTO basemap keys](https://www.carto.com/basemaps/apikey/)
