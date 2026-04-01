import { describe, it, expect, vi } from "vitest";
import { createMCPClient } from "../../src/core/client.js";

// Mock the SDK client
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => {
  const mockClient = {
    connect: vi.fn(),
    close: vi.fn(),
    getServerCapabilities: vi.fn().mockReturnValue({ tools: {} }),
    getServerVersion: vi.fn().mockReturnValue({ name: "test", version: "1.0" }),
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
    callTool: vi.fn().mockResolvedValue({ content: [] }),
    listResources: vi.fn().mockResolvedValue({ resources: [] }),
    readResource: vi.fn().mockResolvedValue({ contents: [] }),
    listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
    getPrompt: vi.fn().mockResolvedValue({ messages: [] }),
    ping: vi.fn().mockResolvedValue({}),
  };

  return {
    Client: vi.fn().mockImplementation(() => mockClient),
    __mockClient: mockClient,
  };
});

// Mock the stdio transport
vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => {
  return {
    StdioClientTransport: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      close: vi.fn(),
    })),
  };
});

// Mock the streamable HTTP transport
vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => {
  return {
    StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      close: vi.fn(),
    })),
  };
});

describe("createMCPClient", () => {
  it("creates a client for stdio transport", async () => {
    const wrapper = await createMCPClient({
      command: "node",
      args: ["server.js"],
      transport: "stdio",
    });

    expect(wrapper.getServerCapabilities()).toEqual({ tools: {} });
    expect(wrapper.getServerVersion()).toEqual({ name: "test", version: "1.0" });
  });

  it("creates a client for http transport", async () => {
    const wrapper = await createMCPClient({
      command: "",
      transport: "http",
      url: "http://localhost:3000/mcp",
    });

    expect(wrapper.getServerCapabilities()).toBeDefined();
  });

  it("delegates listTools to underlying client", async () => {
    const wrapper = await createMCPClient({
      command: "node",
      args: ["server.js"],
      transport: "stdio",
    });

    const result = await wrapper.listTools();
    expect(result.tools).toEqual([]);
  });

  it("delegates callTool to underlying client", async () => {
    const wrapper = await createMCPClient({
      command: "node",
      args: ["server.js"],
      transport: "stdio",
    });

    const result = await wrapper.callTool({ name: "echo", arguments: { msg: "hi" } });
    expect(result.content).toEqual([]);
  });

  it("close disconnects the client", async () => {
    const wrapper = await createMCPClient({
      command: "node",
      args: ["server.js"],
      transport: "stdio",
    });

    await wrapper.close();
    // Should not throw
  });
});
