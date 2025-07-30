#!/usr/bin/env node

import { createGenerator } from "ts-json-schema-generator";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ErrorHandler } from "../dist/utils/error-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_DIR = join(PROJECT_ROOT, "dist", "schemas");

// Interface configurations for schema generation
const INTERFACE_CONFIGS = [
  {
    name: "MCPToolResult",
    file: "src/mcp-server.ts",
    type: "MCPToolResult",
    description: "MCP Tool Result interface for protocol compliance validation",
  },
  {
    name: "ToolResponse",
    file: "src/types.ts",
    type: "ToolResponse<any>",
    description: "Generic tool response interface for tool-specific validation",
  },
  {
    name: "YouTubeApiResponse",
    file: "src/types.ts",
    type: "YouTubeApiResponse<any>",
    description: "YouTube API response structure validation",
  },
  {
    name: "VideoSnippet",
    file: "src/types.ts",
    type: "VideoSnippet",
    description: "YouTube video snippet data structure validation",
  },
  {
    name: "ChannelSnippet",
    file: "src/types.ts",
    type: "ChannelSnippet",
    description: "YouTube channel snippet data structure validation",
  },
  {
    name: "SearchResult",
    file: "src/types.ts",
    type: "SearchResult",
    description: "YouTube search result data structure validation",
  },
];

// Schema generation configuration
const GENERATOR_CONFIG = {
  path: "",
  tsconfig: join(PROJECT_ROOT, "tsconfig.json"),
  type: "",
  skipTypeCheck: false,
  expose: "export",
  topRef: true,
  jsDoc: "extended",
  additionalProperties: false,
  strictTuples: false,
  encodeRefs: false,
};

/**
 * Create output directory if it doesn't exist
 */
function ensureOutputDirectory() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Generate schema for a specific interface
 */
function generateSchemaForInterface(config) {
  console.log(`📋 Generating schema for ${config.name}...`);

  try {
    const generatorConfig = {
      ...GENERATOR_CONFIG,
      path: join(PROJECT_ROOT, config.file),
      type: config.type,
    };

    const generator = createGenerator(generatorConfig);
    const schema = generator.createSchema(config.type);

    // Add custom metadata
    schema.$schema = "http://json-schema.org/draft-07/schema#";
    schema.description = config.description;
    schema.generatedAt = new Date().toISOString();
    schema.sourceFile = config.file;
    schema.sourceType = config.type;

    // Add custom validation rules for YouTube-specific data
    if (
      config.name === "VideoSnippet" ||
      config.name === "ChannelSnippet" ||
      config.name === "SearchResult"
    ) {
      addYouTubeValidationRules(schema, config.name);
    }

    // Validate generated schema
    validateGeneratedSchema(schema, config.name);

    // Write schema to file
    const outputPath = join(OUTPUT_DIR, `${config.name}.json`);
    writeFileSync(outputPath, JSON.stringify(schema, null, 2));

    console.log(`✅ Generated ${config.name}.json`);
    return { name: config.name, success: true, path: outputPath };
  } catch (error) {
    ErrorHandler.handleSystemError(error, {
      component: "schema-generator",
      operation: `generate schema for ${config.name}`,
      critical: false,
    });
    return { name: config.name, success: false, error: error.message };
  }
}

/**
 * Add YouTube-specific validation rules to schemas
 */
function addYouTubeValidationRules(schema, interfaceName) {
  if (schema.properties && schema.properties.channelId) {
    schema.properties.channelId = {
      ...schema.properties.channelId,
      pattern: "^UC[a-zA-Z0-9_-]{22}$",
      description:
        "YouTube channel ID - starts with UC followed by 22 characters",
    };
  }

  if (schema.properties && schema.properties.id) {
    switch (interfaceName) {
      case "SearchResult":
        // SearchResult can have video, channel, or playlist IDs
        schema.properties.id = {
          ...schema.properties.id,
          description: "YouTube resource ID (video, channel, or playlist)",
        };
        break;
    }
  }

  // Add format validation for dates
  if (schema.properties && schema.properties.publishedAt) {
    schema.properties.publishedAt = {
      ...schema.properties.publishedAt,
      format: "date-time",
      description: "ISO 8601 date-time string",
    };
  }

  // Add URL format validation
  if (schema.properties && schema.properties.thumbnails) {
    addThumbnailValidation(schema.properties.thumbnails);
  }
}

