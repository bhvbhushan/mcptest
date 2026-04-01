import { describe, it, expect } from "vitest";
import { createMCPClient, listAllTools } from "../../src/core/client.js";
import { runTests } from "../../src/core/runner.js";
import { complianceTests } from "../../src/compliance/index.js";
import { ConsoleReporter } from "../../src/reporters/console.js";
import { JsonReporter } from "../../src/reporters/json.js";
import { analyzeEfficiency } from "../../src/efficiency/analyzer.js";
import { analyzeQuality } from "../../src/quality/analyzer.js";
import { analyzeSecurity } from "../../src/security/analyzer.js";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const echoServerPath = path.resolve(__dirname, "../fixtures/echo-server.ts");

describe("integration: full pipeline", () => {
  it("connects to echo server, runs all compliance tests, and reports", async () => {
    const client = await createMCPClient({
      command: "npx",
      args: ["tsx", echoServerPath],
      transport: "stdio",
    });

    try {
      const version = client.getServerVersion();
      expect(version?.name).toBe("echo-test-server");
      expect(version?.version).toBe("1.0.0");

      const serverLabel = version?.name ?? "echo-test-server";

      // Fetch all tools once
      const allTools = await listAllTools(client);
      expect(allTools.length).toBe(2); // echo + add

      // Run all analyzers
      const efficiency = analyzeEfficiency(allTools);
      expect(efficiency.toolCount).toBe(2);
      expect(efficiency.findings).toHaveLength(0);

      const quality = analyzeQuality(allTools);
      expect(quality.paramDescriptionCoverage).toBe(1);
      expect(quality.findings).toHaveLength(0);

      const security = analyzeSecurity(allTools);
      expect(security.findings).toHaveLength(0);

      // Run compliance tests (lifecycle + tools + resources + prompts)
      const result = await runTests(
        complianceTests,
        { client, timeout: 10000 },
        undefined,
        serverLabel,
        { efficiency, quality, security },
      );

      // Should have all test categories
      const categories = new Set(result.results.map((r) => r.test.category));
      expect(categories.has("lifecycle")).toBe(true);
      expect(categories.has("tools")).toBe(true);
      expect(categories.has("resources")).toBe(true);
      expect(categories.has("prompts")).toBe(true);

      // All should pass for a well-built echo server
      expect(result.summary.failed).toBe(0);
      expect(result.summary.errors).toBe(0);
      expect(result.score).toBe(100); // perfect score

      // Console reporter should include new sections
      const consoleReporter = new ConsoleReporter({ color: false });
      const consoleOutput = consoleReporter.format(result);
      expect(consoleOutput).toContain("quality");
      expect(consoleOutput).toContain("security");
      expect(consoleOutput).toContain("compliance");

      // JSON reporter should include new fields
      const jsonReporter = new JsonReporter();
      const jsonOutput = jsonReporter.format(result);
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.quality).toBeDefined();
      expect(parsed.security).toBeDefined();
      expect(parsed.efficiency).toBeDefined();
    } finally {
      await client.close();
    }
  }, 30000);
});
