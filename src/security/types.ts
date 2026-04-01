export interface SecurityFinding {
  level: "warning" | "critical";
  category: "env-exposure" | "code-execution" | "dangerous-defaults";
  message: string;
  toolName: string;
}

export interface SecurityResult {
  findings: SecurityFinding[];
}
