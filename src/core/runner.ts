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

export interface AnalyzerResults {
  efficiency?: EfficiencyResult;
  quality?: QualityResult;
  security?: SecurityResult;
}

export async function runTests(
  tests: MCPTest[],
  ctx: TestContext,
  options?: RunOptions,
  serverLabel?: string,
  analyzers?: AnalyzerResults,
): Promise<SuiteResult> {
  const start = performance.now();
  const results: TestRunResult[] = [];

  for (const test of tests) {
    const result = await executeTest(test, ctx, options);
    results.push({ test: pickTestMeta(test), result });
  }

  return buildSuiteResult(results, performance.now() - start, serverLabel, analyzers);
}

async function executeTest(
  test: MCPTest,
  ctx: TestContext,
  options?: RunOptions,
): Promise<TestResult> {
  const shouldSkip =
    (options?.skip?.includes(test.id)) ||
    (options?.only && !options.only.includes(test.id));

  if (shouldSkip) {
    return { status: "skip", message: "skipped by filter", duration_ms: 0 };
  }

  const testStart = performance.now();
  try {
    const result = await Promise.race([
      test.run(ctx),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Test timed out after ${ctx.timeout}ms`)),
          ctx.timeout,
        ),
      ),
    ]);
    result.duration_ms = performance.now() - testStart;
    return result;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      duration_ms: performance.now() - testStart,
    };
  }
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
  analyzers?: AnalyzerResults,
): SuiteResult {
  const { efficiency, quality, security } = analyzers ?? {};
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
    score: calculateScore(passed, ran, analyzers),
  };
}

function calculateScore(
  passed: number,
  ran: number,
  analyzers?: AnalyzerResults,
): number {
  if (ran === 0) return 0;
  const { efficiency, quality, security } = analyzers ?? {};

  const complianceScore = (passed / ran) * 40;
  const qualityScore = dimensionScore(25, quality?.findings, 5, 2);
  const efficiencyScore = dimensionScore(15, efficiency?.findings, 8, 3);
  const securityScore = dimensionScore(20, security?.findings, 10, 5);

  return Math.round(complianceScore + qualityScore + efficiencyScore + securityScore);
}

function dimensionScore(
  max: number,
  findings: { level: string }[] | undefined,
  criticalPenalty: number,
  warningPenalty: number,
): number {
  if (!findings) return 0;
  let score = max;
  for (const f of findings) {
    score -= f.level === "critical" ? criticalPenalty : warningPenalty;
  }
  return Math.max(0, score);
}
