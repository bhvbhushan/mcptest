import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "echo-test-server",
  version: "1.0.0",
});

server.tool(
  "echo",
  "Echoes the input message back",
  { message: z.string() },
  async ({ message }) => ({
    content: [{ type: "text", text: `Echo: ${message}` }],
  }),
);

server.resource(
  "greeting",
  "test://greeting",
  async () => ({
    contents: [
      {
        uri: "test://greeting",
        text: "Hello from echo server",
        mimeType: "text/plain",
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
