import type { SuiteResult } from "../core/types.js";
import type { Reporter } from "./types.js";

export class JsonReporter implements Reporter {
  format(result: SuiteResult): string {
    const output = {
      version: "0.1.0",
      ...result,
    };
    return JSON.stringify(output, null, 2);
  }
}
