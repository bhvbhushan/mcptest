import { describe, it, expect } from "vitest";
import { resourcesTests } from "../../src/compliance/resources.js";
import type { MCPClientWrapper, TestContext } from "../../src/core/types.js";

function makeClient(overrides?: Partial<MCPClientWrapper>): MCPClientWrapper {
  return {
    getServerCapabilities: () => ({ resources: {} }),
    getServerVersion: () => ({ name: "test", version: "1.0" }),
    listTools: async () => ({ tools: [] }),
    callTool: async () => ({ content: [] }),
    listResources: async () => ({
      resources: [
        { uri: "test://greeting", name: "greeting", description: "A greeting", mimeType: "text/plain" },
      ],
    }),
    readResource: async () => ({
      contents: [{ uri: "test://greeting", text: "Hello", mimeType: "text/plain" }],
    }),
    listPrompts: async () => ({ prompts: [] }),
    getPrompt: async () => ({ messages: [] }),
    ping: async () => {},
    ...overrides,
  };
}

function makeCtx(overrides?: Partial<MCPClientWrapper>): TestContext {
  return { client: makeClient(overrides), timeout: 5000 };
}

describe("resource compliance tests", () => {
  it("has 4 tests", () => {
    expect(resourcesTests).toHaveLength(4);
  });

  describe("resources-list-01: lists resources", () => {
    const test = resourcesTests.find((t) => t.id === "resources-list-01")!;

    it("passes when server lists resources", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("skips when no resources capability", async () => {
      const result = await test.run(makeCtx({ getServerCapabilities: () => ({}) }));
      expect(result.status).toBe("skip");
    });
  });

  describe("resources-list-02: required fields", () => {
    const test = resourcesTests.find((t) => t.id === "resources-list-02")!;

    it("passes when all resources have uri and name", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when resource lacks uri", async () => {
      const result = await test.run(makeCtx({
        listResources: async () => ({
          resources: [{ uri: "", name: "test", mimeType: "text/plain" }],
        }),
      }));
      expect(result.status).toBe("fail");
    });
  });

  describe("resources-list-03: descriptions present", () => {
    const test = resourcesTests.find((t) => t.id === "resources-list-03")!;

    it("passes when all resources have descriptions", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when resource lacks description", async () => {
      const result = await test.run(makeCtx({
        listResources: async () => ({
          resources: [{ uri: "test://x", name: "x" }],
        }),
      }));
      expect(result.status).toBe("fail");
    });
  });

  describe("resources-read-01: can read a resource", () => {
    const test = resourcesTests.find((t) => t.id === "resources-read-01")!;

    it("passes when resource can be read", async () => {
      const result = await test.run(makeCtx());
      expect(result.status).toBe("pass");
    });

    it("fails when read returns empty contents", async () => {
      const result = await test.run(makeCtx({
        readResource: async () => ({ contents: [] }),
      }));
      expect(result.status).toBe("fail");
    });
  });
});
