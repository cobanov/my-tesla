import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const idPattern = /^[A-Za-z0-9_-]{20}$/;
const secretPattern = /^[A-Za-z0-9_-]{43}$/;

export function newId(): string {
  return randomBytes(15).toString("base64url");
}

export function newSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function sameHash(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function joinToken(id: string, secret: string): string {
  return `${id}.${secret}`;
}

export function splitToken(
  token: string | null | undefined,
): { id: string; secret: string } | null {
  const [id, secret, extra] = (token ?? "").split(".");
  if (extra !== undefined || !id || !secret) return null;
  return idPattern.test(id) && secretPattern.test(secret)
    ? { id, secret }
    : null;
}
