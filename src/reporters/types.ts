import type { SuiteResult } from "../core/types.js";

export interface Reporter {
  format(result: SuiteResult): string;
}