/**
 * Add thumbnail URL validation
 */
function addThumbnailValidation(thumbnailsProperty) {
  if (thumbnailsProperty.properties) {
    ["default", "medium", "high", "standard", "maxres"].forEach((size) => {
      if (
        thumbnailsProperty.properties[size] &&
        thumbnailsProperty.properties[size].properties
      ) {
        if (thumbnailsProperty.properties[size].properties.url) {
          thumbnailsProperty.properties[size].properties.url = {
            ...thumbnailsProperty.properties[size].properties.url,
            format: "uri",
            pattern: "^https://",
            description: "HTTPS URL for thumbnail image",
          };
        }
      }
    });
  }
}

/**
 * Validate generated schema for correctness
 */
function validateGeneratedSchema(schema, name) {
  if (!schema || typeof schema !== "object") {
    throw new Error(`Generated schema for ${name} is not a valid object`);
  }

  if (!schema.$schema) {
    throw new Error(`Generated schema for ${name} missing $schema property`);
  }

  if (!schema.type && !schema.anyOf && !schema.oneOf && !schema.allOf) {
    throw new Error(`Generated schema for ${name} missing type definition`);
  }

  // Validate required MCP structure for MCPToolResult
  if (name === "MCPToolResult") {
    if (
      !schema.properties ||
      !schema.properties.success ||
      !schema.properties.content
    ) {
      throw new Error(
        "MCPToolResult schema missing required properties: success, content",
      );
    }
  }

  // Validate ToolResponse structure
  if (name === "ToolResponse") {
    if (
      !schema.properties ||
      !schema.properties.success ||
      !schema.properties.data
    ) {
      console.warn(
        "ToolResponse schema missing some expected properties, but this may be acceptable for generic types",
      );
    }
  }
}

/**
 * Create index file listing all available schemas
 */
function createSchemaIndex(results) {
  const successfulSchemas = results.filter((r) => r.success);

  const indexContent = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "YouTube MCP Server Schema Index",
    description: "Index of all available JSON schemas for validation",
    generatedAt: new Date().toISOString(),
    schemas: successfulSchemas.map((result) => ({
      name: result.name,
      file: `${result.name}.json`,
      path: result.path,
    })),
    totalSchemas: successfulSchemas.length,
    generator: {
      name: "ts-json-schema-generator",
      version: "^1.5.0",
    },
  };

  const indexPath = join(OUTPUT_DIR, "index.json");
  writeFileSync(indexPath, JSON.stringify(indexContent, null, 2));
  console.log(`📑 Created schema index: ${indexPath}`);
  return indexPath;
}

/**
 * Main schema generation function
 */
function generateAllSchemas() {
  console.log("🔧 Starting schema generation...");
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  ensureOutputDirectory();

  // Generate schemas for all interfaces
  const results = INTERFACE_CONFIGS.map(generateSchemaForInterface);

  // Create index file
  createSchemaIndex(results);

  // Print summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log("\n📊 Schema Generation Summary:");
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Total files: ${successful + 1} (including index.json)`);

  if (failed > 0) {
    console.log("\n❌ Failed schemas:");
    results
      .filter((r) => !r.success)
      .forEach((result) => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
  }

  console.log(
    `\n🎯 Schemas generated successfully! Use them with the ResponseValidator.`,
  );
  console.log(`💡 Run 'npm test' to validate the generated schemas.`);

  // Exit with error code if any schemas failed
  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * Handle CLI execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generateAllSchemas();
  } catch (error) {
    ErrorHandler.handleSystemError(error, {
      component: "schema-generator",
      operation: "main execution",
      critical: true,
    });
  }
}

export { generateAllSchemas, INTERFACE_CONFIGS, OUTPUT_DIR };
