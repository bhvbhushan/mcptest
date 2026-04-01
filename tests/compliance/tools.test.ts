import { describe, it, expect } from "vitest";
import { toolsTests } from "../../src/compliance/tools.js";
import type { MCPClientWrapper, TestContext, ToolDefinition } from "../../src/core/types.js";

const validTool: ToolDefinition = {
  name: "echo",
  description: "Echoes input",
  inputSchema: { type: "object", properties: { msg: { type: "string" } } },
};

const invalidNameTool: ToolDefinition = {
  name: "bad tool name!",
  description: "Invalid name",
  inputSchema: { type: "object" },
};

const missingSchemaTypeTool: ToolDefinition = {
  name: "no_type",
  description: "Missing type",
  inputSchema: { properties: {} },
};

function makeCtx(overrides?: Partial<MCPClientWrapper>): TestContext {
  const client: MCPClientWrapper = {
    getServerCapabilities: () => ({ tools: {} }),
    getServerVersion: () => ({ name: "test", version: "1.0" }),
    listTools: async () => ({ tools: [validTool] }),
    callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
    listResources: async () => ({ resources: [] }),
    readResource: async () => ({ contents: [] }),
    listPrompts: async () => ({ prompts: [] }),
    getPrompt: async () => ({ messages: [] }),
    ping: async () => {},
    ...overrides,
  };
  return { client, timeout: 5000 };
}

describe("tools compliance tests", () => {
  it("exports at least 4 tests", () => {
    expect(toolsTests.length).toBeGreaterThanOrEqual(4);
  });

  it("all tests have valid structure", () => {
    for (const test of toolsTests) {
      expect(test.id).toMatch(/^tools-/);
      expect(test.category).toBe("tools");
      expect(typeof test.run).toBe("function");
    }
  });

  describe("tools-list-01: server lists tools without error", () => {
    const test = toolsTests.find((t) => t.id === "tools-list-01")!;

    it("passes when tools capability advertised and list succeeds", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("skips when server has no tools capability", async () => {
      const result = await test.run(
        makeCtx({ getServerCapabilities: () => ({}) }),
      );
      expect(result.status).toBe("skip");
    });
  });

  describe("tools-list-02: tool definitions have required fields", () => {
    const test = toolsTests.find((t) => t.id === "tools-list-02")!;

    it("passes when all tools have name and inputSchema", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when a tool has no name", async () => {
      const result = await test.run(
        makeCtx({
          listTools: async () => ({
            tools: [{ name: "", description: "x", inputSchema: { type: "object" } }],
          }),
        }),
      );
      expect(result.status).toBe("fail");
    });

    it("skips when no tools", async () => {
      const result = await test.run(
        makeCtx({ listTools: async () => ({ tools: [] }) }),
      );
      expect(result.status).toBe("skip");
    });
  });

  describe("tools-list-03: tool names follow naming convention", () => {
    const test = toolsTests.find((t) => t.id === "tools-list-03")!;

    it("passes with valid tool names", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when tool name has invalid characters", async () => {
      const result = await test.run(
        makeCtx({ listTools: async () => ({ tools: [invalidNameTool] }) }),
      );
      expect(result.status).toBe("fail");
    });
  });

  describe("tools-list-04: inputSchema has type object", () => {
    const test = toolsTests.find((t) => t.id === "tools-list-04")!;

    it("passes when all schemas have type object", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when schema missing type", async () => {
      const result = await test.run(
        makeCtx({ listTools: async () => ({ tools: [missingSchemaTypeTool] }) }),
      );
      expect(result.status).toBe("fail");
    });
  });

  describe("tools-call-01: can call a listed tool", () => {
    const test = toolsTests.find((t) => t.id === "tools-call-01")!;

    it("passes when tool call returns result", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("skips when no tools available", async () => {
      const result = await test.run(
        makeCtx({ listTools: async () => ({ tools: [] }) }),
      );
      expect(result.status).toBe("skip");
    });

    it("fails when tool call throws protocol error", async () => {
      const result = await test.run(
        makeCtx({
          callTool: async () => {
            throw new Error("protocol error");
          },
        }),
      );
      expect(result.status).toBe("fail");
    });
  });

  describe("tools-call-02: calling nonexistent tool returns error", () => {
    const test = toolsTests.find((t) => t.id === "tools-call-02")!;

    it("passes when server rejects nonexistent tool", async () => {
      const result = await test.run(
        makeCtx({
          callTool: async () => {
            throw new Error("tool not found");
          },
        }),
      );
      expect(result.status).toBe("pass");
    });

    it("passes when server returns isError for nonexistent tool", async () => {
      const result = await test.run(
        makeCtx({
          callTool: async () => ({
            content: [{ type: "text", text: "not found" }],
            isError: true,
          }),
        }),
      );
      expect(result.status).toBe("pass");
    });

    it("fails when server silently succeeds for nonexistent tool", async () => {
      const result = await test.run(
        makeCtx({
          callTool: async () => ({
            content: [{ type: "text", text: "ok" }],
          }),
        }),
      );
      expect(result.status).toBe("fail");
    });
  });

  describe("tools-call-03: tool descriptions are present", () => {
    const test = toolsTests.find((t) => t.id === "tools-call-03")!;

    it("passes when all tools have descriptions", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when a tool lacks description", async () => {
      const result = await test.run(
        makeCtx({
          listTools: async () => ({
            tools: [{ name: "bare", inputSchema: { type: "object" } }],
          }),
        }),
      );
      expect(result.status).toBe("fail");
    });
  });
});
