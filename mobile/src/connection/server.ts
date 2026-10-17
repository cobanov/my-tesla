export type Connection = {
  url: string;
  clientId: string | null;
  clientSecret: string | null;
};

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

function optional(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function connectionOf(input: {
  url: string;
  clientId?: string;
  clientSecret?: string;
}): Connection | null {
  const url = serverUrl(input.url);
  const clientId = optional(input.clientId);
  const clientSecret = optional(input.clientSecret);
  if (!url || Boolean(clientId) !== Boolean(clientSecret)) return null;
  return { url, clientId, clientSecret };
}

export function parseConnection(stored: string | null): Connection | null {
  if (!stored) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== "object") return null;
    const { url, clientId, clientSecret } = value as Record<string, unknown>;
    return typeof url === "string"
      ? connectionOf({
          url,
          clientId: optional(clientId) ?? undefined,
          clientSecret: optional(clientSecret) ?? undefined,
        })
      : null;
  } catch {
    return null;
  }
}

export function accessHeaders(connection: Connection): Record<string, string> {
  return connection.clientId && connection.clientSecret
    ? {
        "CF-Access-Client-Id": connection.clientId,
        "CF-Access-Client-Secret": connection.clientSecret,
      }
    : {};
}
