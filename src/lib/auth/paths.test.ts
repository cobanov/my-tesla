import { describe, expect, test } from "bun:test";
import {
  authDatabasePath,
  bearerToken,
  isCalendarFeed,
  isPublicPath,
  safeNext,
  sameSiteWrite,
  trustedAddress,
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
  test("opens only sign-in, setup, invites, resets, pairing, and the icons", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/invite")).toBe(true);
    expect(isPublicPath("/reset")).toBe(true);
    expect(isPublicPath("/account")).toBe(false);
    expect(isPublicPath("/api/app/pair")).toBe(true);
    expect(isPublicPath("/icon.svg")).toBe(true);
    expect(isPublicPath("/cars/rika")).toBe(false);
    expect(isPublicPath("/api/cars.json")).toBe(false);
    expect(isPublicPath("/login/x")).toBe(false);
  });
});

describe("isCalendarFeed", () => {
  test("matches only the calendar file of one car", () => {
    expect(isCalendarFeed("/api/cars/2/calendar.ics")).toBe(true);
    expect(isCalendarFeed("/api/cars/2/drives.csv")).toBe(false);
    expect(isCalendarFeed("/api/cars/x/calendar.ics")).toBe(false);
    expect(isCalendarFeed("/api/cars/2/calendar.ics/x")).toBe(false);
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

describe("trustedAddress", () => {
  test("reads only the header that the operator names", () => {
    const list = new Headers({
      "cf-connecting-ip": "203.0.113.5",
      "x-forwarded-for": "198.51.100.9, 192.0.2.1",
    });
    expect(trustedAddress(list, undefined)).toBeNull();
    expect(trustedAddress(list, "CF-Connecting-IP")).toBe("203.0.113.5");
    expect(trustedAddress(list, "x-forwarded-for")).toBe("192.0.2.1");
    expect(trustedAddress(list, "x-real-ip")).toBeNull();
  });

  test("refuses a value that is not an address", () => {
    expect(
      trustedAddress(
        new Headers({ "x-real-ip": "a".repeat(100) }),
        "x-real-ip",
      ),
    ).toBeNull();
    expect(
      trustedAddress(new Headers({ "x-real-ip": "<script>" }), "x-real-ip"),
    ).toBeNull();
    expect(
      trustedAddress(new Headers({ "x-real-ip": "2001:db8::1" }), "x-real-ip"),
    ).toBe("2001:db8::1");
  });
});
