import { describe, it, expect } from "vitest";
import { ConsoleReporter } from "../../src/reporters/console.js";
import { mockSuiteResult } from "../helpers.js";

describe("ConsoleReporter", () => {
  // Disable colors for predictable test output
  const reporter = new ConsoleReporter({ color: false });

  it("includes server label in header", () => {
    const result = mockSuiteResult({ server: "node my-server.js" });
    const output = reporter.format(result);
    expect(output).toContain("node my-server.js");
  });

  it("shows pass symbol for passing tests", () => {
    const result = mockSuiteResult({
      results: [
        {
          test: { id: "t1", name: "Init test", category: "lifecycle", severity: "critical" },
          result: { status: "pass", message: "ok", duration_ms: 5 },
        },
      ],
      summary: { total: 1, passed: 1, failed: 0, skipped: 0, errors: 0 },
      score: 100,
    });
    const output = reporter.format(result);
    expect(output).toContain("PASS");
    expect(output).toContain("Init test");
  });

  it("shows fail symbol for failing tests", () => {
    const result = mockSuiteResult({
      results: [
        {
          test: { id: "t1", name: "Bad test", category: "lifecycle", severity: "critical" },
          result: { status: "fail", message: "expected X", duration_ms: 10 },
        },
      ],
      summary: { total: 1, passed: 0, failed: 1, skipped: 0, errors: 0 },
      score: 0,
    });
    const output = reporter.format(result);
    expect(output).toContain("FAIL");
    expect(output).toContain("Bad test");
    expect(output).toContain("expected X");
  });

  it("shows skip symbol for skipped tests", () => {
    const result = mockSuiteResult({
      results: [
        {
          test: { id: "t1", name: "Skip test", category: "tools", severity: "low" },
          result: { status: "skip", message: "skipped", duration_ms: 0 },
        },
      ],
      summary: { total: 1, passed: 0, failed: 0, skipped: 1, errors: 0 },
      score: 0,
    });
    const output = reporter.format(result);
    expect(output).toContain("SKIP");
    expect(output).toContain("Skip test");
  });

  it("groups results by category", () => {
    const result = mockSuiteResult(); // has lifecycle and tools categories
    const output = reporter.format(result);
    expect(output).toContain("lifecycle");
    expect(output).toContain("tools");
  });

  it("shows summary with counts", () => {
    const result = mockSuiteResult();
    const output = reporter.format(result);
    expect(output).toContain("1 passed");
    expect(output).toContain("1 failed");
    expect(output).toContain("1 skipped");
  });

  it("shows score", () => {
    const result = mockSuiteResult({ score: 75 });
    const output = reporter.format(result);
    expect(output).toContain("75");
  });

  it("shows duration", () => {
    const result = mockSuiteResult({ duration_ms: 150 });
    const output = reporter.format(result);
    expect(output).toContain("150ms");
  });

  it("shows efficiency section when present", () => {
    const result = mockSuiteResult({
      efficiency: {
        toolCount: 25,
        schemaTokenEstimate: 5000,
        findings: [
          {
            level: "warning",
            category: "tool-count",
            message: "Server exposes 25 tools (warning threshold: 20)",
            value: 25,
            threshold: 20,
          },
        ],
      },
    });
    const output = reporter.format(result);
    expect(output).toContain("efficiency");
    expect(output).toContain("25 tools");
    expect(output).toContain("5000");
    expect(output).toContain("WARN");
  });

  it("does not show efficiency section when absent", () => {
    const result = mockSuiteResult({ efficiency: undefined });
    const output = reporter.format(result);
    expect(output).not.toContain("efficiency");
  });
});
