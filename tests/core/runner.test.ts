import { describe, it, expect } from "vitest";
import { runTests } from "../../src/core/runner.js";
import { mockTest, mockContext } from "../helpers.js";
import type { MCPTest } from "../../src/core/types.js";
import type { EfficiencyResult } from "../../src/efficiency/types.js";
import type { QualityResult } from "../../src/quality/types.js";
import type { SecurityResult } from "../../src/security/types.js";

describe("runTests", () => {
  const ctx = mockContext();

  it("runs all tests and collects results", async () => {
    const tests = [mockTest("t1", "pass"), mockTest("t2", "fail")];
    const result = await runTests(tests, ctx);

    expect(result.results).toHaveLength(2);
    expect(result.summary.total).toBe(2);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.skipped).toBe(0);
    expect(result.summary.errors).toBe(0);
  });

  it("calculates score as percentage of passed tests", async () => {
    const tests = [
      mockTest("t1", "pass"),
      mockTest("t2", "pass"),
      mockTest("t3", "fail"),
    ];
    const result = await runTests(tests, ctx);
    expect(result.score).toBe(27); // Math.round(2/3 * 40)
  });

  it("returns score 0 for empty test suite", async () => {
    const result = await runTests([], ctx);
    expect(result.results).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.score).toBe(0);
  });

  it("catches errors thrown by test run functions", async () => {
    const errorTest: MCPTest = {
      id: "err",
      name: "Error Test",
      description: "Throws",
      category: "lifecycle",
      severity: "critical",
      tags: [],
      run: async () => {
        throw new Error("boom");
      },
    };
    const result = await runTests([errorTest], ctx);
    expect(result.results[0].result.status).toBe("error");
    expect(result.results[0].result.message).toBe("boom");
  });

  it("marks skipped tests when using skip filter", async () => {
    const tests = [mockTest("t1", "pass"), mockTest("t2", "pass")];
    const result = await runTests(tests, ctx, { skip: ["t1"] });

    expect(result.results[0].result.status).toBe("skip");
    expect(result.results[1].result.status).toBe("pass");
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.passed).toBe(1);
  });

  it("runs only specified tests when using only filter", async () => {
    const tests = [mockTest("t1", "pass"), mockTest("t2", "pass")];
    const result = await runTests(tests, ctx, { only: ["t1"] });

    expect(result.results[0].result.status).toBe("pass");
    expect(result.results[1].result.status).toBe("skip");
  });

  it("excludes skipped tests from score calculation", async () => {
    const tests = [mockTest("t1", "pass"), mockTest("t2", "fail")];
    const result = await runTests(tests, ctx, { skip: ["t2"] });
    // Only t1 ran and passed, t2 was skipped
    expect(result.score).toBe(40);
  });

  it("records duration for each test", async () => {
    const slowTest: MCPTest = {
      id: "slow",
      name: "Slow",
      description: "Takes time",
      category: "lifecycle",
      severity: "low",
      tags: [],
      run: async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { status: "pass", message: "done", duration_ms: 0 };
      },
    };
    const result = await runTests([slowTest], ctx);
    expect(result.results[0].result.duration_ms).toBeGreaterThanOrEqual(40);
  });

  it("sets server and timestamp on suite result", async () => {
    const result = await runTests([], ctx, undefined, "node server.js");
    expect(result.server).toBe("node server.js");
    expect(result.timestamp).toBeTruthy();
  });

  it("times out tests that exceed context timeout", async () => {
    const hangingTest: MCPTest = {
      id: "hang",
      name: "Hanging Test",
      description: "Never resolves",
      category: "lifecycle",
      severity: "critical",
      tags: [],
      run: () => new Promise(() => {}), // never resolves
    };
    const shortCtx = mockContext({ timeout: 100 });
    const result = await runTests([hangingTest], shortCtx);
    expect(result.results[0].result.status).toBe("error");
    expect(result.results[0].result.message).toContain("timed out");
  });

  describe("weighted score calculation", () => {
    it("uses simple pass-rate when no efficiency data", async () => {
      const tests = [mockTest("t1", "pass"), mockTest("t2", "fail")];
      const result = await runTests(tests, ctx);
      expect(result.score).toBe(20); // 1/2 * 40
      expect(result.efficiency).toBeUndefined();
    });

    it("uses weighted formula when efficiency provided", async () => {
      const tests = [mockTest("t1", "pass"), mockTest("t2", "pass")];
      const efficiency: EfficiencyResult = {
        toolCount: 5,
        schemaTokenEstimate: 1000,
        findings: [],
      };
      const result = await runTests(tests, ctx, undefined, "srv", { efficiency });
      // compliance: (2/2) * 40 = 40, efficiency: 15 - 0 = 15, total: 55
      expect(result.score).toBe(55);
      expect(result.efficiency).toBe(efficiency);
    });

    it("deducts for efficiency warnings", async () => {
      const tests = [mockTest("t1", "pass")];
      const efficiency: EfficiencyResult = {
        toolCount: 25,
        schemaTokenEstimate: 5000,
        findings: [
          {
            level: "warning",
            category: "tool-count",
            message: "too many",
            value: 25,
            threshold: 20,
          },
        ],
      };
      const result = await runTests(tests, ctx, undefined, "srv", { efficiency });
      // compliance: (1/1) * 40 = 40, efficiency: 15 - 3 = 12, total: 52
      expect(result.score).toBe(52);
    });

    it("deducts for efficiency criticals", async () => {
      const tests = [mockTest("t1", "pass")];
      const efficiency: EfficiencyResult = {
        toolCount: 55,
        schemaTokenEstimate: 50000,
        findings: [
          { level: "critical", category: "tool-count", message: "", value: 55, threshold: 50 },
          { level: "critical", category: "schema-size", message: "", value: 50000, threshold: 30000 },
        ],
      };
      const result = await runTests(tests, ctx, undefined, "srv", { efficiency });
      // compliance: 40, efficiency: max(0, 15 - 16) = 0, total: 40
      expect(result.score).toBe(40);
    });

    it("efficiency score cannot go below 0", async () => {
      const tests = [mockTest("t1", "pass")];
      const efficiency: EfficiencyResult = {
        toolCount: 100,
        schemaTokenEstimate: 100000,
        findings: [
          { level: "critical", category: "tool-count", message: "", value: 100, threshold: 50 },
          { level: "critical", category: "schema-size", message: "", value: 100000, threshold: 30000 },
          { level: "warning", category: "tool-count", message: "", value: 100, threshold: 20 },
        ],
      };
      const result = await runTests(tests, ctx, undefined, "srv", { efficiency });
      // compliance: 40, efficiency: max(0, 15 - 16 - 3) = max(0, -4) = 0, total: 40
      expect(result.score).toBe(40);
    });

    it("scores 100 when all pass and all analyzers have no findings", async () => {
      const tests = [mockTest("a", "pass"), mockTest("b", "pass")];
      const efficiency: EfficiencyResult = { toolCount: 5, schemaTokenEstimate: 500, findings: [] };
      const quality: QualityResult = {
        findings: [],
        paramDescriptionCoverage: 1,
        toolsWithShortDescriptions: [],
        toolsWithVerboseDescriptions: [],
        deprecatedTools: [],
        duplicateToolGroups: [],
      };
      const security: SecurityResult = { findings: [] };

      const result = await runTests(tests, ctx, undefined, "test", { efficiency, quality, security });
      expect(result.score).toBe(100);
    });

    it("deducts for quality warnings and criticals", async () => {
      const tests = [mockTest("a", "pass")];
      const efficiency: EfficiencyResult = { toolCount: 2, schemaTokenEstimate: 100, findings: [] };
      const quality: QualityResult = {
        findings: [
          { level: "warning", category: "description-quality", message: "short" },
          { level: "critical", category: "deprecated-tools", message: "deprecated" },
        ],
        paramDescriptionCoverage: 0.8,
        toolsWithShortDescriptions: ["x"],
        toolsWithVerboseDescriptions: [],
        deprecatedTools: ["y"],
        duplicateToolGroups: [],
      };
      const security: SecurityResult = { findings: [] };

      const result = await runTests(tests, ctx, undefined, "test", { efficiency, quality, security });
      // compliance = 40, quality = 25 - 2 - 5 = 18, efficiency = 15, security = 20
      expect(result.score).toBe(93);
    });

    it("deducts for security findings", async () => {
      const tests = [mockTest("a", "pass")];
      const efficiency: EfficiencyResult = { toolCount: 2, schemaTokenEstimate: 100, findings: [] };
      const quality: QualityResult = {
        findings: [],
        paramDescriptionCoverage: 1,
        toolsWithShortDescriptions: [],
        toolsWithVerboseDescriptions: [],
        deprecatedTools: [],
        duplicateToolGroups: [],
      };
      const security: SecurityResult = {
        findings: [
          { level: "critical", category: "env-exposure", message: "env leak", toolName: "get-env" },
        ],
      };

      const result = await runTests(tests, ctx, undefined, "test", { efficiency, quality, security });
      // compliance = 40, quality = 25, efficiency = 15, security = 20 - 10 = 10
      expect(result.score).toBe(90);
    });

    it("floors each dimension at 0", async () => {
      const tests = [mockTest("a", "pass")];
      const efficiency: EfficiencyResult = { toolCount: 2, schemaTokenEstimate: 100, findings: [] };
      const quality: QualityResult = {
        findings: Array.from({ length: 20 }, () => ({
          level: "critical" as const,
          category: "param-descriptions" as const,
          message: "bad",
        })),
        paramDescriptionCoverage: 0,
        toolsWithShortDescriptions: [],
        toolsWithVerboseDescriptions: [],
        deprecatedTools: [],
        duplicateToolGroups: [],
      };
      const security: SecurityResult = { findings: [] };

      const result = await runTests(tests, ctx, undefined, "test", { efficiency, quality, security });
      // compliance = 40, quality = max(0, 25 - 100) = 0, efficiency = 15, security = 20
      expect(result.score).toBe(75);
    });
  });
});
