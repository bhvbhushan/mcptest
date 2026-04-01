import type { MCPTest } from "../core/types.js";

export const promptsTests: MCPTest[] = [
  {
    id: "prompts-list-01",
    name: "Server lists prompts without error",
    description: "Verify the server responds to prompts/list request",
    category: "prompts",
    severity: "critical",
    tags: ["prompts", "list"],
    spec_ref: "https://modelcontextprotocol.io/specification/2025-11-25/server/prompts",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.prompts) {
        return { status: "skip", message: "Server does not advertise prompts capability", duration_ms: 0 };
      }

      try {
        const { prompts } = await ctx.client.listPrompts();
        return {
          status: "pass",
          message: `Server listed ${prompts.length} prompt(s)`,
          duration_ms: 0,
        };
      } catch (error) {
        return {
          status: "fail",
          message: `prompts/list failed: ${error instanceof Error ? error.message : String(error)}`,
          duration_ms: 0,
        };
      }
    },
  },

  {
    id: "prompts-list-02",
    name: "Prompt definitions have required fields",
    description: "Verify every prompt has a non-empty name",
    category: "prompts",
    severity: "critical",
    tags: ["prompts", "list", "schema"],
    spec_ref: "https://modelcontextprotocol.io/specification/2025-11-25/server/prompts",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.prompts) {
        return { status: "skip", message: "No prompts capability", duration_ms: 0 };
      }

      const { prompts } = await ctx.client.listPrompts();
      if (prompts.length === 0) {
        return { status: "skip", message: "No prompts to validate", duration_ms: 0 };
      }

      const invalid = prompts.filter((p) => !p.name);
      if (invalid.length > 0) {
        return {
          status: "fail",
          message: `${invalid.length} prompt(s) missing name`,
          duration_ms: 0,
        };
      }

      return {
        status: "pass",
        message: `All ${prompts.length} prompt(s) have required fields`,
        duration_ms: 0,
      };
    },
  },

  {
    id: "prompts-get-01",
    name: "Can get a listed prompt",
    description: "Verify a prompt can be retrieved via prompts/get",
    category: "prompts",
    severity: "critical",
    tags: ["prompts", "get"],
    spec_ref: "https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#getting-a-prompt",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.prompts) {
        return { status: "skip", message: "No prompts capability", duration_ms: 0 };
      }

      const { prompts } = await ctx.client.listPrompts();
      if (prompts.length === 0) {
        return { status: "skip", message: "No prompts to get", duration_ms: 0 };
      }

      const prompt = prompts[0];
      const args: Record<string, string> = {};
      if (prompt.arguments) {
        for (const arg of prompt.arguments) {
          if (arg.required) {
            args[arg.name] = "test";
          }
        }
      }

      try {
        const result = await ctx.client.getPrompt({ name: prompt.name, arguments: args });
        if (!result.messages || result.messages.length === 0) {
          return {
            status: "fail",
            message: `Prompt "${prompt.name}" returned empty messages`,
            duration_ms: 0,
          };
        }
        return {
          status: "pass",
          message: `Got "${prompt.name}" successfully (${result.messages.length} message(s))`,
          duration_ms: 0,
        };
      } catch (error) {
        return {
          status: "fail",
          message: `Failed to get "${prompt.name}": ${error instanceof Error ? error.message : String(error)}`,
          duration_ms: 0,
        };
      }
    },
  },
];
