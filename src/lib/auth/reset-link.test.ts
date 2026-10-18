import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { passwordResetLink, serverOrigin } from "./reset-link";
import { AuthStore } from "./store";

const t0 = Date.UTC(2026, 9, 18, 12);
let store: AuthStore;

beforeEach(() => {
  store = new AuthStore(":memory:");
});

afterEach(() => store.close());

describe("passwordResetLink", () => {
  test("prints a working link on the public address for a known email", () => {
    const owner = store.createFirstAdmin(
      { email: "owner@example.com", name: "Owner", passwordHash: "hash" },
      t0,
    );
    const result = passwordResetLink(
      store,
      " Owner@Example.com ",
      { SITE_URL: "https://tesla.example.com" },
      t0,
    );
    expect(result.ok).toBe(true);
    const token = /reset\?token=([A-Za-z0-9_-]{43}) /.exec(result.message)?.[1];
    expect(result.message).toStartWith(
      "Open https://tesla.example.com/reset?token=",
    );
    expect(store.passwordResetUser(token ?? "", t0)?.id).toBe(owner?.id ?? "");
  });

  test("lists the accounts for an unknown or missing email", () => {
    store.createFirstAdmin(
      { email: "owner@example.com", name: "Owner", passwordHash: "hash" },
      t0,
    );
    expect(passwordResetLink(store, "who@example.com", {}, t0)).toEqual({
      ok: false,
      message:
        "No account has the email who@example.com. The accounts are: owner@example.com.",
    });
    expect(passwordResetLink(store, "", {}, t0).message).toContain(
      "node reset-password.mjs EMAIL",
    );
  });

  test("points to the setup before any account exists", () => {
    expect(passwordResetLink(store, "a@example.com", {}, t0).ok).toBe(false);
  });
});

describe("serverOrigin", () => {
  test("uses SITE_URL, or localhost on the port", () => {
    expect(serverOrigin({ SITE_URL: "tesla.example.com/" }).href).toBe(
      "https://tesla.example.com/",
    );
    expect(serverOrigin({ PORT: "3920" }).href).toBe("http://localhost:3920/");
  });
});
