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
  { message: z.string().describe("The message to echo back") },
  async ({ message }) => ({
    content: [{ type: "text", text: `Echo: ${message}` }],
  }),
);

server.tool(
  "add",
  "Adds two numbers together and returns the result",
  {
    a: z.number().describe("The first number to add"),
    b: z.number().describe("The second number to add"),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }),
);

server.resource(
  "greeting",
  "test://greeting",
  { description: "A greeting message from the echo server" },
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

server.prompt(
  "greeting",
  "Generates a greeting message",
  { name: z.string().optional().describe("Name to greet") },
  async ({ name }) => ({
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text: `Hello, ${name ?? "World"}!` },
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
