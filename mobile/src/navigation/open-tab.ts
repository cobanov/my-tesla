import { useNavigation, useRouter, type Href } from "expo-router";

export function useOpenTab(): (href: Href) => void {
  const router = useRouter();
  const tabs = useNavigation("/(tabs)");
  return (href) => {
    const tab = tabs
      .getState()
      ?.routes.find((route) => `/${route.name}` === href);
    router.navigate(href);
    if ((tab?.state?.routes.length ?? 0) > 1) router.dismissAll();
  };
}
