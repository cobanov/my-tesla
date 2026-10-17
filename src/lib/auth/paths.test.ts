import { describe, expect, test } from "bun:test";
import {
  authDatabasePath,
  bearerToken,
  isPublicPath,
  safeNext,
  sameSiteWrite,
} from "./paths";

describe("authDatabasePath", () => {
  test("sits next to the Settings file unless set", () => {
    expect(
      authDatabasePath({ PREFERENCES_FILE: "/data/preferences.json" }),
    ).toBe("/data/auth.sqlite");
    expect(authDatabasePath({ AUTH_DATABASE_FILE: " /srv/a.sqlite " })).toBe(
      "/srv/a.sqlite",
    );
  });
});

describe("safeNext", () => {
  test("keeps a path on this site and refuses any other address", () => {
    expect(safeNext("/cars/rika?x=1")).toBe("/cars/rika?x=1");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});

describe("bearerToken", () => {
  test("reads one bearer token and nothing else", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("isPublicPath", () => {
  test("opens only sign-in, setup, pairing, and the icons", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/app/pair")).toBe(true);
    expect(isPublicPath("/icon.svg")).toBe(true);
    expect(isPublicPath("/cars/rika")).toBe(false);
    expect(isPublicPath("/api/cars.json")).toBe(false);
    expect(isPublicPath("/login/x")).toBe(false);
  });
});

describe("sameSiteWrite", () => {
  test("trusts Sec-Fetch-Site, then the Origin, and refuses neither", () => {
    expect(
      sameSiteWrite(new Headers({ "sec-fetch-site": "same-origin" }), "a.b"),
    ).toBe(true);
    expect(
      sameSiteWrite(new Headers({ "sec-fetch-site": "cross-site" }), "a.b"),
    ).toBe(false);
    expect(sameSiteWrite(new Headers({ origin: "https://a.b" }), "a.b")).toBe(
      true,
    );
    expect(sameSiteWrite(new Headers({ origin: "https://c.d" }), "a.b")).toBe(
      false,
    );
    expect(sameSiteWrite(new Headers(), "a.b")).toBe(false);
  });
});
