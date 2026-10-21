export type Connection = { url: string; token: string | null };

export function serverUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.hostname || parsed.username || parsed.password) return null;
  return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
}

const tokenPattern = /^[A-Za-z0-9_-]{20}\.[A-Za-z0-9_-]{43}$/;

export function parseConnection(stored: string | null): Connection | null {
  if (!stored) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== "object") return null;
    const { url, token } = value as Record<string, unknown>;
    const address = typeof url === "string" ? serverUrl(url) : null;
    if (!address) return null;
    return {
      url: address,
      token:
        typeof token === "string" && tokenPattern.test(token) ? token : null,
    };
  } catch {
    return null;
  }
}

export function authorization(connection: Connection): Record<string, string> {
  return connection.token
    ? { Authorization: `Bearer ${connection.token}` }
    : {};
}

export function isDeviceToken(value: unknown): value is string {
  return typeof value === "string" && tokenPattern.test(value);
}

export type Pairing = { url: string; code: string; carId: number | null };

const pairingPrefix = "mytesla://connect?";

export function pairingOf(text: string): Pairing | null {
  if (!text.startsWith(pairingPrefix)) return null;
  const params = new URLSearchParams(text.slice(pairingPrefix.length));
  const url = serverUrl(params.get("url") ?? "");
  const code = params.get("code") ?? "";
  if (!url || !/^[A-Za-z0-9_-]{43}$/.test(code)) return null;
  const car = params.get("car") ?? "";
  return { url, code, carId: /^\d{1,9}$/.test(car) ? Number(car) : null };
}
