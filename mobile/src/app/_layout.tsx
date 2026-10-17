import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, useColorScheme } from "react-native";
import {
  ConnectionProvider,
  useConnectionState,
} from "@/connection/connection-provider";
import { useStackOptions } from "@/navigation/header";
import { fonts } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function useAppFocus(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) =>
      focusManager.setFocused(status === "active"),
    );
    return () => subscription.remove();
  }, []);
}

function useNavigationTheme() {
  const palette = usePalette();
  const base = useColorScheme() === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.background,
      text: palette.foreground,
      border: palette.border,
    },
    fonts: {
      regular: { fontFamily: fonts.regular, fontWeight: "400" as const },
      medium: { fontFamily: fonts.medium, fontWeight: "500" as const },
      bold: { fontFamily: fonts.medium, fontWeight: "500" as const },
      heavy: { fontFamily: fonts.medium, fontWeight: "500" as const },
    },
  };
}

function Navigator({ fontsReady }: { fontsReady: boolean }) {
  const { loaded, connection } = useConnectionState();
  const theme = useNavigationTheme();
  const stackOptions = useStackOptions();
  const ready = fontsReady && loaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ ...stackOptions, headerShown: false }}>
        <Stack.Protected guard={connection !== null}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Settings",
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={connection === null}>
          <Stack.Screen name="connect" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
      }),
  );
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  });
  useAppFocus();
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider>
        <Navigator fontsReady={fontsLoaded || fontError !== null} />
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
