import type { MCPTest } from "../core/types.js";

export const resourcesTests: MCPTest[] = [
  {
    id: "resources-list-01",
    name: "Server lists resources without error",
    description: "Verify the server responds to resources/list request",
    category: "resources",
    severity: "critical",
    tags: ["resources", "list"],
    spec_ref: "https://modelcontextprotocol.io/specification/2025-11-25/server/resources",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.resources) {
        return { status: "skip", message: "Server does not advertise resources capability", duration_ms: 0 };
      }

      try {
        const { resources } = await ctx.client.listResources();
        return {
          status: "pass",
          message: `Server listed ${resources.length} resource(s)`,
          duration_ms: 0,
        };
      } catch (error) {
        return {
          status: "fail",
          message: `resources/list failed: ${error instanceof Error ? error.message : String(error)}`,
          duration_ms: 0,
        };
      }
    },
  },

  {
    id: "resources-list-02",
    name: "Resource definitions have required fields",
    description: "Verify every resource has a non-empty uri and name",
    category: "resources",
    severity: "critical",
    tags: ["resources", "list", "schema"],
    spec_ref: "https://modelcontextprotocol.io/specification/2025-11-25/server/resources",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.resources) {
        return { status: "skip", message: "No resources capability", duration_ms: 0 };
      }

      const { resources } = await ctx.client.listResources();
      if (resources.length === 0) {
        return { status: "skip", message: "No resources to validate", duration_ms: 0 };
      }

      const invalid = resources.filter((r) => !r.uri || !r.name);
      if (invalid.length > 0) {
        const uris = invalid.map((r) => r.uri || "(empty)").join(", ");
        return {
          status: "fail",
          message: `${invalid.length} resource(s) missing required fields: ${uris}`,
          duration_ms: 0,
        };
      }

      return {
        status: "pass",
        message: `All ${resources.length} resource(s) have uri and name`,
        duration_ms: 0,
      };
    },
  },

  {
    id: "resources-list-03",
    name: "Resource descriptions are present",
    description: "Verify resources include description for LLM context",
    category: "resources",
    severity: "medium",
    tags: ["resources", "list", "description"],
    spec_ref: "https://modelcontextprotocol.io/specification/2025-11-25/server/resources",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.resources) {
        return { status: "skip", message: "No resources capability", duration_ms: 0 };
      }

      const { resources } = await ctx.client.listResources();
      if (resources.length === 0) {
        return { status: "skip", message: "No resources to validate", duration_ms: 0 };
      }

      const missing = resources.filter((r) => !r.description);
      if (missing.length > 0) {
        const names = missing.map((r) => r.name).join(", ");
        return {
          status: "fail",
          message: `${missing.length} resource(s) without description: ${names}`,
          duration_ms: 0,
        };
      }

      return {
        status: "pass",
        message: `All ${resources.length} resource(s) have descriptions`,
        duration_ms: 0,
      };
    },
  },

  {
    id: "resources-read-01",
    name: "Can read a listed resource",
    description: "Verify a resource can be read via resources/read",
    category: "resources",
    severity: "critical",
    tags: ["resources", "read"],
    spec_ref: "https://modelcontextprotocol.io/specification/2025-11-25/server/resources#reading-resources",
    async run(ctx) {
      const caps = ctx.client.getServerCapabilities();
      if (!caps?.resources) {
        return { status: "skip", message: "No resources capability", duration_ms: 0 };
      }

      const { resources } = await ctx.client.listResources();
      if (resources.length === 0) {
        return { status: "skip", message: "No resources to read", duration_ms: 0 };
      }

      const resource = resources[0];
      try {
        const result = await ctx.client.readResource({ uri: resource.uri });
        if (!result.contents || result.contents.length === 0) {
          return {
            status: "fail",
            message: `Resource "${resource.name}" returned empty contents`,
            duration_ms: 0,
          };
        }
        return {
          status: "pass",
          message: `Read "${resource.name}" successfully (${result.contents.length} content block(s))`,
          duration_ms: 0,
        };
      } catch (error) {
        return {
          status: "fail",
          message: `Failed to read "${resource.name}": ${error instanceof Error ? error.message : String(error)}`,
          duration_ms: 0,
        };
      }
    },
  },
];
