export function requestOrigin(headers: Headers): string | null {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const scheme = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return `${scheme === "https" ? "https" : "http"}://${host}`;
}

export function pairingLink(url: string, carId: number, code: string): string {
  const params = new URLSearchParams({ url, car: String(carId), code });
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
