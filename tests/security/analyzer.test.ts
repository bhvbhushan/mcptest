import { describe, it, expect } from "vitest";
import { analyzeSecurity } from "../../src/security/analyzer.js";
import type { ToolDefinition } from "../../src/core/types.js";

function tool(name: string, description: string, inputSchema?: Record<string, unknown>): ToolDefinition {
  return {
    name,
    description,
    inputSchema: inputSchema ?? { type: "object", properties: {} },
  };
}

describe("analyzeSecurity", () => {
  describe("env exposure", () => {
    it("flags tools that return environment variables", () => {
      const tools = [
        tool("get-env", "Returns all environment variables, helpful for debugging MCP server configuration"),
      ];
      const result = analyzeSecurity(tools);
      const finding = result.findings.find((f) => f.category === "env-exposure");
      expect(finding).toBeDefined();
      expect(finding!.level).toBe("critical");
      expect(finding!.toolName).toBe("get-env");
    });

    it("flags printEnv-style tools", () => {
      const tools = [tool("printEnv", "Prints environment variables as JSON")];
      const result = analyzeSecurity(tools);
      expect(result.findings.find((f) => f.category === "env-exposure")).toBeDefined();
    });

    it("does not flag tools that mention env in unrelated context", () => {
      const tools = [tool("set_config", "Set application configuration for the environment")];
      const result = analyzeSecurity(tools);
      expect(result.findings.find((f) => f.category === "env-exposure")).toBeUndefined();
    });
  });

  describe("code execution", () => {
    it("flags tools that accept code/function parameters", () => {
      const tools = [
        tool("browser_evaluate", "Evaluate JavaScript expression on page", {
          type: "object",
          properties: {
            function: { type: "string", description: "() => { /* code */ }" },
          },
          required: ["function"],
        }),
      ];
      const result = analyzeSecurity(tools);
      const finding = result.findings.find((f) => f.category === "code-execution");
      expect(finding).toBeDefined();
      expect(finding!.level).toBe("warning");
      expect(finding!.toolName).toBe("browser_evaluate");
    });

    it("flags tools with eval/exec/run_code in name", () => {
      const tools = [tool("browser_run_code", "Run Playwright code snippet")];
      const result = analyzeSecurity(tools);
      expect(result.findings.find((f) => f.category === "code-execution")).toBeDefined();
    });

    it("does not flag normal tools", () => {
      const tools = [tool("echo", "Echoes back the input string")];
      const result = analyzeSecurity(tools);
      expect(result.findings.find((f) => f.category === "code-execution")).toBeUndefined();
    });
  });

  describe("dangerous defaults", () => {
    it("flags tools with write/delete capabilities and risk warnings", () => {
      const tools = [
        tool("write_file", "Create a new file or completely overwrite an existing file with new content. Use with caution as it will overwrite existing files without warning.", {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
          },
          required: ["path", "content"],
        }),
      ];
      const result = analyzeSecurity(tools);
      const finding = result.findings.find((f) => f.category === "dangerous-defaults");
      expect(finding).toBeDefined();
      expect(finding!.level).toBe("warning");
    });

    it("does not flag read-only tools", () => {
      const tools = [tool("read_file", "Read file contents safely")];
      const result = analyzeSecurity(tools);
      expect(result.findings.find((f) => f.category === "dangerous-defaults")).toBeUndefined();
    });
  });

  it("handles empty tools array", () => {
    const result = analyzeSecurity([]);
    expect(result.findings).toHaveLength(0);
  });

  it("aggregates multiple findings across tools", () => {
    const tools = [
      tool("get-env", "Returns all environment variables"),
      tool("browser_evaluate", "Evaluate JavaScript expression", {
        type: "object",
        properties: { function: { type: "string" } },
      }),
    ];
    const result = analyzeSecurity(tools);
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
  });
});
