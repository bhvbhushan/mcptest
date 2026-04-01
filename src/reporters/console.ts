import type { SuiteResult, TestRunResult } from "../core/types.js";
import type { Reporter } from "./types.js";

interface ConsoleReporterOptions {
  color?: boolean;
}

const SYMBOLS = { pass: "PASS", fail: "FAIL", skip: "SKIP", error: "ERR!" };

export class ConsoleReporter implements Reporter {
  private color: boolean;

  constructor(options?: ConsoleReporterOptions) {
    this.color =
      options?.color ?? (process.stdout.isTTY ?? false);
  }

  format(result: SuiteResult): string {
    const lines: string[] = [];

    lines.push("");
    lines.push(this.bold(`mcptest v0.1.0`));
    lines.push(`Server: ${result.server}`);
    lines.push("");

    const grouped = groupByCategory(result.results);

    for (const [category, tests] of Object.entries(grouped)) {
      lines.push(this.bold(`  ${category}`));
      for (const t of tests) {
        lines.push(this.formatTestLine(t));
      }
      lines.push("");
    }

    lines.push(this.formatSummary(result));
    lines.push(this.formatScore(result.score));
    lines.push("");

    return lines.join("\n");
  }

  private formatTestLine(t: TestRunResult): string {
    const symbol = SYMBOLS[t.result.status];
    const duration =
      t.result.status !== "skip" ? ` (${Math.round(t.result.duration_ms)}ms)` : "";
    const label = `    ${this.colorStatus(symbol, t.result.status)} ${t.test.name}${duration}`;

    if (t.result.status === "fail" || t.result.status === "error") {
      return `${label}\n      ${this.dim(t.result.message ?? "")}`;
    }
    return label;
  }

  private formatSummary(result: SuiteResult): string {
    const parts: string[] = [];
    const { passed, failed, skipped, errors } = result.summary;

    if (passed > 0) parts.push(this.green(`${passed} passed`));
    if (failed > 0) parts.push(this.red(`${failed} failed`));
    if (errors > 0) parts.push(this.red(`${errors} errors`));
    if (skipped > 0) parts.push(this.yellow(`${skipped} skipped`));

    return `Results: ${parts.join(", ")} (${result.duration_ms}ms)`;
  }

  private formatScore(score: number): string {
    const label = `Score: ${score}/100`;
    if (score >= 80) return this.green(label);
    if (score >= 50) return this.yellow(label);
    return this.red(label);
  }

  private colorStatus(symbol: string, status: string): string {
    switch (status) {
      case "pass":
        return this.green(symbol);
      case "fail":
      case "error":
        return this.red(symbol);
      case "skip":
        return this.yellow(symbol);
      default:
        return symbol;
    }
  }

  private green(s: string): string {
    return this.color ? `\x1b[32m${s}\x1b[0m` : s;
  }
  private red(s: string): string {
    return this.color ? `\x1b[31m${s}\x1b[0m` : s;
  }
  private yellow(s: string): string {
    return this.color ? `\x1b[33m${s}\x1b[0m` : s;
  }
  private dim(s: string): string {
    return this.color ? `\x1b[2m${s}\x1b[0m` : s;
  }
  private bold(s: string): string {
    return this.color ? `\x1b[1m${s}\x1b[0m` : s;
  }
}

function groupByCategory(
  results: TestRunResult[],
): Record<string, TestRunResult[]> {
  const grouped: Record<string, TestRunResult[]> = {};
  for (const r of results) {
    const cat = r.test.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  }
  return grouped;
}
