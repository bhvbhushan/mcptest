import type { MCPClientWrapper } from "../core/types.js";
import type {
  EfficiencyResult,
  EfficiencyFinding,
  EfficiencyConfig,
} from "./types.js";
import { DEFAULT_EFFICIENCY_CONFIG } from "./types.js";

export async function analyzeEfficiency(
  client: MCPClientWrapper,
  config?: EfficiencyConfig,
): Promise<EfficiencyResult> {
  const cfg = { ...DEFAULT_EFFICIENCY_CONFIG, ...config };

  let tools: { name: string; inputSchema: Record<string, unknown> }[] = [];
  try {
    const capabilities = client.getServerCapabilities();
    if (!capabilities?.tools) {
      return { toolCount: 0, schemaTokenEstimate: 0, findings: [] };
    }

    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor ? { cursor } : undefined);
      tools.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
  } catch {
    return { toolCount: 0, schemaTokenEstimate: 0, findings: [] };
  }

  const toolCount = tools.length;
  const schemaTokenEstimate = Math.ceil(JSON.stringify(tools).length / 4);
  const findings: EfficiencyFinding[] = [];

  if (toolCount > cfg.maxToolsCritical!) {
    findings.push({
      level: "critical",
      category: "tool-count",
      message: `Server exposes ${toolCount} tools (critical threshold: ${cfg.maxToolsCritical})`,
      value: toolCount,
      threshold: cfg.maxToolsCritical!,
    });
  } else if (toolCount > cfg.maxToolsWarning!) {
    findings.push({
      level: "warning",
      category: "tool-count",
      message: `Server exposes ${toolCount} tools (warning threshold: ${cfg.maxToolsWarning})`,
      value: toolCount,
      threshold: cfg.maxToolsWarning!,
    });
  }

  if (schemaTokenEstimate > cfg.maxSchemaTokensCritical!) {
    findings.push({
      level: "critical",
      category: "schema-size",
      message: `Estimated schema tokens: ${schemaTokenEstimate} (critical threshold: ${cfg.maxSchemaTokensCritical})`,
      value: schemaTokenEstimate,
      threshold: cfg.maxSchemaTokensCritical!,
    });
  } else if (schemaTokenEstimate > cfg.maxSchemaTokensWarning!) {
    findings.push({
      level: "warning",
      category: "schema-size",
      message: `Estimated schema tokens: ${schemaTokenEstimate} (warning threshold: ${cfg.maxSchemaTokensWarning})`,
      value: schemaTokenEstimate,
      threshold: cfg.maxSchemaTokensWarning!,
    });
  }

  return { toolCount, schemaTokenEstimate, findings };
}
