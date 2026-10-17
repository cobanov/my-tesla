"use server";

import { refresh, updateTag } from "next/cache";
import { isDemoMode } from "@/lib/demo/mode";
import { parsePreferences } from "@/lib/preferences";
import { storePreferences } from "@/lib/preferences-save";
import { baseline, getPreferences } from "@/lib/viewer";

export type SaveResult = { ok: true } | { ok: false; message: string };

export async function savePreferences(input: unknown): Promise<SaveResult> {
  try {
    await storePreferences(
      parsePreferences(input, await baseline()),
      updateTag,
    );
    if (isDemoMode()) refresh();
    return { ok: true };
  } catch {
    return { ok: false, message: "The server did not save the settings." };
  }
}

export async function saveTheme(theme: unknown): Promise<SaveResult> {
  if (theme !== "light" && theme !== "dark") {
    return { ok: false, message: "Choose the light or the dark theme." };
  }
  return savePreferences({ ...(await getPreferences()), theme });
}

export async function resetPreferences(): Promise<SaveResult> {
  try {
    await storePreferences(null, updateTag);
    if (isDemoMode()) refresh();
    return { ok: true };
  } catch {
    return { ok: false, message: "The server did not reset the settings." };
  }
}
