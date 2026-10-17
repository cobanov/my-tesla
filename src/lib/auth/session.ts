import "server-only";
import { mkdirSync } from "node:fs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { dirname } from "node:path";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { isDemoMode } from "../demo/mode";
import { authDatabasePath, bearerToken } from "./paths";
import { Backoff, DailyCap } from "./limits";
import { AuthStore, lifetimes, type Session, type User } from "./store";

export const cookieNames = {
  secure: "__Host-mytesla-session",
  plain: "mytesla-session",
} as const;

function shared<T>(name: string, create: () => T): T {
  const registry = globalThis as unknown as Record<symbol, T | undefined>;
  const key = Symbol.for(`my-tesla.${name}`);
  registry[key] ??= create();
  return registry[key];
}

export function authStore(): AuthStore {
  return shared("auth-store", () => {
    const path = authDatabasePath(process.env);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const previous = process.umask(0o077);
    try {
      return new AuthStore(path);
    } finally {
      process.umask(previous);
    }
  });
}

export const limits = {
  account: () => shared("limit-account", () => new Backoff()),
  address: () => shared("limit-address", () => new DailyCap(100)),
};

export type SignedIn = { session: Session; user: User };

export function readSession(
  list: { get(name: string): string | null },
  cookieValue: (name: string) => string | undefined,
  now: number,
): SignedIn | null {
  const bearer = bearerToken(list.get("authorization"));
  if (bearer) return authStore().validate(bearer, "device", now);
  const token =
    cookieValue(cookieNames.secure) ?? cookieValue(cookieNames.plain);
  return token ? authStore().validate(token, "web", now) : null;
}

export const currentSession = cache(async (): Promise<SignedIn | null> => {
  if (isDemoMode()) return null;
  const [list, jar] = await Promise.all([headers(), cookies()]);
  return readSession(list, (name) => jar.get(name)?.value, Date.now());
});

export function isSecureRequest(list: { get(name: string): string | null }) {
  const scheme = list.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return scheme === "https";
}

export async function setSessionCookie(token: string): Promise<void> {
  const [jar, list] = await Promise.all([cookies(), headers()]);
  const secure = isSecureRequest(list);
  jar.set(secure ? cookieNames.secure : cookieNames.plain, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: lifetimes.web / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieNames.secure);
  jar.delete(cookieNames.plain);
}

export function clientAddress(list: { get(name: string): string | null }) {
  return (
    list.get("cf-connecting-ip") ??
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    list.get("x-real-ip") ??
    null
  );
}

const setup = () =>
  shared("setup-token", () => ({
    token: randomBytes(24).toString("base64url"),
  }));

export function setupToken(): string {
  return setup().token;
}

export function isSetupToken(candidate: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(setupToken()));
}
