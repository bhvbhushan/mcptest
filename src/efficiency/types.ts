export interface EfficiencyFinding {
  level: "warning" | "critical";
  category: "tool-count" | "schema-size";
  message: string;
  value: number;
  threshold: number;
}

export interface EfficiencyResult {
  toolCount: number;
  schemaTokenEstimate: number;
  findings: EfficiencyFinding[];
}

export interface EfficiencyConfig {
  maxToolsWarning?: number;
  maxToolsCritical?: number;
  maxSchemaTokensWarning?: number;
  maxSchemaTokensCritical?: number;
}

export const DEFAULT_EFFICIENCY_CONFIG: EfficiencyConfig = {
  maxToolsWarning: 20,
  maxToolsCritical: 50,
  maxSchemaTokensWarning: 10000,
  maxSchemaTokensCritical: 30000,
};
