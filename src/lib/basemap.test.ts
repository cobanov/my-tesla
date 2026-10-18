import { describe, expect, test } from "bun:test";
import { basemapKey, withBasemapKey } from "./basemap";

const key = "abc123_KEY-value";

describe("basemapKey", () => {
  test("reads a plausible key and ignores an empty or odd one", () => {
    expect(basemapKey({ CARTO_BASEMAPS_KEY: ` ${key} ` })).toBe(key);
    expect(basemapKey({})).toBeNull();
    expect(basemapKey({ CARTO_BASEMAPS_KEY: "short" })).toBeNull();
    expect(basemapKey({ CARTO_BASEMAPS_KEY: "has space in it" })).toBeNull();
  });
});

describe("withBasemapKey", () => {
  test("adds the key to every CARTO request and keeps other URLs", () => {
    expect(
      withBasemapKey(
        "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        key,
      ),
    ).toBe(
      `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json?key=${key}`,
    );
    expect(
      withBasemapKey(
        "https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/10/163/395.mvt?x=1",
        key,
      ),
    ).toBe(
      `https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/10/163/395.mvt?x=1&key=${key}`,
    );
    expect(withBasemapKey("https://example.com/tile.png", key)).toBe(
      "https://example.com/tile.png",
    );
    expect(withBasemapKey("https://evilcartocdn.com/a", key)).toBe(
      "https://evilcartocdn.com/a",
    );
    expect(withBasemapKey("/maplibre/worker.js", key)).toBe(
      "/maplibre/worker.js",
    );
    expect(
      withBasemapKey("https://basemaps.cartocdn.com/a?key=other", key),
    ).toBe("https://basemaps.cartocdn.com/a?key=other");
    expect(withBasemapKey("https://basemaps.cartocdn.com/a", null)).toBe(
      "https://basemaps.cartocdn.com/a",
    );
  });
});
