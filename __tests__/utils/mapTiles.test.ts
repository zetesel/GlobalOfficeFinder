import { describe, it, expect } from "vitest";
import {
  OSM_TILE_URL,
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_OPTIONS,
} from "../../src/utils/mapTiles";

describe("mapTiles configuration", () => {
  it("uses standard OpenStreetMap tile URL template", () => {
    expect(OSM_TILE_URL).toBe(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
  });

  it("includes OpenStreetMap attribution", () => {
    expect(OSM_TILE_ATTRIBUTION).toContain("OpenStreetMap");
    expect(OSM_TILE_OPTIONS.attribution).toBe(OSM_TILE_ATTRIBUTION);
  });

  it("configures standard subdomains and maxZoom", () => {
    expect(OSM_TILE_OPTIONS.subdomains).toBe("abc");
    expect(OSM_TILE_OPTIONS.maxZoom).toBe(19);
  });
});
