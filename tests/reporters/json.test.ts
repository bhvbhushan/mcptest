import { describe, it, expect } from "vitest";
import { JsonReporter } from "../../src/reporters/json.js";
import { mockSuiteResult } from "../helpers.js";

describe("JsonReporter", () => {
  const reporter = new JsonReporter();

  it("outputs valid JSON", () => {
    const result = mockSuiteResult();
    const output = reporter.format(result);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("includes all suite result fields", () => {
    const result = mockSuiteResult();
    const parsed = JSON.parse(reporter.format(result));

    expect(parsed.server).toBe(result.server);
    expect(parsed.timestamp).toBe(result.timestamp);
    expect(parsed.duration_ms).toBe(result.duration_ms);
    expect(parsed.results).toHaveLength(result.results.length);
    expect(parsed.summary).toEqual(result.summary);
    expect(parsed.score).toBe(result.score);
  });

  it("includes version field", () => {
    const result = mockSuiteResult();
    const parsed = JSON.parse(reporter.format(result));
    expect(parsed.version).toBe("0.1.0");
  });

  it("pretty-prints with 2-space indent", () => {
    const result = mockSuiteResult();
    const output = reporter.format(result);
    expect(output).toContain("\n  ");
  });
});
