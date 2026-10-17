import { describe, expect, test } from "bun:test";
import {
  accessHeaders,
  connectionOf,
  parseConnection,
  serverUrl,
} from "./server";

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

describe("connectionOf", () => {
  test("needs both service token values or none", () => {
    expect(connectionOf({ url: "example.com", clientId: "id" })).toBeNull();
    expect(
      connectionOf({
        url: "example.com",
        clientId: "id",
        clientSecret: "secret",
      }),
    ).toEqual({
      url: "https://example.com",
      clientId: "id",
      clientSecret: "secret",
    });
  });
});

describe("parseConnection", () => {
  test("reads a stored connection and ignores a broken one", () => {
    expect(parseConnection('{"url":"https://example.com"}')).toEqual({
      url: "https://example.com",
      clientId: null,
      clientSecret: null,
    });
    expect(parseConnection("{")).toBeNull();
    expect(parseConnection(null)).toBeNull();
  });
});

describe("accessHeaders", () => {
  test("sends the Cloudflare Access service token", () => {
    expect(
      accessHeaders({
        url: "https://example.com",
        clientId: "id",
        clientSecret: "secret",
      }),
    ).toEqual({
      "CF-Access-Client-Id": "id",
      "CF-Access-Client-Secret": "secret",
    });
    expect(
      accessHeaders({
        url: "https://example.com",
        clientId: null,
        clientSecret: null,
      }),
    ).toEqual({});
  });
});
