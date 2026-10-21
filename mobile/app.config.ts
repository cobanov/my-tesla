import type { ConfigContext, ExpoConfig } from "expo/config";

const variant =
  process.env.APP_VARIANT === "development" ? "development" : "production";
const development = variant === "development";
const identifier = development ? "bi.chele.mytesla.dev" : "bi.chele.mytesla";
const projectId =
  process.env.EAS_PROJECT_ID ?? "37562718-8edd-45f9-9936-cac5d6900f30";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: development ? "My Tesla Dev" : "My Tesla",
  slug: "my-tesla",
  owner: process.env.EAS_OWNER ?? "woosal",
  version: "1.0.0",
  scheme: development ? "mytesla-dev" : "mytesla",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  backgroundColor: "#111215",
  ios: {
    bundleIdentifier: identifier,
    supportsTablet: true,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: identifier,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      monochromeImage: "./assets/monochrome-icon.png",
      backgroundColor: "#0a0b0d",
    },
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#111215",
      },
    ],
    "@maplibre/maplibre-react-native",
    [
      "expo-camera",
      {
        cameraPermission:
          "My Tesla scans the code in Settings on the web to connect to your server.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#3e6ae1" },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: { eas: { projectId } },
});
