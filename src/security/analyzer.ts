import type { ToolDefinition } from "../core/types.js";
import type { SecurityFinding, SecurityResult } from "./types.js";

interface SchemaProperty {
  type?: string;
  description?: string;
  [key: string]: unknown;
}

// Matches "env" anywhere in the name (handles camelCase like printEnv, kebab like get-env)
const ENV_NAME_PATTERN = /(env|environment)(?:var)?/i;
const ENV_DESC_PATTERN = /\b(returns?|prints?|dumps?|gets?|lists?|shows?)\b.*\b(env(ironment)?)\b/i;

// Matches eval/exec/execute at word-like boundaries, and run_code/run-code patterns
const CODE_NAME_PATTERN = /(^|[_\-])(eval|exec|run[_\-]?code|execute)($|[_\-])/i;
const CODE_PARAM_PATTERN = /^(code|function|script|expression|eval)$/i;

// Uses prefix matching (no trailing \b) and whole-string scan for caution keywords
const DANGEROUS_DESC_PATTERN = /(overwrite?|delete?|remov|drop|truncate?|destroy|kill|format).*?(without warning|without confirmation|irreversible?|permanent|caution|dangerous)/i;
// Matches dangerous operation names with non-alpha boundaries (handles snake_case)
const DANGEROUS_NAME_PATTERN = /(^|[^a-zA-Z])(write|delete|remove|drop|truncate|destroy|kill|format|overwrite)($|[^a-zA-Z])/i;

export function analyzeSecurity(tools: ToolDefinition[]): SecurityResult {
  const findings: SecurityFinding[] = [];

  for (const tool of tools) {
    checkEnvExposure(tool, findings);
    checkCodeExecution(tool, findings);
    checkDangerousDefaults(tool, findings);
  }

  return { findings };
}

function checkEnvExposure(tool: ToolDefinition, findings: SecurityFinding[]): void {
  const nameMatch = ENV_NAME_PATTERN.test(tool.name);
  const descMatch = tool.description ? ENV_DESC_PATTERN.test(tool.description) : false;

  if (nameMatch && descMatch) {
    findings.push({
      level: "critical",
      category: "env-exposure",
      message: `"${tool.name}" may expose environment variables — risk of leaking secrets`,
      toolName: tool.name,
    });
  } else if (nameMatch && tool.description && /\b(environment variable|env var)/i.test(tool.description)) {
    findings.push({
      level: "critical",
      category: "env-exposure",
      message: `"${tool.name}" may expose environment variables — risk of leaking secrets`,
      toolName: tool.name,
    });
  }
}

function checkCodeExecution(tool: ToolDefinition, findings: SecurityFinding[]): void {
  if (CODE_NAME_PATTERN.test(tool.name)) {
    findings.push({
      level: "warning",
      category: "code-execution",
      message: `"${tool.name}" appears to execute arbitrary code`,
      toolName: tool.name,
    });
    return;
  }

  const props = (tool.inputSchema.properties ?? {}) as Record<string, SchemaProperty>;
  for (const paramName of Object.keys(props)) {
    if (CODE_PARAM_PATTERN.test(paramName)) {
      findings.push({
        level: "warning",
        category: "code-execution",
        message: `"${tool.name}" has parameter "${paramName}" that suggests code execution`,
        toolName: tool.name,
      });
      return;
    }
  }
}

function checkDangerousDefaults(tool: ToolDefinition, findings: SecurityFinding[]): void {
  const nameIsDangerous = DANGEROUS_NAME_PATTERN.test(tool.name);
  const descIsDangerous = tool.description ? DANGEROUS_DESC_PATTERN.test(tool.description) : false;

  if (nameIsDangerous && descIsDangerous) {
    findings.push({
      level: "warning",
      category: "dangerous-defaults",
      message: `"${tool.name}" performs destructive operations — description warns of risk`,
      toolName: tool.name,
    });
  }
}
