import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  MCPClientWrapper,
  ToolDefinition,
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

  if (config.transport === "http" && !config.url) {
    throw new Error("URL is required for HTTP transport");
  }

  const transport =
    config.transport === "http"
      ? new StreamableHTTPClientTransport(new URL(config.url!))
      : new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: config.env
            ? { ...process.env as Record<string, string>, ...config.env }
            : undefined,
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
      return (await client.getPrompt(params)) as unknown as GetPromptResult;
    },
    async ping() {
      await client.ping();
    },
    async close() {
      await client.close();
    },
  };
}

export async function listAllTools(
  client: MCPClientWrapper,
): Promise<ToolDefinition[]> {
  const caps = client.getServerCapabilities();
  if (!caps?.tools) return [];

  const tools: ToolDefinition[] = [];
  let cursor: string | undefined;
  do {
    const page = await client.listTools(cursor ? { cursor } : undefined);
    tools.push(...page.tools);
    cursor = page.nextCursor;
  } while (cursor);
  return tools;
}
