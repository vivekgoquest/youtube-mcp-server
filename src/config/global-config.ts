import { GlobalConfig } from "../types.js";
import {
  DEFAULT_VIDEO_PARTS,
  DEFAULT_CHANNEL_PARTS,
  DEFAULT_PLAYLIST_PARTS,
} from "./constants.js";

/**
 * Global configuration for the YouTube MCP Server
 * Controls default behavior across all tools
 */
export const globalConfig: GlobalConfig = {
  // Default parts to include in video requests
  // Note: For new code, use DEFAULT_VIDEO_PARTS from constants.ts directly
  defaultVideoParts: DEFAULT_VIDEO_PARTS,

  // Default parts to include in channel requests
  // Note: For new code, use DEFAULT_CHANNEL_PARTS from constants.ts directly
  defaultChannelParts: DEFAULT_CHANNEL_PARTS,

  // Default parts to include in playlist requests
  // Note: For new code, use DEFAULT_PLAYLIST_PARTS from constants.ts directly
  defaultPlaylistParts: DEFAULT_PLAYLIST_PARTS,

  // Maximum items per batch for enrichment calls
  maxBatchSize: 50,
};
