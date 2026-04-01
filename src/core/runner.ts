import type {
  MCPTest,
  TestContext,
  TestResult,
  TestRunResult,
  SuiteResult,
  RunOptions,
} from "./types.js";

export async function runTests(
  tests: MCPTest[],
  ctx: TestContext,
  options?: RunOptions,
  serverLabel?: string,
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

  return buildSuiteResult(results, performance.now() - start, serverLabel);
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
    score: ran > 0 ? Math.round((passed / ran) * 100) : 0,
  };
}
