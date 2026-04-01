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
    lines.push(this.bold(`mcp-quality-gate v0.1.0`));
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

    if (result.efficiency) {
      lines.push(this.bold("  efficiency"));
      lines.push(
        `    ${result.efficiency.toolCount} tools, ~${result.efficiency.schemaTokenEstimate} schema tokens`,
      );
      for (const f of result.efficiency.findings) {
        const label = f.level === "critical" ? this.red("CRIT") : this.yellow("WARN");
        lines.push(`    ${label} ${f.message}`);
      }
      lines.push("");
    }

    if (result.quality) {
      lines.push(this.bold("  quality"));
      lines.push(`    Param description coverage: ${Math.round(result.quality.paramDescriptionCoverage * 100)}%`);
      if (result.quality.deprecatedTools.length > 0) {
        lines.push(`    Deprecated: ${result.quality.deprecatedTools.join(", ")}`);
      }
      if (result.quality.duplicateToolGroups.length > 0) {
        for (const group of result.quality.duplicateToolGroups) {
          lines.push(`    Duplicates: ${group.join(", ")}`);
        }
      }
      for (const f of result.quality.findings) {
        const label = f.level === "critical" ? this.red("CRIT") : this.yellow("WARN");
        lines.push(`    ${label} ${f.message}`);
      }
      lines.push("");
    }

    if (result.security) {
      lines.push(this.bold("  security"));
      if (result.security.findings.length === 0) {
        lines.push(`    ${this.green("No issues found")}`);
      }
      for (const f of result.security.findings) {
        const label = f.level === "critical" ? this.red("CRIT") : this.yellow("WARN");
        lines.push(`    ${label} ${f.message}`);
      }
      lines.push("");
    }

    lines.push(this.formatSummary(result));
    lines.push(this.formatScore(result));
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

  private formatScore(result: SuiteResult): string {
    const score = result.score;
    const label = `Score: ${score}/100`;
    const colored = score >= 80 ? this.green(label) : score >= 50 ? this.yellow(label) : this.red(label);

    const parts: string[] = [];
    const { passed, skipped } = result.summary;
    const ran = result.summary.total - skipped;
    if (ran > 0) parts.push(`compliance ${Math.round((passed / ran) * 40)}/40`);
    if (result.quality) {
      let qs = 25;
      for (const f of result.quality.findings) qs -= f.level === "critical" ? 5 : 2;
      parts.push(`quality ${Math.max(0, qs)}/25`);
    }
    if (result.efficiency) {
      let es = 15;
      for (const f of result.efficiency.findings) es -= f.level === "critical" ? 8 : 3;
      parts.push(`efficiency ${Math.max(0, es)}/15`);
    }
    if (result.security) {
      let ss = 20;
      for (const f of result.security.findings) ss -= f.level === "critical" ? 10 : 5;
      parts.push(`security ${Math.max(0, ss)}/20`);
    }

    return parts.length > 0 ? `${colored}\n  ${this.dim(parts.join(" | "))}` : colored;
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
