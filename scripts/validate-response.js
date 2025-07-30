#!/usr/bin/env node

import { responseValidator } from "../dist/utils/response-validator.js";
import { readFileSync } from "fs";
import { ErrorHandler } from "../dist/utils/error-handler.js";

/**
 * Command-line response validation utility
 * Usage: node validate-response.js [options]
 */

function printUsage() {
  console.log(`
Usage: node validate-response.js [options]

Options:
  --input <file>        Read JSON response from file (default: stdin)
  --type <type>         Validation type: mcp-protocol, tool-response, youtube-api, integrity (default: mcp-protocol)
  --tool <name>         Tool name for tool-specific validation
  --json                Output results as JSON (default: human-readable)
  --help                Show this help message

Examples:
  # Validate MCP protocol compliance from stdin
  echo '{"success": true, "content": [{"type": "text", "text": "result"}]}' | node validate-response.js

  # Validate from file with JSON output
  node validate-response.js --input response.json --type mcp-protocol --json

  # Validate tool response with tool-specific rules
  node validate-response.js --input response.json --type tool-response --tool search_videos --json
`);
}

async function readInput(inputFile) {
  if (inputFile) {
    try {
      return readFileSync(inputFile, "utf8");
    } catch (error) {
      ErrorHandler.handleSystemError(error, {
        component: "validate-response",
        operation: `read file ${inputFile}`,
        critical: true,
      });
    }
  } else {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let input = "";

      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (chunk) => {
        input += chunk;
      });

      process.stdin.on("end", () => {
        resolve(input);
      });

      process.stdin.on("error", (error) => {
        reject(error);
      });

      // Handle case where stdin is empty or not available
      setTimeout(() => {
        if (input === "") {
          reject(new Error("No input provided"));
        }
      }, 1000);
    });
  }
}

function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    type: "mcp-protocol",
    tool: null,
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--input":
        options.input = args[++i];
        break;
      case "--type":
        options.type = args[++i];
        break;
      case "--tool":
        options.tool = args[++i];
        break;
      case "--json":
        options.json = true;
        break;
      case "--help":
        options.help = true;
        break;
      default:
        ErrorHandler.handleSystemError(new Error(`Unknown option: ${arg}`), {
          component: "validate-response",
          operation: "parse arguments",
          critical: true,
        });
    }
  }

  return options;
}

function formatHumanReadable(result, type, tool) {
  const status = result.valid ? "✅ PASS" : "❌ FAIL";
  const validationType = tool ? `${type} (${tool})` : type;

  console.log(`${status} ${validationType.toUpperCase()} VALIDATION`);
  console.log(`Summary: ${result.summary}`);
  console.log(`Validation time: ${result.performance.validationTime}ms`);

  if (result.performance.schemaLoadTime) {
    console.log(`Schema load time: ${result.performance.schemaLoadTime}ms`);
  }

  if (!result.valid && result.errors.length > 0) {
    console.log("\nValidation Errors:");
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.field}: ${error.message}`);
      if (error.expectedType) {
        console.log(`     Expected: ${error.expectedType}`);
      }
      if (error.value !== undefined) {
        console.log(`     Got: ${JSON.stringify(error.value)}`);
      }
    });
  }

  console.log();
}

function formatJson(result, type, tool, response) {
  const output = {
    validationType: type,
    toolName: tool || null,
    result: result,
    timestamp: new Date().toISOString(),
    responseSize: JSON.stringify(response).length,
  };

  console.log(JSON.stringify(output, null, 2));
}

async function performValidation(response, type, tool) {
  const startTime = Date.now();
  let result;

  try {
    switch (type) {
      case "mcp-protocol":
        result = await responseValidator.validateMCPToolResult(response);
        break;
      case "tool-response":
        if (!tool) {
          throw new Error("Tool name required for tool-response validation");
        }
        result = await responseValidator.validateToolResponse(response, tool);
        break;
      case "youtube-api":
        result = await responseValidator.validateYouTubeApiResponse(
          response,
          tool || "generic",
        );
        break;
      case "integrity":
        result = await responseValidator.validateResponseIntegrity(response);
        break;
      default:
        throw new Error(`Unknown validation type: ${type}`);
    }

    return result;
  } catch (error) {
    ErrorHandler.handleUtilityError(error, {
      operation: "performValidation",
      details: `type: ${type}, tool: ${tool}`,
    });
  }
}

async function main() {
  const options = parseArguments();

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  try {
    // Read input
    const inputData = await readInput(options.input);

    if (!inputData || inputData.trim() === "") {
      ErrorHandler.handleSystemError(new Error("No input data provided"), {
        component: "validate-response",
        operation: "read input",
        critical: true,
      });
    }

    // Parse JSON
    let response;
    try {
      response = JSON.parse(inputData);
    } catch (error) {
      ErrorHandler.handleSystemError(error, {
        component: "validate-response",
        operation: "parse JSON",
        critical: true,
      });
    }

    // Perform validation
    const result = await performValidation(
      response,
      options.type,
      options.tool,
    );

    // Output results
    if (options.json) {
      formatJson(result, options.type, options.tool, response);
    } else {
      formatHumanReadable(result, options.type, options.tool);
    }

    // Exit with appropriate code
    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    ErrorHandler.handleSystemError(error, {
      component: "validate-response",
      operation: "main",
      critical: true,
    });
  }
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    ErrorHandler.handleSystemError(error, {
      component: "validate-response",
      operation: "CLI execution",
      critical: true,
    });
  });
}

export { performValidation, parseArguments, readInput };
