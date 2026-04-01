import { describe, it, expect } from "vitest";
import { analyzeEfficiency } from "../../src/efficiency/analyzer.js";
import type { EfficiencyConfig } from "../../src/efficiency/types.js";

function makeTool(name: string, schemaSize: "small" | "large" = "small") {
  const inputSchema =
    schemaSize === "large"
      ? {
          type: "object" as const,
          properties: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [
              `field_${i}`,
              { type: "string", description: `A field description that adds tokens ${i}` },
            ]),
          ),
        }
      : { type: "object" as const, properties: { input: { type: "string" } } };
  return { name, description: `Tool ${name}`, inputSchema };
}

describe("analyzeEfficiency", () => {
  it("counts tools correctly", () => {
    const tools = [makeTool("a"), makeTool("b"), makeTool("c")];
    const result = analyzeEfficiency(tools);
    expect(result.toolCount).toBe(3);
  });

  it("estimates schema tokens using chars/4", () => {
    const tools = [makeTool("echo")];
    const result = analyzeEfficiency(tools);
    const expectedTokens = Math.ceil(JSON.stringify(tools).length / 4);
    expect(result.schemaTokenEstimate).toBe(expectedTokens);
  });

  it("returns no findings when under all thresholds", () => {
    const tools = [makeTool("a"), makeTool("b")];
    const result = analyzeEfficiency(tools);
    expect(result.findings).toHaveLength(0);
  });

  it("warns when tool count exceeds warning threshold", () => {
    const tools = Array.from({ length: 25 }, (_, i) => makeTool(`tool_${i}`));
    const result = analyzeEfficiency(tools);
    const finding = result.findings.find(
      (f) => f.category === "tool-count" && f.level === "warning",
    );
    expect(finding).toBeDefined();
    expect(finding!.value).toBe(25);
    expect(finding!.threshold).toBe(20);
  });

  it("critical when tool count exceeds critical threshold", () => {
    const tools = Array.from({ length: 55 }, (_, i) => makeTool(`tool_${i}`));
    const result = analyzeEfficiency(tools);
    const finding = result.findings.find(
      (f) => f.category === "tool-count" && f.level === "critical",
    );
    expect(finding).toBeDefined();
    expect(finding!.value).toBe(55);
  });

  it("warns when schema tokens exceed warning threshold", () => {
    const tools = Array.from({ length: 15 }, (_, i) => makeTool(`tool_${i}`, "large"));
    const result = analyzeEfficiency(tools);
    const finding = result.findings.find(
      (f) => f.category === "schema-size" && f.level === "warning",
    );
    expect(finding).toBeDefined();
  });

  it("accepts custom thresholds via config", () => {
    const tools = Array.from({ length: 5 }, (_, i) => makeTool(`tool_${i}`));
    const config: EfficiencyConfig = { maxToolsWarning: 3, maxToolsCritical: 10 };
    const result = analyzeEfficiency(tools, config);
    const finding = result.findings.find((f) => f.category === "tool-count");
    expect(finding).toBeDefined();
    expect(finding!.level).toBe("warning");
  });

  it("handles empty tools array", () => {
    const result = analyzeEfficiency([]);
    expect(result.toolCount).toBe(0);
    expect(result.findings).toHaveLength(0);
  });
});
