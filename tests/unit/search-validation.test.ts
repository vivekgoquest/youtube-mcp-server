import { describe, it, expect, jest } from "@jest/globals";
import { validateEnrichmentParts } from "../../src/utils/search-validation.js";
import type { UnifiedSearchParams } from "../../src/types.js";

describe("validateEnrichmentParts", () => {
  describe("valid cases", () => {
    it("should accept undefined enrichParts", () => {
      expect(() => validateEnrichmentParts(undefined)).not.toThrow();
    });

    it("should accept valid video parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        video: ["snippet", "statistics", "contentDetails"],
      };
      expect(() => validateEnrichmentParts(enrichParts)).not.toThrow();
    });

    it("should accept valid channel parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        channel: ["snippet", "statistics", "brandingSettings"],
      };
      expect(() => validateEnrichmentParts(enrichParts)).not.toThrow();
    });

    it("should accept valid playlist parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        playlist: ["snippet", "contentDetails", "status"],
      };
      expect(() => validateEnrichmentParts(enrichParts)).not.toThrow();
    });

    it("should accept multiple resource types with valid parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        video: ["snippet", "statistics"],
        channel: ["snippet", "statistics"],
        playlist: ["snippet", "status"],
      };
      expect(() => validateEnrichmentParts(enrichParts)).not.toThrow();
    });
  });

  describe("structure validation", () => {
    it("should reject non-object enrichParts", () => {
      expect(() => validateEnrichmentParts("invalid" as any)).toThrow(
        "enrichParts must be an object",
      );
      expect(() => validateEnrichmentParts(123 as any)).toThrow(
        "enrichParts must be an object",
      );
      expect(() => validateEnrichmentParts(true as any)).toThrow(
        "enrichParts must be an object",
      );
    });

    it("should reject null enrichParts", () => {
      expect(() => validateEnrichmentParts(null as any)).toThrow(
        "enrichParts must be an object",
      );
    });

    it("should reject array enrichParts", () => {
      expect(() => validateEnrichmentParts([] as any)).toThrow(
        "enrichParts must be an object",
      );
    });

    it("should reject invalid keys in enrichParts", () => {
      const enrichParts = {
        video: ["snippet"],
        invalidKey: ["something"],
      } as any;
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "Invalid enrichParts keys: invalidKey. Valid keys are: video, channel, playlist",
      );
    });

    it("should reject empty enrichParts object", () => {
      expect(() => validateEnrichmentParts({})).toThrow(
        "enrichParts must contain at least one resource type with parts",
      );
    });
  });

  describe("resource type consistency", () => {
    it("should allow matching resource type and enrichParts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        video: ["snippet", "statistics"],
      };
      expect(() => validateEnrichmentParts(enrichParts, "video")).not.toThrow();
    });

    it("should not throw for mismatched resource type and enrichParts (now allows flexible enrichment)", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        channel: ["snippet"],
        playlist: ["snippet"],
      };
      // Should not throw anymore - just logs a warning
      expect(() => validateEnrichmentParts(enrichParts, "video")).not.toThrow();
    });

    it("should not throw when searching for videos but providing channel parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        channel: ["snippet"],
      };
      // Should not throw anymore - just logs a warning
      expect(() => validateEnrichmentParts(enrichParts, "video")).not.toThrow();
    });

    it("should log warning when mismatched resource type and enrichParts are provided", () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        channel: ["snippet"],
        playlist: ["snippet"],
      };

      validateEnrichmentParts(enrichParts, "video");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Note: When searching for video, you've also provided enrichment parts for: channel, playlist",
        ),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("array validation", () => {
    it("should reject non-array video parts", () => {
      const enrichParts = {
        video: "snippet",
      } as any;
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "enrichParts.video must be an array",
      );
    });

    it("should reject non-array channel parts", () => {
      const enrichParts = {
        channel: { part: "snippet" },
      } as any;
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "enrichParts.channel must be an array",
      );
    });

    it("should reject non-array playlist parts", () => {
      const enrichParts = {
        playlist: true,
      } as any;
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "enrichParts.playlist must be an array",
      );
    });
  });

  describe("empty array handling", () => {
    it("should reject empty video parts array", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        video: [],
      };
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "enrichParts.video cannot be empty. Either omit it or provide valid parts",
      );
    });

    it("should reject empty channel parts array", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        channel: [],
      };
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "enrichParts.channel cannot be empty. Either omit it or provide valid parts",
      );
    });

    it("should reject empty playlist parts array", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        playlist: [],
      };
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "enrichParts.playlist cannot be empty. Either omit it or provide valid parts",
      );
    });
  });

  describe("invalid parts validation", () => {
    it("should reject invalid video parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        video: ["snippet", "invalidPart", "anotherInvalid"],
      };
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "Invalid video parts: invalidPart, anotherInvalid. Valid parts are: snippet, contentDetails, statistics, status, localizations, topicDetails",
      );
    });

    it("should reject invalid channel parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        channel: ["snippet", "topicDetails"], // topicDetails is not valid for channels
      };
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "Invalid channel parts: topicDetails. Valid parts are: snippet, contentDetails, statistics, status, brandingSettings, localizations",
      );
    });

    it("should reject invalid playlist parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        playlist: ["snippet", "statistics"], // statistics is not valid for playlists
      };
      expect(() => validateEnrichmentParts(enrichParts)).toThrow(
        "Invalid playlist parts: statistics. Valid parts are: snippet, contentDetails, status, localizations",
      );
    });
  });

  describe("all valid parts", () => {
    it("should accept all valid video parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        video: [
          "snippet",
          "contentDetails",
          "statistics",
          "status",
          "localizations",
          "topicDetails",
        ],
      };
      expect(() => validateEnrichmentParts(enrichParts)).not.toThrow();
    });

    it("should accept all valid channel parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        channel: [
          "snippet",
          "contentDetails",
          "statistics",
          "status",
          "brandingSettings",
          "localizations",
        ],
      };
      expect(() => validateEnrichmentParts(enrichParts)).not.toThrow();
    });

    it("should accept all valid playlist parts", () => {
      const enrichParts: UnifiedSearchParams["enrichParts"] = {
        playlist: ["snippet", "contentDetails", "status", "localizations"],
      };
      expect(() => validateEnrichmentParts(enrichParts)).not.toThrow();
    });
  });
});
