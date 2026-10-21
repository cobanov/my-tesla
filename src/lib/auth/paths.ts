import { dataFile } from "../data-file";

type Environment = Record<string, string | undefined>;

export function authDatabasePath(environment: Environment): string {
  return (
    environment.AUTH_DATABASE_FILE?.trim() ||
    dataFile(environment, "auth.sqlite")
  );
}

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "/";
  return value;
}

export function bearerToken(header: string | null): string | null {
  const match = /^Bearer ([A-Za-z0-9_.-]{1,128})$/.exec(header ?? "");
  return match?.[1] ?? null;
}

export function isPublicPath(path: string): boolean {
  return (
    path === "/login" ||
    path === "/setup" ||
    path === "/invite" ||
    path === "/reset" ||
    path === "/api/app/pair" ||
    path === "/api/app/pair/status" ||
    path === "/manifest.webmanifest" ||
    path === "/robots.txt" ||
    /^\/(favicon\.ico|icon\.svg|apple-icon\.png)$/.test(path)
  );
}

export function isCalendarFeed(path: string): boolean {
  return /^\/api\/cars\/\d{1,9}\/calendar\.ics$/.test(path);
}

export function sameSiteWrite(headers: Headers, host: string): boolean {
  const site = headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const addressPattern = /^[0-9A-Fa-f:.]{2,45}$/;

export function trustedAddress(
  list: { get(name: string): string | null },
  header: string | undefined,
): string | null {
  const name = header?.trim().toLowerCase();
  if (!name) return null;
  const raw = list.get(name);
  if (!raw) return null;
  const value =
    name === "x-forwarded-for" ? raw.split(",").at(-1)?.trim() : raw.trim();
  return value && addressPattern.test(value) ? value : null;
}
