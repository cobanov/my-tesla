import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { palettes } from "./palette";

const webTheme = readFileSync(
  path.join(import.meta.dir, "../../../src/app/globals.css"),
  "utf8",
);

function webColor(name: string): { light: string; dark: string } {
  const token = name
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/(\d+)$/, "-$1");
  const value = new RegExp(`--${token}:\\s*([^;]+);`).exec(webTheme)?.[1];
  if (!value) throw new Error(`globals.css has no --${token}`);
  const pair = /^light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)$/i.exec(value);
  return pair
    ? { light: pair[1]!, dark: pair[2]! }
    : { light: value, dark: value };
}

describe("palettes", () => {
  test("match the color tokens of the web dashboard", () => {
    for (const name of Object.keys(palettes.light)) {
      const key = name as keyof typeof palettes.light;
      const colors: { light: string; dark: string } = {
        light: palettes.light[key],
        dark: palettes.dark[key],
      };
      expect(colors).toEqual(webColor(name));
    }
  });
});
