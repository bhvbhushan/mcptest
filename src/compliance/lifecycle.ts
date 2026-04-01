import type { MCPTest } from "../core/types.js";

export const lifecycleTests: MCPTest[] = [
  {
    id: "lifecycle-init-01",
    name: "Server reports name and version",
    description:
      "Verify the server responds to initialization with a valid name and version",
    category: "lifecycle",
    severity: "critical",
    tags: ["lifecycle", "init"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#initialization",
    async run(ctx) {
      const version = ctx.client.getServerVersion();

      if (!version?.name) {
        return {
          status: "fail",
          message: "Server did not report a name during initialization",
          duration_ms: 0,
        };
      }
      if (!version?.version) {
        return {
          status: "fail",
          message: "Server did not report a version during initialization",
          duration_ms: 0,
        };
      }

      return {
        status: "pass",
        message: `Server: ${version.name} v${version.version}`,
        duration_ms: 0,
      };
    },
  },

  {
    id: "lifecycle-init-02",
    name: "Server reports capabilities",
    description:
      "Verify the server advertises its capabilities during initialization",
    category: "lifecycle",
    severity: "critical",
    tags: ["lifecycle", "init", "capabilities"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#initialization",
    async run(ctx) {
      const capabilities = ctx.client.getServerCapabilities();

      if (!capabilities) {
        return {
          status: "fail",
          message: "Server did not report capabilities during initialization",
          duration_ms: 0,
        };
      }

      const advertised = Object.keys(capabilities).filter(
        (k) => capabilities[k] != null,
      );

      return {
        status: "pass",
        message: `Capabilities: ${advertised.join(", ") || "none"}`,
        duration_ms: 0,
      };
    },
  },

  {
    id: "lifecycle-init-03",
    name: "Server responds to ping",
    description: "Verify the server responds to ping requests after initialization",
    category: "lifecycle",
    severity: "high",
    tags: ["lifecycle", "ping"],
    spec_ref:
      "https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/ping",
    async run(ctx) {
      try {
        await ctx.client.ping();
        return { status: "pass", message: "Ping successful", duration_ms: 0 };
      } catch (error) {
        return {
          status: "fail",
          message: `Ping failed: ${error instanceof Error ? error.message : String(error)}`,
          duration_ms: 0,
        };
      }
    },
  },
];
