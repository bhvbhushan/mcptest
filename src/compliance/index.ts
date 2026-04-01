import type { MCPTest } from "../core/types.js";
import { lifecycleTests } from "./lifecycle.js";
import { toolsTests } from "./tools.js";
import { resourcesTests } from "./resources.js";
import { promptsTests } from "./prompts.js";

export const complianceTests: MCPTest[] = [
  ...lifecycleTests,
  ...toolsTests,
  ...resourcesTests,
  ...promptsTests,
];
