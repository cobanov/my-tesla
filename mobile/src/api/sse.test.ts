import { describe, expect, test } from "bun:test";
import { readChanges } from "./sse";

describe("readChanges", () => {
  test("counts the complete change events and keeps the partial one", () => {
    expect(
      readChanges(
        "retry: 5000\n\nevent: change\ndata: 1\n\n: alive\n\nevent: change\nda",
      ),
    ).toEqual({ changes: 1, rest: "event: change\nda" });
  });

  test("reads CRLF lines and ignores other events", () => {
    expect(
      readChanges("event: change\r\ndata: 2\r\n\r\nevent: other\n\n"),
    ).toEqual({ changes: 1, rest: "" });
    expect(readChanges("")).toEqual({ changes: 0, rest: "" });
  });
});
