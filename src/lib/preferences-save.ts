import "server-only";
import { cookies } from "next/headers";
import { isDemoMode } from "./demo/mode";
import {
  preferencesCookieName,
  preferencesCookieOptions,
} from "./demo/preferences-cookie";
import type { Preferences } from "./preferences";
import { userPreferencesTag, writeUserPreferences } from "./preferences-store";
import { currentViewer } from "./viewer";

export async function storePreferences(
  preferences: Preferences | null,
  expire: (tag: string) => void,
): Promise<void> {
  if (isDemoMode()) {
    const jar = await cookies();
    if (preferences) {
      jar.set(
        preferencesCookieName,
        JSON.stringify(preferences),
        preferencesCookieOptions,
      );
    } else {
      jar.delete(preferencesCookieName);
    }
    return;
  }
  const viewer = await currentViewer();
  if (!viewer) throw new Error("Sign in to save the Settings.");
  await writeUserPreferences(viewer, preferences);
  expire(userPreferencesTag(viewer));
}
