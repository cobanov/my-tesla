"use server";

import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { encode } from "uqr";
import {
  appAccessToken,
  pairingLink,
  qrPath,
  requestOrigin,
} from "@/lib/app/pairing";
import { isDemoMode } from "@/lib/demo/mode";
import { parsePreferences } from "@/lib/preferences";
import { storePreferences } from "@/lib/preferences-save";
import { findCar } from "@/lib/queries";
import { siteUrl } from "@/lib/site";
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

export type PairingCode =
  | { ok: true; path: string; size: number; url: string; token: boolean }
  | { ok: false; message: string };

export async function pairingCode(carId: unknown): Promise<PairingCode> {
  const car =
    typeof carId === "number" && Number.isInteger(carId)
      ? await findCar(carId)
      : null;
  if (!car) return { ok: false, message: "The server does not know this car." };
  try {
    const url =
      siteUrl(process.env)?.href.replace(/\/$/, "") ??
      requestOrigin(await headers());
    if (!url) {
      return { ok: false, message: "Set SITE_URL to the public address." };
    }
    const token = isDemoMode() ? null : appAccessToken(process.env);
    const { data, size } = encode(pairingLink(url, car.id, token), {
      ecc: "M",
      border: 0,
    });
    return { ok: true, path: qrPath(data), size, url, token: token !== null };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "The server made no code.",
    };
  }
}
