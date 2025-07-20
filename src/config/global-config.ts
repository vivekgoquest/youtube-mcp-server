import { GlobalConfig } from '../types.js';

/**
 * Global configuration for the YouTube MCP Server
 * Controls default behavior across all tools
 */
export const globalConfig: GlobalConfig = {
  // Default enrichment behavior for search tools
  defaultEnrichment: false,
  
  // Default parts to include in video requests
  defaultVideoParts: ['snippet', 'statistics', 'contentDetails', 'status', 'topicDetails'],
  
  // Default parts to include in channel requests
  defaultChannelParts: ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'topicDetails'],
  
  // Default parts to include in playlist requests
  defaultPlaylistParts: ['snippet', 'contentDetails', 'status'],
  
  // Enable graceful degradation when API calls fail
  enableGracefulDegradation: true,
  
  // Maximum items per batch for enrichment calls
  maxBatchSize: 50,
  
  // Maximum concurrent API calls for enrichment
  concurrencyLimit: 3
};

/**
 * Get the current global configuration
 */
export function getGlobalConfig(): GlobalConfig {
  return globalConfig;
}

/**
 * Update the global configuration
 * @param updates Partial configuration updates
 */
export function updateGlobalConfig(updates: Partial<GlobalConfig>): void {
  Object.assign(globalConfig, updates);
}

/**
 * Reset global configuration to defaults
 */
export function resetGlobalConfig(): void {
  Object.assign(globalConfig, {
    defaultEnrichment: false,
    defaultVideoParts: ['snippet', 'statistics', 'contentDetails', 'status', 'topicDetails'],
    defaultChannelParts: ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'topicDetails'],
    defaultPlaylistParts: ['snippet', 'contentDetails', 'status'],
    enableGracefulDegradation: true,
    maxBatchSize: 50,
    concurrencyLimit: 3
  });
}
