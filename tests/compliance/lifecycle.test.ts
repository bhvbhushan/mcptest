import { describe, it, expect } from "vitest";
import { lifecycleTests } from "../../src/compliance/lifecycle.js";
import type { MCPClientWrapper, TestContext } from "../../src/core/types.js";

function makeCtx(overrides?: Partial<MCPClientWrapper>): TestContext {
  const client: MCPClientWrapper = {
    getServerCapabilities: () => ({ tools: {} }),
    getServerVersion: () => ({ name: "test-server", version: "1.0.0" }),
    listTools: async () => ({ tools: [] }),
    callTool: async () => ({ content: [] }),
    listResources: async () => ({ resources: [] }),
    readResource: async () => ({ contents: [] }),
    listPrompts: async () => ({ prompts: [] }),
    getPrompt: async () => ({ messages: [] }),
    ping: async () => {},
    ...overrides,
  };
  return { client, timeout: 5000 };
}

describe("lifecycle compliance tests", () => {
  it("exports at least 3 tests", () => {
    expect(lifecycleTests.length).toBeGreaterThanOrEqual(3);
  });

  it("all tests have valid structure", () => {
    for (const test of lifecycleTests) {
      expect(test.id).toMatch(/^lifecycle-/);
      expect(test.category).toBe("lifecycle");
      expect(test.severity).toBeTruthy();
      expect(typeof test.run).toBe("function");
    }
  });

  describe("lifecycle-init-01: server reports name and version", () => {
    const test = lifecycleTests.find((t) => t.id === "lifecycle-init-01")!;

    it("passes when server reports name and version", async () => {
      const ctx = makeCtx();
      const result = await test.run(ctx);
      expect(result.status).toBe("pass");
    });

    it("fails when server name is missing", async () => {
      const ctx = makeCtx({
        getServerVersion: () => ({ name: "", version: "1.0.0" }),
      });
      const result = await test.run(ctx);
      expect(result.status).toBe("fail");
    });

    it("fails when server version is missing", async () => {
      const ctx = makeCtx({
        getServerVersion: () => ({ name: "server", version: "" }),
      });
      const result = await test.run(ctx);
      expect(result.status).toBe("fail");
    });
  });

  describe("lifecycle-init-02: server reports capabilities", () => {
    const test = lifecycleTests.find((t) => t.id === "lifecycle-init-02")!;

    it("passes when capabilities are present", async () => {
      const ctx = makeCtx();
      const result = await test.run(ctx);
      expect(result.status).toBe("pass");
    });

    it("fails when capabilities are undefined", async () => {
      const ctx = makeCtx({
        getServerCapabilities: () => undefined,
      });
      const result = await test.run(ctx);
      expect(result.status).toBe("fail");
    });
  });

  describe("lifecycle-init-03: server responds to ping", () => {
    const test = lifecycleTests.find((t) => t.id === "lifecycle-init-03")!;

    it("passes when ping succeeds", async () => {
      const ctx = makeCtx();
      const result = await test.run(ctx);
      expect(result.status).toBe("pass");
    });

    it("fails when ping throws", async () => {
      const ctx = makeCtx({
        ping: async () => {
          throw new Error("ping failed");
        },
      });
      const result = await test.run(ctx);
      expect(result.status).toBe("fail");
    });
  });
});
