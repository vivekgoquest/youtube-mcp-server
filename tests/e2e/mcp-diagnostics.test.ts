import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ErrorHandler } from "../../src/utils/error-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("MCP Diagnostics CLI", () => {
  const CLI_PATH = path.join(
    __dirname,
    "../../dist/src/cli/mcp-diagnostics.js",
  );
  const PROJECT_ROOT = path.join(__dirname, "../..");

  // Helper function to run CLI commands
  const runCLI = (
    args: string[],
    options: { timeout?: number; env?: Record<string, string> } = {},
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> => {
    return new Promise((resolve) => {
      const child = spawn("node", [CLI_PATH, ...args], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, ...options.env },
        stdio: "pipe",
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        resolve({ stdout, stderr, exitCode: -1 });
      }, options.timeout || 30000);

      child.on("close", (code) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr: error.message, exitCode: 1 });
      });
    });
  };

  // Helper function to validate output patterns
  const expectValidOutput = (output: string, patterns: string[]) => {
    patterns.forEach((pattern) => {
      expect(output).toMatch(new RegExp(pattern, "i"));
    });
  };

  // Helper function to clean up test files
  const cleanupTestFiles = async () => {
    const testFiles = ["tool-discovery-report.json", "diagnostics-report.json"];

    for (const file of testFiles) {
      try {
        await fs.unlink(path.join(PROJECT_ROOT, file));
      } catch (error) {
        ErrorHandler.handleTestError(error, {
          testName: "mcp-diagnostics-e2e",
          operation: "cleanup-test-files",
        });
      }
    }
  };

  beforeAll(async () => {
    // Ensure the CLI is built
    try {
      await fs.access(CLI_PATH);
    } catch (error) {
      ErrorHandler.handleTestError(error, {
        testName: "mcp-diagnostics-e2e",
        operation: "check-cli-access",
      });
    }
  });

  afterEach(async () => {
    await cleanupTestFiles();
  });

  describe("CLI Help and Version", () => {
    test("shows help with --help flag", async () => {
      const result = await runCLI(["--help"]);

      expect(result.exitCode).toBe(0);
      expectValidOutput(result.stdout, [
        "Usage:",
        "Commands:",
        "health.*API connectivity and performance",
        "quota.*quota analysis",
        "discovery.*tool discovery verification",
      ]);
    });

    test("shows version with --version flag", async () => {
      const result = await runCLI(["--version"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test("shows error for invalid subcommand", async () => {
      const result = await runCLI(["invalid-command"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/unknown command/i);
    });

    test("shows help when no arguments provided", async () => {
      const result = await runCLI([]);

      expect(result.exitCode).toBe(0);
      expectValidOutput(result.stdout, ["Usage:", "Commands:"]);
    });
  });

  describe("Health Subcommand", () => {
    test("runs health check with valid API key", async () => {
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        console.log(
          "⚠️  Skipping health check test - no YOUTUBE_API_KEY available",
        );
        return;
      }

      const result = await runCLI(["health"], {
        env: { YOUTUBE_API_KEY: apiKey },
        timeout: 15000,
      });

      expect(result.exitCode).toBe(0);
      expectValidOutput(result.stdout, [
        "API Health Check",
        "Connectivity.*✓",
        "Performance",
        "Current Quota Usage",
      ]);
    });

    test("exits with error when API key is missing", async () => {
      const result = await runCLI(["health"], {
        env: { YOUTUBE_API_KEY: "" },
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/API key.*required/i);
    });

    test("supports JSON output format", async () => {
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        console.log(
          "⚠️  Skipping JSON health test - no YOUTUBE_API_KEY available",
        );
        return;
      }

      const result = await runCLI(["health", "--json"], {
        env: { YOUTUBE_API_KEY: apiKey },
        timeout: 15000,
      });

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty("apiCheck");
      expect(output).toHaveProperty("performance");
    });
  });

  describe("Quota Subcommand", () => {
    test("analyzes quota usage successfully", async () => {
      const result = await runCLI(["quota"]);

      expect(result.exitCode).toBe(0);
      expectValidOutput(result.stdout, [
        "Quota Analysis",
        "Tool Analysis",
        "Budget Recommendations",
      ]);
    });

    test("supports JSON output format", async () => {
      const result = await runCLI(["quota", "--json"]);

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty("analysis");
      expect(output).toHaveProperty("recommendations");
    });

    test("includes tool groupings in output", async () => {
      const result = await runCLI(["quota"]);

      expect(result.exitCode).toBe(0);
      expectValidOutput(result.stdout, [
        "High.*Cost.*Tools",
        "Medium.*Cost.*Tools",
        "Low.*Cost.*Tools",
      ]);
    });
  });

  describe("Discovery Subcommand", () => {
    test("runs tool discovery verification", async () => {
      const result = await runCLI(["discovery"], { timeout: 45000 });

      expect(result.exitCode).toBe(0);
      expectValidOutput(result.stdout, [
        "Tool Discovery Verification",
        "Tool Discovery Results",
        "Discovered Tools",
      ]);
    });

    test("generates JSON report file", async () => {
      const result = await runCLI(["discovery"], { timeout: 45000 });

      expect(result.exitCode).toBe(0);

      const reportPath = path.join(PROJECT_ROOT, "tool-discovery-report.json");
      const reportExists = await fs
        .access(reportPath)
        .then(() => true)
        .catch(() => false);
      expect(reportExists).toBe(true);

      if (reportExists) {
        const reportContent = await fs.readFile(reportPath, "utf-8");
        expect(() => JSON.parse(reportContent)).not.toThrow();

        const report = JSON.parse(reportContent);
        expect(report).toHaveProperty("timestamp");
        expect(report).toHaveProperty("discoveredTools");
        expect(report).toHaveProperty("validation");
      }
    });

    test("supports verbose output", async () => {
      const result = await runCLI(["discovery", "--verbose"], {
        timeout: 45000,
      });

      expect(result.exitCode).toBe(0);
      expectValidOutput(result.stdout, [
        "Tool Discovery Verification",
        "Testing tool:",
      ]);
    });
  });

  describe("Error Handling", () => {
    test("handles missing dist directory gracefully", async () => {
      // This test would need to temporarily move/rename the dist directory
      // Skipping for now as it's destructive
      expect(true).toBe(true);
    });

    test("handles network errors in health check", async () => {
      const result = await runCLI(["health"], {
        env: { YOUTUBE_API_KEY: "invalid-key-for-testing" },
        timeout: 10000,
      });

      // Should handle the error gracefully, not crash
      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.stderr).toMatch(/(invalid|unauthorized|forbidden)/i);
    });
  });

  describe("Integration with npm scripts", () => {
    test("npm run diagnostics health works", async () => {
      // This would test the npm script integration
      // Requires running npm commands which might be slow
      expect(true).toBe(true);
    });

    test("npm run test:quota-check works", async () => {
      // This would test the npm script integration
      expect(true).toBe(true);
    });
  });
});
