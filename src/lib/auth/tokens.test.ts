import { describe, expect, test } from "bun:test";
import {
  hashSecret,
  joinToken,
  newId,
  newSecret,
  sameHash,
  splitToken,
} from "./tokens";

describe("tokens", () => {
  test("join an id and a 256-bit secret, and split them again", () => {
    const id = newId();
    const secret = newSecret();
    expect(id).toHaveLength(20);
    expect(Buffer.from(secret, "base64url")).toHaveLength(32);
    expect(splitToken(joinToken(id, secret))).toEqual({ id, secret });
    expect(newSecret()).not.toBe(secret);
  });

  test("refuse a token of another shape", () => {
    expect(splitToken(null)).toBeNull();
    expect(splitToken("abc")).toBeNull();
    expect(splitToken(`${newId()}.${newSecret()}.x`)).toBeNull();
    expect(splitToken(`${newId()}.short`)).toBeNull();
  });

  test("compare hashes in constant time", () => {
    const secret = newSecret();
    expect(sameHash(hashSecret(secret), hashSecret(secret))).toBe(true);
    expect(sameHash(hashSecret(secret), hashSecret(newSecret()))).toBe(false);
    expect(sameHash(hashSecret(secret), new Uint8Array(4))).toBe(false);
  });
});
