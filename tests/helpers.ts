import type {
  MCPTest,
  TestContext,
  TestResult,
  TestRunResult,
  SuiteResult,
  MCPClientWrapper,
} from "../src/core/types.js";

export function mockTest(
  id: string,
  result: TestResult["status"],
  overrides?: Partial<MCPTest>,
): MCPTest {
  return {
    id,
    name: `Test ${id}`,
    description: `Description for ${id}`,
    category: "lifecycle",
    severity: "critical",
    tags: [],
    run: async () => ({ status: result, message: `${result}`, duration_ms: 0 }),
    ...overrides,
  };
}

export function mockContext(overrides?: Partial<TestContext>): TestContext {
  return {
    client: {} as MCPClientWrapper,
    timeout: 5000,
    ...overrides,
  };
}

export function mockSuiteResult(
  overrides?: Partial<SuiteResult>,
): SuiteResult {
  return {
    server: "node test-server.js",
    timestamp: "2026-04-01T00:00:00.000Z",
    duration_ms: 100,
    results: [
      {
        test: {
          id: "test-01",
          name: "Test 01",
          category: "lifecycle",
          severity: "critical",
        },
        result: { status: "pass", message: "passed", duration_ms: 10 },
      },
      {
        test: {
          id: "test-02",
          name: "Test 02",
          category: "lifecycle",
          severity: "high",
        },
        result: { status: "fail", message: "expected X got Y", duration_ms: 20 },
      },
      {
        test: {
          id: "test-03",
          name: "Test 03",
          category: "tools",
          severity: "medium",
        },
        result: { status: "skip", message: "skipped", duration_ms: 0 },
      },
    ],
    summary: { total: 3, passed: 1, failed: 1, skipped: 1, errors: 0 },
    score: 50,
    ...overrides,
  };
}
