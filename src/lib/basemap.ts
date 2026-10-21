type Environment = Record<string, string | undefined>;

const keyPattern = /^[A-Za-z0-9._~-]{8,256}$/;

export function basemapKey(environment: Environment): string | null {
  const key = environment.CARTO_BASEMAPS_KEY?.trim() ?? "";
  return keyPattern.test(key) ? key : null;
}

export function withBasemapKey(url: string, key: string | null): string {
  if (!key) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const carto =
    parsed.protocol === "https:" &&
    (parsed.hostname === "cartocdn.com" ||
      parsed.hostname.endsWith(".cartocdn.com"));
  if (!carto || parsed.searchParams.has("key")) return url;
  parsed.searchParams.set("key", key);
  return parsed.toString();
}
