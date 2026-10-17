import { describe, expect, test } from "bun:test";
import { appAccessToken, pairingLink, qrPath, requestOrigin } from "./pairing";

describe("appAccessToken", () => {
  test("needs both values or none", () => {
    expect(appAccessToken({})).toBeNull();
    expect(
      appAccessToken({
        MOBILE_ACCESS_CLIENT_ID: " id.access ",
        MOBILE_ACCESS_CLIENT_SECRET: "secret",
      }),
    ).toEqual({ clientId: "id.access", clientSecret: "secret" });
    expect(() => appAccessToken({ MOBILE_ACCESS_CLIENT_ID: "id" })).toThrow(
      "Set both",
    );
  });
});

describe("requestOrigin", () => {
  test("uses the forwarded host and scheme of the proxy", () => {
    expect(
      requestOrigin(
        new Headers({
          host: "app:3000",
          "x-forwarded-host": "tesla.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://tesla.example.com");
    expect(requestOrigin(new Headers({ host: "192.168.1.20:3000" }))).toBe(
      "http://192.168.1.20:3000",
    );
    expect(requestOrigin(new Headers({ host: "evil.com/path" }))).toBeNull();
  });
});

describe("pairingLink", () => {
  test("adds the service token only when the server has one", () => {
    expect(pairingLink("https://tesla.example.com", 2, null)).toBe(
      "mytesla://connect?url=https%3A%2F%2Ftesla.example.com&car=2",
    );
    expect(
      pairingLink("https://tesla.example.com", 2, {
        clientId: "id.access",
        clientSecret: "a+b/c",
      }),
    ).toBe(
      "mytesla://connect?url=https%3A%2F%2Ftesla.example.com&car=2&id=id.access&secret=a%2Bb%2Fc",
    );
  });
});

describe("qrPath", () => {
  test("draws one rectangle for each run of dark modules", () => {
    expect(
      qrPath([
        [true, true, false],
        [false, true, true],
      ]),
    ).toBe("M0 0h2v1h-2zM1 1h2v1h-2z");
  });
});
