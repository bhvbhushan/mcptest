import { describe, it, expect } from "vitest";
import { promptsTests } from "../../src/compliance/prompts.js";
import type { MCPClientWrapper, TestContext } from "../../src/core/types.js";

function makeClient(overrides?: Partial<MCPClientWrapper>): MCPClientWrapper {
  return {
    getServerCapabilities: () => ({ prompts: {} }),
    getServerVersion: () => ({ name: "test", version: "1.0" }),
    listTools: async () => ({ tools: [] }),
    callTool: async () => ({ content: [] }),
    listResources: async () => ({ resources: [] }),
    readResource: async () => ({ contents: [] }),
    listPrompts: async () => ({
      prompts: [
        { name: "greeting", description: "A greeting prompt", arguments: [{ name: "name", description: "Name", required: true }] },
      ],
    }),
    getPrompt: async () => ({
      messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }] }],
    }),
    ping: async () => {},
    ...overrides,
  };
}

function makeCtx(overrides?: Partial<MCPClientWrapper>): TestContext {
  return { client: makeClient(overrides), timeout: 5000 };
}

describe("prompt compliance tests", () => {
  it("has 3 tests", () => {
    expect(promptsTests).toHaveLength(3);
  });

  describe("prompts-list-01: lists prompts", () => {
    const test = promptsTests.find((t) => t.id === "prompts-list-01")!;

    it("passes when server lists prompts", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("skips when no prompts capability", async () => {
      const result = await test.run(makeCtx({ getServerCapabilities: () => ({}) }));
      expect(result.status).toBe("skip");
    });
  });

  describe("prompts-list-02: required fields", () => {
    const test = promptsTests.find((t) => t.id === "prompts-list-02")!;

    it("passes when all prompts have name", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when prompt lacks name", async () => {
      const result = await test.run(makeCtx({
        listPrompts: async () => ({
          prompts: [{ name: "", description: "test" }],
        }),
      }));
      expect(result.status).toBe("fail");
    });
  });

  describe("prompts-get-01: can get a prompt", () => {
    const test = promptsTests.find((t) => t.id === "prompts-get-01")!;

    it("passes when prompt can be retrieved", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when getPrompt returns no messages", async () => {
      const result = await test.run(makeCtx({
        getPrompt: async () => ({ messages: [] }),
      }));
      expect(result.status).toBe("fail");
    });
  });
});
