import type { MCPTest } from "../core/types.js";

const TOOL_NAME_REGEX = /^[a-zA-Z0-9_.\-]{1,128}$/;

function generateMinimalArgs(
  inputSchema: Record<string, unknown>,
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const properties = inputSchema.properties as
    | Record<string, { type?: string }>
    | undefined;
  const required = inputSchema.required as string[] | undefined;

  if (!properties || !required) return args;

  for (const name of required) {
    const prop = properties[name];
    if (!prop) continue;
    switch (prop.type) {
      case "string":
        args[name] = "test";
        break;
      case "number":
      case "integer":
        args[name] = 0;
        break;
      case "boolean":
        args[name] = false;
        break;
      case "array":
        args[name] = [];
        break;
      case "object":
        args[name] = {};
        break;
      default:
        args[name] = "test";
        break;
    }
  }
  return args;
}

export const toolsTests: MCPTest[] = [
  {
    id: "tools-list-01",
    name: "Server lists tools without error",
    description: "Verify the server responds to tools/list request",
    category: "tools",
    severity: "critical",
    tags: ["tools", "list"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/server/tools#listing-tools",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.tools) {
        return {
          status: "skip",
          message: "Server does not advertise tools capability",
          duration_ms: 0,
        };
      }

      try {
        const { tools } = await ctx.client.listTools();
        return {
          status: "pass",
          message: `Server listed ${tools.length} tool(s)`,
          duration_ms: 0,
        };
      } catch (error) {
        return {
          status: "fail",
          message: `tools/list failed: ${error instanceof Error ? error.message : String(error)}`,
          duration_ms: 0,
        };
      }
    },
  },

  {
    id: "tools-list-02",
    name: "Tool definitions have required fields",
    description: "Verify every tool has a non-empty name and an inputSchema",
    category: "tools",
    severity: "critical",
    tags: ["tools", "list", "schema"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/server/tools#listing-tools",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.tools) {
        return { status: "skip", message: "No tools capability", duration_ms: 0 };
      }

      const { tools } = await ctx.client.listTools();
      if (tools.length === 0) {
        return { status: "skip", message: "No tools to validate", duration_ms: 0 };
      }

      const invalid = tools.filter((t) => !t.name || !t.inputSchema);
      if (invalid.length > 0) {
        const names = invalid.map((t) => t.name || "(empty)").join(", ");
        return {
          status: "fail",
          message: `${invalid.length} tool(s) missing required fields: ${names}`,
          duration_ms: 0,
        };
      }

      return {
        status: "pass",
        message: `All ${tools.length} tool(s) have name and inputSchema`,
        duration_ms: 0,
      };
    },
  },

  {
    id: "tools-list-03",
    name: "Tool names follow naming convention",
    description:
      "Verify tool names are 1-128 chars using only a-z, A-Z, 0-9, _, -, .",
    category: "tools",
    severity: "medium",
    tags: ["tools", "list", "naming"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/server/tools",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.tools) {
        return { status: "skip", message: "No tools capability", duration_ms: 0 };
      }

      const { tools } = await ctx.client.listTools();
      if (tools.length === 0) {
        return { status: "skip", message: "No tools to validate", duration_ms: 0 };
      }

      const invalid = tools.filter((t) => !TOOL_NAME_REGEX.test(t.name));
      if (invalid.length > 0) {
        const names = invalid.map((t) => `"${t.name}"`).join(", ");
        return {
          status: "fail",
          message: `Invalid tool names: ${names}`,
          duration_ms: 0,
        };
      }

      return {
        status: "pass",
        message: `All ${tools.length} tool name(s) follow convention`,
        duration_ms: 0,
      };
    },
  },

  {
    id: "tools-list-04",
    name: "Tool inputSchema has type object",
    description: "Verify every tool's inputSchema has type: object at root",
    category: "tools",
    severity: "high",
    tags: ["tools", "list", "schema"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/server/tools#listing-tools",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.tools) {
        return { status: "skip", message: "No tools capability", duration_ms: 0 };
      }

      const { tools } = await ctx.client.listTools();
      if (tools.length === 0) {
        return { status: "skip", message: "No tools to validate", duration_ms: 0 };
      }

      const invalid = tools.filter(
        (t) => (t.inputSchema as Record<string, unknown>).type !== "object",
      );
      if (invalid.length > 0) {
        const names = invalid.map((t) => t.name).join(", ");
        return {
          status: "fail",
          message: `Tool(s) with non-object inputSchema: ${names}`,
          duration_ms: 0,
        };
      }

      return {
        status: "pass",
        message: `All ${tools.length} tool(s) have valid inputSchema type`,
        duration_ms: 0,
      };
    },
  },

  {
    id: "tools-call-01",
    name: "Can call a listed tool",
    description: "Verify a tool can be invoked via tools/call",
    category: "tools",
    severity: "critical",
    tags: ["tools", "call"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/server/tools#calling-tools",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.tools) {
        return { status: "skip", message: "No tools capability", duration_ms: 0 };
      }

      const { tools } = await ctx.client.listTools();
      if (tools.length === 0) {
        return { status: "skip", message: "No tools to call", duration_ms: 0 };
      }

      const tool = tools[0];
      const args = generateMinimalArgs(tool.inputSchema);

      try {
        await ctx.client.callTool({ name: tool.name, arguments: args });
        return {
          status: "pass",
          message: `Called "${tool.name}" successfully`,
          duration_ms: 0,
        };
      } catch (error) {
        return {
          status: "fail",
          message: `Failed to call "${tool.name}": ${error instanceof Error ? error.message : String(error)}`,
          duration_ms: 0,
        };
      }
    },
  },

  {
    id: "tools-call-02",
    name: "Calling nonexistent tool returns error",
    description:
      "Verify the server rejects calls to tools that don't exist",
    category: "tools",
    severity: "high",
    tags: ["tools", "call", "error"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/server/tools#calling-tools",
    async run(ctx) {
      const fakeName = "__mcptest_nonexistent_tool_" + Date.now();

      try {
        const result = await ctx.client.callTool({ name: fakeName });
        if (result.isError) {
          return {
            status: "pass",
            message: "Server returned isError for nonexistent tool",
            duration_ms: 0,
          };
        }
        return {
          status: "fail",
          message:
            "Server returned success for nonexistent tool — should return error",
          duration_ms: 0,
        };
      } catch {
        return {
          status: "pass",
          message: "Server rejected nonexistent tool call with protocol error",
          duration_ms: 0,
        };
      }
    },
  },

  {
    id: "tools-call-03",
    name: "Tool descriptions are present",
    description: "Verify tools include description for LLM context",
    category: "tools",
    severity: "medium",
    tags: ["tools", "list", "description"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/server/tools#listing-tools",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.tools) {
        return { status: "skip", message: "No tools capability", duration_ms: 0 };
      }

      const { tools } = await ctx.client.listTools();
      if (tools.length === 0) {
        return { status: "skip", message: "No tools to validate", duration_ms: 0 };
      }

      const missing = tools.filter((t) => !t.description);
      if (missing.length > 0) {
        const names = missing.map((t) => t.name).join(", ");
        return {
          status: "fail",
          message: `${missing.length} tool(s) without description: ${names}`,
          duration_ms: 0,
        };
      }

      return {
        status: "pass",
        message: `All ${tools.length} tool(s) have descriptions`,
        duration_ms: 0,
      };
    },
  },
];
