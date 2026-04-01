import type { ToolDefinition } from "../core/types.js";
import type { QualityFinding, QualityResult } from "./types.js";

interface SchemaProperty {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  [key: string]: unknown;
}

export function analyzeQuality(tools: ToolDefinition[]): QualityResult {
  if (tools.length === 0) {
    return {
      findings: [],
      paramDescriptionCoverage: 1,
      toolsWithShortDescriptions: [],
      toolsWithVerboseDescriptions: [],
      deprecatedTools: [],
      duplicateToolGroups: [],
    };
  }

  const paramResult = checkParamDescriptions(tools);
  const descResult = checkDescriptionQuality(tools);
  const deprecatedResult = checkDeprecatedTools(tools);
  const duplicateResult = checkDuplicateSchemas(tools);
  const requiredDefaultFindings = checkRequiredDefaults(tools);

  return {
    findings: [
      ...paramResult.findings,
      ...descResult.findings,
      ...deprecatedResult.findings,
      ...duplicateResult.findings,
      ...requiredDefaultFindings,
    ],
    paramDescriptionCoverage: paramResult.paramDescriptionCoverage,
    toolsWithShortDescriptions: descResult.toolsWithShortDescriptions,
    toolsWithVerboseDescriptions: descResult.toolsWithVerboseDescriptions,
    deprecatedTools: deprecatedResult.deprecatedTools,
    duplicateToolGroups: duplicateResult.duplicateToolGroups,
  };
}

function checkParamDescriptions(tools: ToolDefinition[]) {
  const findings: QualityFinding[] = [];
  let totalParams = 0;
  let paramsWithDesc = 0;
  const toolsMissingParamDescs: string[] = [];

  for (const tool of tools) {
    const props = (tool.inputSchema.properties ?? {}) as Record<string, SchemaProperty>;
    const propNames = Object.keys(props);
    if (propNames.length === 0) continue;

    totalParams += propNames.length;
    let toolMissing = 0;
    for (const name of propNames) {
      if (props[name].description) {
        paramsWithDesc++;
      } else {
        toolMissing++;
      }
    }
    if (toolMissing > 0) {
      toolsMissingParamDescs.push(tool.name);
    }
  }

  const paramDescriptionCoverage = totalParams === 0 ? 1 : paramsWithDesc / totalParams;

  if (totalParams > 0 && paramDescriptionCoverage < 0.5) {
    findings.push({
      level: "critical",
      category: "param-descriptions",
      message: `${totalParams - paramsWithDesc} of ${totalParams} parameters lack descriptions (${Math.round((1 - paramDescriptionCoverage) * 100)}%)`,
      details: toolsMissingParamDescs,
    });
  } else if (totalParams > 0 && paramDescriptionCoverage < 0.8) {
    findings.push({
      level: "warning",
      category: "param-descriptions",
      message: `${totalParams - paramsWithDesc} of ${totalParams} parameters lack descriptions (${Math.round((1 - paramDescriptionCoverage) * 100)}%)`,
      details: toolsMissingParamDescs,
    });
  }

  return { findings, paramDescriptionCoverage, toolsMissingParamDescs };
}

function checkDescriptionQuality(tools: ToolDefinition[]) {
  const findings: QualityFinding[] = [];
  const toolsWithShortDescriptions: string[] = [];
  const toolsWithVerboseDescriptions: string[] = [];

  for (const tool of tools) {
    const desc = tool.description ?? "";
    if (desc.length > 0 && desc.length < 20) {
      toolsWithShortDescriptions.push(tool.name);
    }
    if (desc.length > 500) {
      toolsWithVerboseDescriptions.push(tool.name);
    }
  }

  if (toolsWithShortDescriptions.length > 0) {
    findings.push({
      level: "warning",
      category: "description-quality",
      message: `${toolsWithShortDescriptions.length} tool(s) have short descriptions (<20 chars)`,
      details: toolsWithShortDescriptions,
    });
  }

  if (toolsWithVerboseDescriptions.length > 0) {
    findings.push({
      level: "warning",
      category: "description-quality",
      message: `${toolsWithVerboseDescriptions.length} tool(s) have verbose descriptions (>500 chars)`,
      details: toolsWithVerboseDescriptions,
    });
  }

  return { findings, toolsWithShortDescriptions, toolsWithVerboseDescriptions };
}

function checkDeprecatedTools(tools: ToolDefinition[]) {
  const findings: QualityFinding[] = [];
  const deprecatedTools: string[] = [];
  const deprecatedRegex = /\b(deprecated|obsolete)\b/i;

  for (const tool of tools) {
    if (tool.description && deprecatedRegex.test(tool.description)) {
      deprecatedTools.push(tool.name);
    }
  }

  if (deprecatedTools.length > 0) {
    findings.push({
      level: "critical",
      category: "deprecated-tools",
      message: `${deprecatedTools.length} deprecated tool(s) still listed: ${deprecatedTools.join(", ")}`,
      details: deprecatedTools,
    });
  }

  return { findings, deprecatedTools };
}

function checkDuplicateSchemas(tools: ToolDefinition[]) {
  const findings: QualityFinding[] = [];
  const duplicateToolGroups = findDuplicateSchemas(tools);

  for (const group of duplicateToolGroups) {
    findings.push({
      level: "warning",
      category: "duplicate-tools",
      message: `Tools with identical schemas: ${group.join(", ")}`,
      details: group,
    });
  }

  return { findings, duplicateToolGroups };
}

function checkRequiredDefaults(tools: ToolDefinition[]): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const toolsWithRequiredDefaults: string[] = [];

  for (const tool of tools) {
    const props = (tool.inputSchema.properties ?? {}) as Record<string, SchemaProperty>;
    const required = (tool.inputSchema.required as string[]) ?? [];
    const hasDefault = required.filter((r) => props[r]?.default !== undefined);
    if (hasDefault.length > 0) {
      toolsWithRequiredDefaults.push(tool.name);
    }
  }

  if (toolsWithRequiredDefaults.length > 0) {
    findings.push({
      level: "warning",
      category: "schema-issues",
      message: `${toolsWithRequiredDefaults.length} tool(s) mark params as required despite having defaults: ${toolsWithRequiredDefaults.join(", ")}`,
      details: toolsWithRequiredDefaults,
    });
  }

  return findings;
}

function findDuplicateSchemas(tools: ToolDefinition[]): string[][] {
  const schemaMap = new Map<string, string[]>();

  for (const tool of tools) {
    const { properties, required } = tool.inputSchema as {
      properties?: Record<string, unknown>;
      required?: string[];
    };
    const key = JSON.stringify({ properties: properties ?? {}, required: required ?? [] });
    const group = schemaMap.get(key) ?? [];
    group.push(tool.name);
    schemaMap.set(key, group);
  }

  return Array.from(schemaMap.values()).filter((group) => group.length > 1);
}
