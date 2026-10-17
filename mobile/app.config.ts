import type { ConfigContext, ExpoConfig } from "expo/config";

const variant =
  process.env.APP_VARIANT === "development" ? "development" : "production";
const development = variant === "development";
const identifier = development ? "bi.chele.mytesla.dev" : "bi.chele.mytesla";
const projectId = process.env.EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: development ? "My Tesla Dev" : "My Tesla",
  slug: "my-tesla",
  owner: process.env.EAS_OWNER,
  version: "0.1.0",
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
        image: "./assets/splash-icon.png",
        imageWidth: 88,
        backgroundColor: "#ffffff",
        dark: {
          image: "./assets/splash-icon-dark.png",
          backgroundColor: "#111215",
        },
      },
    ],
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#3e6ae1" },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: projectId ? { eas: { projectId } } : undefined,
});
