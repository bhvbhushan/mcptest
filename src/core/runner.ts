import type {
  MCPTest,
  TestContext,
  TestResult,
  TestRunResult,
  SuiteResult,
  RunOptions,
} from "./types.js";
import type { EfficiencyResult } from "../efficiency/types.js";
import type { QualityResult } from "../quality/types.js";
import type { SecurityResult } from "../security/types.js";

export async function runTests(
  tests: MCPTest[],
  ctx: TestContext,
  options?: RunOptions,
  serverLabel?: string,
  efficiency?: EfficiencyResult,
  quality?: QualityResult,
  security?: SecurityResult,
): Promise<SuiteResult> {
  const start = performance.now();
  const results: TestRunResult[] = [];

  for (const test of tests) {
    const shouldSkip =
      (options?.skip?.includes(test.id)) ||
      (options?.only && !options.only.includes(test.id));

    if (shouldSkip) {
      results.push({
        test: pickTestMeta(test),
        result: { status: "skip", message: "skipped by filter", duration_ms: 0 },
      });
      continue;
    }

    const testStart = performance.now();
    let result: TestResult;

    try {
      result = await Promise.race([
        test.run(ctx),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Test timed out after ${ctx.timeout}ms`)),
            ctx.timeout,
          ),
        ),
      ]);
      result.duration_ms = performance.now() - testStart;
    } catch (error) {
      result = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        duration_ms: performance.now() - testStart,
      };
    }

    results.push({ test: pickTestMeta(test), result });
  }

  return buildSuiteResult(results, performance.now() - start, serverLabel, efficiency, quality, security);
}

function pickTestMeta(
  test: MCPTest,
): Pick<MCPTest, "id" | "name" | "category" | "severity"> {
  return {
    id: test.id,
    name: test.name,
    category: test.category,
    severity: test.severity,
  };
}

function buildSuiteResult(
  results: TestRunResult[],
  duration_ms: number,
  serverLabel?: string,
  efficiency?: EfficiencyResult,
  quality?: QualityResult,
  security?: SecurityResult,
): SuiteResult {
  const passed = results.filter((r) => r.result.status === "pass").length;
  const failed = results.filter((r) => r.result.status === "fail").length;
  const skipped = results.filter((r) => r.result.status === "skip").length;
  const errors = results.filter((r) => r.result.status === "error").length;
  const total = results.length;
  const ran = total - skipped;

  return {
    server: serverLabel ?? "",
    timestamp: new Date().toISOString(),
    duration_ms: Math.round(duration_ms),
    results,
    summary: { total, passed, failed, skipped, errors },
    efficiency,
    quality,
    security,
    score: calculateScore(passed, ran, efficiency, quality, security),
  };
}

function calculateScore(
  passed: number,
  ran: number,
  efficiency?: EfficiencyResult,
  quality?: QualityResult,
  security?: SecurityResult,
): number {
  if (ran === 0) return 0;

  // Compliance: max 40 points
  const complianceScore = (passed / ran) * 40;

  // Quality: max 25 points (0 if not analyzed)
  let qualityScore = 0;
  if (quality) {
    qualityScore = 25;
    for (const f of quality.findings) {
      qualityScore -= f.level === "critical" ? 5 : 2;
    }
    qualityScore = Math.max(0, qualityScore);
  }

  // Efficiency: max 15 points (0 if not analyzed)
  let efficiencyScore = 0;
  if (efficiency) {
    efficiencyScore = 15;
    for (const f of efficiency.findings) {
      efficiencyScore -= f.level === "critical" ? 8 : 3;
    }
    efficiencyScore = Math.max(0, efficiencyScore);
  }

  // Security: max 20 points (0 if not analyzed)
  let securityScore = 0;
  if (security) {
    securityScore = 20;
    for (const f of security.findings) {
      securityScore -= f.level === "critical" ? 10 : 5;
    }
    securityScore = Math.max(0, securityScore);
  }

  return Math.round(complianceScore + qualityScore + efficiencyScore + securityScore);
}
