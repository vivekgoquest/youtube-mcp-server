import { describe, it, expect } from "@jest/globals";
import { getEnrichmentParts } from "../../src/utils/search-enrichment.js";
import { globalConfig } from "../../src/config/global-config.js";
import {
  DEFAULT_VIDEO_PARTS,
  DEFAULT_CHANNEL_PARTS,
  DEFAULT_PLAYLIST_PARTS,
} from "../../src/config/constants.js";

describe("getEnrichmentParts", () => {
  describe("Constants validation", () => {
    it("should have constants match global config values", () => {
      expect(globalConfig.defaultVideoParts).toEqual(DEFAULT_VIDEO_PARTS);
      expect(globalConfig.defaultChannelParts).toEqual(DEFAULT_CHANNEL_PARTS);
      expect(globalConfig.defaultPlaylistParts).toEqual(DEFAULT_PLAYLIST_PARTS);
    });
  });

  describe("Step 1: No enrichment requested", () => {
    it("should return null when enrichParts is undefined", () => {
      expect(getEnrichmentParts(undefined, "video")).toBeNull();
      expect(getEnrichmentParts(undefined, "channel")).toBeNull();
      expect(getEnrichmentParts(undefined, "playlist")).toBeNull();
    });
  });

  describe("Step 2: Resource type not included", () => {
    it("should return null when resource type is not in enrichParts", () => {
      const enrichParts = { channel: ["snippet"] };
      expect(getEnrichmentParts(enrichParts, "video")).toBeNull();
      expect(getEnrichmentParts(enrichParts, "playlist")).toBeNull();
    });

    it("should handle multiple resource types correctly", () => {
      const enrichParts = {
        video: ["snippet"],
        channel: ["statistics"],
      };
      expect(getEnrichmentParts(enrichParts, "video")).toEqual(["snippet"]);
      expect(getEnrichmentParts(enrichParts, "channel")).toEqual([
        "statistics",
      ]);
      expect(getEnrichmentParts(enrichParts, "playlist")).toBeNull();
    });
  });

  describe("Step 3: Validation", () => {
    it("should throw error for invalid resource type", () => {
      const enrichParts = { video: ["snippet"] };
      expect(() => getEnrichmentParts(enrichParts, "invalid" as any)).toThrow(
        "Invalid resource type: invalid. Must be one of: video, channel, playlist",
      );
    });

    it("should throw error when parts is not an array", () => {
      const enrichParts = { video: "snippet" as any };
      expect(() => getEnrichmentParts(enrichParts, "video")).toThrow(
        "enrichParts.video must be an array",
      );
    });
  });

  describe("Step 4: Empty array handling", () => {
    it("should return default video parts for empty array", () => {
      const enrichParts = { video: [] };
      expect(getEnrichmentParts(enrichParts, "video")).toEqual(
        globalConfig.defaultVideoParts,
      );
    });

    it("should return default channel parts for empty array", () => {
      const enrichParts = { channel: [] };
      expect(getEnrichmentParts(enrichParts, "channel")).toEqual(
        globalConfig.defaultChannelParts,
      );
    });

    it("should return default playlist parts for empty array", () => {
      const enrichParts = { playlist: [] };
      expect(getEnrichmentParts(enrichParts, "playlist")).toEqual(
        globalConfig.defaultPlaylistParts,
      );
    });
  });

  describe("Step 5: Explicit parts provided", () => {
    it("should return specified video parts", () => {
      const enrichParts = { video: ["snippet", "statistics"] };
      expect(getEnrichmentParts(enrichParts, "video")).toEqual([
        "snippet",
        "statistics",
      ]);
    });

    it("should return specified channel parts", () => {
      const enrichParts = { channel: ["snippet", "brandingSettings"] };
      expect(getEnrichmentParts(enrichParts, "channel")).toEqual([
        "snippet",
        "brandingSettings",
      ]);
    });

    it("should return specified playlist parts", () => {
      const enrichParts = { playlist: ["snippet", "status"] };
      expect(getEnrichmentParts(enrichParts, "playlist")).toEqual([
        "snippet",
        "status",
      ]);
    });

    it("should throw error for invalid parts (non-string)", () => {
      const enrichParts = { video: ["snippet", 123 as any] };
      expect(() => getEnrichmentParts(enrichParts, "video")).toThrow(
        "All parts must be non-empty strings",
      );
    });

    it("should throw error for empty string parts", () => {
      const enrichParts = { video: ["snippet", ""] };
      expect(() => getEnrichmentParts(enrichParts, "video")).toThrow(
        "All parts must be non-empty strings",
      );
    });

    it("should throw error for whitespace-only parts", () => {
      const enrichParts = { video: ["snippet", "   "] };
      expect(() => getEnrichmentParts(enrichParts, "video")).toThrow(
        "All parts must be non-empty strings",
      );
    });
  });

  describe("Complex scenarios", () => {
    it("should handle mixed resource types with various configurations", () => {
      const enrichParts = {
        video: ["snippet", "statistics"],
        channel: [], // Empty array - use defaults
        // playlist is omitted - won't be enriched
      };

      expect(getEnrichmentParts(enrichParts, "video")).toEqual([
        "snippet",
        "statistics",
      ]);
      expect(getEnrichmentParts(enrichParts, "channel")).toEqual(
        globalConfig.defaultChannelParts,
      );
      expect(getEnrichmentParts(enrichParts, "playlist")).toBeNull();
    });
  });
});
