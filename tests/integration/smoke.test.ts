import { describe, it, expect } from "vitest";
import { createMCPClient } from "../../src/core/client.js";
import { runTests } from "../../src/core/runner.js";
import { complianceTests } from "../../src/compliance/index.js";
import { ConsoleReporter } from "../../src/reporters/console.js";
import { JsonReporter } from "../../src/reporters/json.js";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const echoServerPath = path.resolve(__dirname, "../fixtures/echo-server.ts");

describe("integration: full pipeline", () => {
  it("connects to echo server, runs compliance tests, and reports", async () => {
    const client = await createMCPClient({
      command: "npx",
      args: ["tsx", echoServerPath],
      transport: "stdio",
    });

    try {
      const version = client.getServerVersion();
      expect(version?.name).toBe("echo-test-server");
      expect(version?.version).toBe("1.0.0");

      const serverLabel = version?.name ?? `npx tsx ${echoServerPath}`;

      const result = await runTests(
        complianceTests,
        { client, timeout: 10000 },
        undefined,
        serverLabel,
      );

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThanOrEqual(0);

      // Console reporter should not throw
      const consoleReporter = new ConsoleReporter({ color: false });
      const consoleOutput = consoleReporter.format(result);
      expect(consoleOutput).toContain("echo-test-server");

      // JSON reporter should produce valid JSON
      const jsonReporter = new JsonReporter();
      const jsonOutput = jsonReporter.format(result);
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.version).toBe("0.1.0");
      expect(parsed.results).toHaveLength(result.results.length);
    } finally {
      await client.close();
    }
  }, 30000);
});
