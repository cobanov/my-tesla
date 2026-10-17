type Environment = Record<string, string | undefined>;

export type AccessToken = { clientId: string; clientSecret: string };

class AccessTokenError extends Error {
  name = "AccessTokenError";
}

export function appAccessToken(environment: Environment): AccessToken | null {
  const clientId = environment.MOBILE_ACCESS_CLIENT_ID?.trim() ?? "";
  const clientSecret = environment.MOBILE_ACCESS_CLIENT_SECRET?.trim() ?? "";
  if (!clientId && !clientSecret) return null;
  if (!clientId || !clientSecret) {
    throw new AccessTokenError(
      "Set both MOBILE_ACCESS_CLIENT_ID and MOBILE_ACCESS_CLIENT_SECRET, or neither.",
    );
  }
  return { clientId, clientSecret };
}

export function requestOrigin(headers: Headers): string | null {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const scheme = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return `${scheme === "https" ? "https" : "http"}://${host}`;
}

export function pairingLink(
  url: string,
  carId: number,
  token: AccessToken | null,
): string {
  const params = new URLSearchParams({ url, car: String(carId) });
  if (token) {
    params.set("id", token.clientId);
    params.set("secret", token.clientSecret);
  }
  return `mytesla://connect?${params}`;
}

export function qrPath(modules: boolean[][]): string {
  const parts: string[] = [];
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (row[x]) x += 1;
      parts.push(`M${start} ${y}h${x - start}v1h-${x - start}z`);
    }
  });
  return parts.join("");
}
