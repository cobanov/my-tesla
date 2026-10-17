import { describe, expect, test } from "bun:test";
import {
  hashPassword,
  passwordProblem,
  verifyNobody,
  verifyPassword,
} from "./password";

const sentence = "correct horse battery staple";

describe("passwords", () => {
  test("hash with Argon2id and a salt, and verify only the same password", async () => {
    const stored = await hashPassword(sentence);
    expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await hashPassword(sentence)).not.toBe(stored);
    expect(await verifyPassword(stored, sentence)).toBe(true);
    expect(await verifyPassword(stored, `${sentence}!`)).toBe(false);
    expect(await verifyPassword("plain", sentence)).toBe(false);
  });

  test("treat composed and decomposed letters as the same password", async () => {
    const stored = await hashPassword("café au lait every morning");
    expect(await verifyPassword(stored, "café au lait every morning")).toBe(
      true,
    );
  });

  test("ask for 15 characters at least, with no other rule", async () => {
    expect(passwordProblem("short")).toContain("15 characters");
    expect(passwordProblem(sentence)).toBeNull();
    expect(passwordProblem("x".repeat(257))).toContain("at most");
    expect(await verifyNobody(sentence)).toBe(false);
  });
});
