import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  MCPClientWrapper,
  ListToolsResult,
  CallToolResult,
  ListResourcesResult,
  ReadResourceResult,
  ListPromptsResult,
  GetPromptResult,
} from "./types.js";

export interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport: "stdio" | "http";
  url?: string;
}

export async function createMCPClient(
  config: ServerConfig,
): Promise<MCPClientWrapper & { close(): Promise<void> }> {
  const client = new Client({ name: "mcptest", version: "0.1.0" });

  const transport =
    config.transport === "http"
      ? new StreamableHTTPClientTransport(new URL(config.url!))
      : new StdioClientTransport({
          command: config.command,
          args: config.args,
        });

  await client.connect(transport);

  return {
    getServerCapabilities() {
      return client.getServerCapabilities() as ReturnType<MCPClientWrapper["getServerCapabilities"]>;
    },
    getServerVersion() {
      return client.getServerVersion() as ReturnType<MCPClientWrapper["getServerVersion"]>;
    },
    async listTools(params) {
      return (await client.listTools(params)) as ListToolsResult;
    },
    async callTool(params) {
      return (await client.callTool(params)) as CallToolResult;
    },
    async listResources(params) {
      return (await client.listResources(params)) as ListResourcesResult;
    },
    async readResource(params) {
      return (await client.readResource(params)) as ReadResourceResult;
    },
    async listPrompts(params) {
      return (await client.listPrompts(params)) as ListPromptsResult;
    },
    async getPrompt(params) {
      return (await client.getPrompt(params)) as GetPromptResult;
    },
    async ping() {
      await client.ping();
    },
    async close() {
      await client.close();
    },
  };
}
