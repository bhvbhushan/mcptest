import { describe, it, expect } from "vitest";
import { analyzeQuality } from "../../src/quality/analyzer.js";
import type { ToolDefinition } from "../../src/core/types.js";

function tool(name: string, overrides?: Partial<ToolDefinition>): ToolDefinition {
  return {
    name,
    description: `Does ${name} things`,
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "The input value" },
      },
      required: ["input"],
    },
    ...overrides,
  };
}

describe("analyzeQuality", () => {
  describe("param description coverage", () => {
    it("returns 1.0 coverage when all params have descriptions", () => {
      const tools = [tool("a"), tool("b")];
      const result = analyzeQuality(tools);
      expect(result.paramDescriptionCoverage).toBe(1);
      expect(result.findings.find((f) => f.category === "param-descriptions")).toBeUndefined();
    });

    it("flags critical when <50% of params have descriptions", () => {
      const tools = [
        tool("read_file", {
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string" },
              encoding: { type: "string" },
              mode: { type: "string" },
            },
            required: ["path"],
          },
        }),
      ];
      const result = analyzeQuality(tools);
      expect(result.paramDescriptionCoverage).toBe(0);
      const finding = result.findings.find((f) => f.category === "param-descriptions");
      expect(finding).toBeDefined();
      expect(finding!.level).toBe("critical");
    });

    it("flags warning when 50-80% of params have descriptions", () => {
      const tools = [
        tool("mixed", {
          inputSchema: {
            type: "object",
            properties: {
              a: { type: "string", description: "has desc" },
              b: { type: "string" },
              c: { type: "string", description: "has desc" },
            },
          },
        }),
      ];
      const result = analyzeQuality(tools);
      expect(result.paramDescriptionCoverage).toBeCloseTo(0.667, 1);
      const finding = result.findings.find((f) => f.category === "param-descriptions");
      expect(finding).toBeDefined();
      expect(finding!.level).toBe("warning");
    });

    it("handles tools with no properties", () => {
      const tools = [tool("ping", { inputSchema: { type: "object" } })];
      const result = analyzeQuality(tools);
      expect(result.paramDescriptionCoverage).toBe(1);
    });
  });

  describe("description quality", () => {
    it("flags tools with descriptions under 20 chars", () => {
      const tools = [tool("close", { description: "Close the page" })];
      const result = analyzeQuality(tools);
      expect(result.toolsWithShortDescriptions).toContain("close");
      expect(result.findings.find((f) => f.category === "description-quality" && f.message.includes("short"))).toBeDefined();
    });

    it("flags tools with descriptions over 500 chars", () => {
      const tools = [tool("think", { description: "A".repeat(501) })];
      const result = analyzeQuality(tools);
      expect(result.toolsWithVerboseDescriptions).toContain("think");
      expect(result.findings.find((f) => f.category === "description-quality" && f.message.includes("verbose"))).toBeDefined();
    });

    it("does not flag descriptions between 20-500 chars", () => {
      const tools = [tool("normal", { description: "This is a perfectly normal description" })];
      const result = analyzeQuality(tools);
      expect(result.toolsWithShortDescriptions).toHaveLength(0);
      expect(result.toolsWithVerboseDescriptions).toHaveLength(0);
    });
  });

  describe("deprecated tools", () => {
    it("detects deprecated in description", () => {
      const tools = [
        tool("read_file", {
          description: "Read file contents. DEPRECATED: Use read_text_file instead.",
        }),
      ];
      const result = analyzeQuality(tools);
      expect(result.deprecatedTools).toContain("read_file");
      const finding = result.findings.find((f) => f.category === "deprecated-tools");
      expect(finding).toBeDefined();
      expect(finding!.level).toBe("critical");
    });

    it("detects obsolete in description", () => {
      const tools = [tool("old_api", { description: "This tool is obsolete." })];
      const result = analyzeQuality(tools);
      expect(result.deprecatedTools).toContain("old_api");
    });

    it("does not flag normal descriptions", () => {
      const tools = [tool("normal")];
      const result = analyzeQuality(tools);
      expect(result.deprecatedTools).toHaveLength(0);
    });
  });

  describe("duplicate tools", () => {
    it("detects tools with identical schemas", () => {
      const schema = {
        type: "object",
        properties: {
          path: { type: "string" },
          head: { type: "number" },
          tail: { type: "number" },
        },
        required: ["path"],
      };
      const tools = [
        tool("read_file", { inputSchema: schema }),
        tool("read_text_file", { inputSchema: schema }),
      ];
      const result = analyzeQuality(tools);
      expect(result.duplicateToolGroups.length).toBeGreaterThan(0);
      expect(result.duplicateToolGroups[0]).toContain("read_file");
      expect(result.duplicateToolGroups[0]).toContain("read_text_file");
    });

    it("does not flag tools with different schemas", () => {
      const tools = [tool("a"), tool("b", { inputSchema: { type: "object", properties: { x: { type: "number" } } } })];
      const result = analyzeQuality(tools);
      expect(result.duplicateToolGroups).toHaveLength(0);
    });
  });

  describe("schema issues", () => {
    it("flags tools where required params have defaults", () => {
      const tools = [
        tool("net", {
          inputSchema: {
            type: "object",
            properties: {
              static: { type: "boolean", default: false, description: "Include static" },
              body: { type: "boolean", default: false, description: "Include body" },
            },
            required: ["static", "body"],
          },
        }),
      ];
      const result = analyzeQuality(tools);
      const finding = result.findings.find((f) => f.category === "schema-issues");
      expect(finding).toBeDefined();
      expect(finding!.message).toContain("net");
    });
  });

  it("handles empty tools array", () => {
    const result = analyzeQuality([]);
    expect(result.findings).toHaveLength(0);
    expect(result.paramDescriptionCoverage).toBe(1);
  });
});
