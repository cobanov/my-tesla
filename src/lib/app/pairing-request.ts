const textLimit = 60;

export type DeviceClaim = { code: string; name: string; platform: string };

function clean(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return text ? text.slice(0, textLimit) : fallback;
}

export function deviceClaim(body: unknown): DeviceClaim | null {
  if (!body || typeof body !== "object") return null;
  const { code, name, platform } = body as Record<string, unknown>;
  if (typeof code !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(code)) {
    return null;
  }
  const system = clean(platform, "phone").toLowerCase();
  return {
    code,
    name: clean(name, "A phone"),
    platform: ["ios", "android"].includes(system) ? system : "phone",
  };
}
