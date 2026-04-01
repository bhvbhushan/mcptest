import { describe, it, expect } from "vitest";
import { analyzeEfficiency } from "../../src/efficiency/analyzer.js";
import type { MCPClientWrapper } from "../../src/core/types.js";
import type { EfficiencyConfig } from "../../src/efficiency/types.js";

function makeClient(
  tools: { name: string; description?: string; inputSchema: Record<string, unknown> }[],
): MCPClientWrapper {
  return {
    getServerCapabilities: () => ({ tools: {} }),
    getServerVersion: () => ({ name: "test", version: "1.0" }),
    listTools: async () => ({ tools }),
    callTool: async () => ({ content: [] }),
    listResources: async () => ({ resources: [] }),
    readResource: async () => ({ contents: [] }),
    listPrompts: async () => ({ prompts: [] }),
    getPrompt: async () => ({ messages: [] }),
    ping: async () => {},
  };
}

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
  it("counts tools correctly", async () => {
    const client = makeClient([makeTool("a"), makeTool("b"), makeTool("c")]);
    const result = await analyzeEfficiency(client);
    expect(result.toolCount).toBe(3);
  });

  it("estimates schema tokens using chars/4", async () => {
    const tools = [makeTool("echo")];
    const client = makeClient(tools);
    const result = await analyzeEfficiency(client);
    const expectedTokens = Math.ceil(JSON.stringify(tools).length / 4);
    expect(result.schemaTokenEstimate).toBe(expectedTokens);
  });

  it("returns no findings when under all thresholds", async () => {
    const client = makeClient([makeTool("a"), makeTool("b")]);
    const result = await analyzeEfficiency(client);
    expect(result.findings).toHaveLength(0);
  });

  it("warns when tool count exceeds warning threshold", async () => {
    const tools = Array.from({ length: 25 }, (_, i) => makeTool(`tool_${i}`));
    const client = makeClient(tools);
    const result = await analyzeEfficiency(client);
    const finding = result.findings.find(
      (f) => f.category === "tool-count" && f.level === "warning",
    );
    expect(finding).toBeDefined();
    expect(finding!.value).toBe(25);
    expect(finding!.threshold).toBe(20);
  });

  it("critical when tool count exceeds critical threshold", async () => {
    const tools = Array.from({ length: 55 }, (_, i) => makeTool(`tool_${i}`));
    const client = makeClient(tools);
    const result = await analyzeEfficiency(client);
    const finding = result.findings.find(
      (f) => f.category === "tool-count" && f.level === "critical",
    );
    expect(finding).toBeDefined();
    expect(finding!.value).toBe(55);
  });

  it("warns when schema tokens exceed warning threshold", async () => {
    const tools = Array.from({ length: 15 }, (_, i) => makeTool(`tool_${i}`, "large"));
    const client = makeClient(tools);
    const result = await analyzeEfficiency(client);
    const finding = result.findings.find(
      (f) => f.category === "schema-size" && f.level === "warning",
    );
    expect(finding).toBeDefined();
  });

  it("accepts custom thresholds via config", async () => {
    const tools = Array.from({ length: 5 }, (_, i) => makeTool(`tool_${i}`));
    const client = makeClient(tools);
    const config: EfficiencyConfig = { maxToolsWarning: 3, maxToolsCritical: 10 };
    const result = await analyzeEfficiency(client, config);
    const finding = result.findings.find((f) => f.category === "tool-count");
    expect(finding).toBeDefined();
    expect(finding!.level).toBe("warning");
  });

  it("handles server with no tools capability", async () => {
    const client = makeClient([]);
    client.getServerCapabilities = () => ({});
    const result = await analyzeEfficiency(client);
    expect(result.toolCount).toBe(0);
    expect(result.findings).toHaveLength(0);
  });

  it("handles listTools error gracefully", async () => {
    const client = makeClient([]);
    client.listTools = async () => {
      throw new Error("not supported");
    };
    const result = await analyzeEfficiency(client);
    expect(result.toolCount).toBe(0);
    expect(result.schemaTokenEstimate).toBe(0);
  });
});
