import { describe, expect, test } from "bun:test";
import {
  authorization,
  isDeviceToken,
  pairingOf,
  pairingOfLink,
  parseConnection,
  serverUrl,
} from "./server";

const token = `${"a".repeat(20)}.${"b".repeat(43)}`;
const code = "c".repeat(43);

describe("serverUrl", () => {
  test("adds https and drops the trailing slash", () => {
    expect(serverUrl(" tesla.example.com/ ")).toBe("https://tesla.example.com");
    expect(serverUrl("http://192.168.1.20:3000")).toBe(
      "http://192.168.1.20:3000",
    );
    expect(serverUrl("https://example.com/tesla/")).toBe(
      "https://example.com/tesla",
    );
  });

  test("refuses other schemes and a user in the address", () => {
    expect(serverUrl("ftp://example.com")).toBeNull();
    expect(serverUrl("https://user:secret@example.com")).toBeNull();
    expect(serverUrl("")).toBeNull();
  });
});

describe("parseConnection", () => {
  test("reads a stored address and token and drops a broken token", () => {
    expect(
      parseConnection(JSON.stringify({ url: "https://example.com", token })),
    ).toEqual({ url: "https://example.com", token });
    expect(
      parseConnection(
        JSON.stringify({ url: "https://example.com", clientId: "old" }),
      ),
    ).toEqual({ url: "https://example.com", token: null });
    expect(parseConnection("{")).toBeNull();
    expect(parseConnection(null)).toBeNull();
  });
});

describe("authorization", () => {
  test("sends the phone token as a bearer header", () => {
    expect(authorization({ url: "https://example.com", token })).toEqual({
      Authorization: `Bearer ${token}`,
    });
    expect(authorization({ url: "https://example.com", token: null })).toEqual(
      {},
    );
    expect(isDeviceToken(token)).toBe(true);
    expect(isDeviceToken("nope")).toBe(false);
  });
});

describe("pairingOf", () => {
  test("reads the code from Settings on the web", () => {
    expect(
      pairingOf(
        `mytesla://connect?url=https%3A%2F%2Ftesla.example.com&car=2&code=${code}`,
      ),
    ).toEqual({ url: "https://tesla.example.com", code, carId: 2 });
    expect(
      pairingOf(
        `mytesla://connect?url=http%3A%2F%2F192.168.1.20%3A3000&code=${code}`,
      ),
    ).toEqual({ url: "http://192.168.1.20:3000", code, carId: null });
  });

  test("refuses another code, a missing address, and a short code", () => {
    expect(pairingOf("https://tesla.example.com")).toBeNull();
    expect(pairingOf(`mytesla://connect?code=${code}`)).toBeNull();
    expect(
      pairingOf("mytesla://connect?url=tesla.example.com&code=short"),
    ).toBeNull();
  });
});

describe("pairingOfLink", () => {
  test("reads the parameters of a camera link and refuses lists", () => {
    expect(
      pairingOfLink({ url: "https://tesla.example.com", car: "2", code }),
    ).toEqual({ url: "https://tesla.example.com", code, carId: 2 });
    expect(pairingOfLink({ url: ["a", "b"], code })).toBeNull();
    expect(pairingOfLink({})).toBeNull();
  });
});
