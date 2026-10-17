import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { teslaMarkPath } from "./mark";

const webLogo = readFileSync(
  path.join(import.meta.dir, "../../../src/lib/logo.ts"),
  "utf8",
);

describe("teslaMarkPath", () => {
  test("matches the mark of the web dashboard", () => {
    expect(webLogo).toContain(`"${teslaMarkPath}"`);
  });
});
