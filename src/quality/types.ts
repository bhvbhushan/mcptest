export interface QualityFinding {
  level: "warning" | "critical";
  category:
    | "param-descriptions"
    | "description-quality"
    | "deprecated-tools"
    | "duplicate-tools"
    | "schema-issues";
  message: string;
  details?: string[];
}

export interface QualityResult {
  findings: QualityFinding[];
  paramDescriptionCoverage: number;
  toolsWithShortDescriptions: string[];
  toolsWithVerboseDescriptions: string[];
  deprecatedTools: string[];
  duplicateToolGroups: string[][];
}
