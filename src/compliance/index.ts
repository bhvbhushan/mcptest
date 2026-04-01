import type { MCPTest } from "../core/types.js";
import { lifecycleTests } from "./lifecycle.js";

export const complianceTests: MCPTest[] = [...lifecycleTests];
