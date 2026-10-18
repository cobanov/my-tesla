import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { appJson, readJsonBody } from "@/lib/app/request";
import { basemapKey } from "@/lib/basemap";
import { applySetting, settingsPage } from "@/lib/app/settings";
import type { Preferences } from "@/lib/preferences";
import { storePreferences } from "@/lib/preferences-save";
import { readTimeZone } from "@/lib/time-zone";
import { baseline, getPreferences } from "@/lib/viewer";
import { apiUnauthorized } from "@/lib/auth/session";

function page(preferences: Preferences): Response {
  return appJson({
    ...settingsPage(
      preferences,
      Intl.supportedValuesOf("timeZone"),
      readTimeZone(process.env),
    ),
    basemapKey: basemapKey(process.env),
  });
}

export async function GET() {
  await connection();
  const denied = await apiUnauthorized();
  if (denied) return denied;
  return page(await getPreferences());
}

export async function PUT(request: Request) {
  const denied = await apiUnauthorized();
  if (denied) return denied;
  const body = await readJsonBody(request);
  const { key, value } = (body ?? {}) as { key?: unknown; value?: unknown };
  if (typeof key !== "string") {
    return appJson({ error: "Send a JSON body with a key and a value." }, 400);
  }
  const [current, base] = await Promise.all([getPreferences(), baseline()]);
  const next = applySetting(current, { key, value }, base);
  if (!next) {
    return appJson({ error: "The server does not know this value." }, 400);
  }
  try {
    await storePreferences(next, (tag) => revalidateTag(tag, { expire: 0 }));
  } catch {
    return appJson({ error: "The server did not save the settings." }, 500);
  }
  return page(next);
}
