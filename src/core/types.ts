import type { QualityResult } from "../quality/types.js";
import type { SecurityResult } from "../security/types.js";
import type { EfficiencyResult } from "../efficiency/types.js";

export interface MCPTest {
  id: string;
  name: string;
  description: string;
  category:
    | "lifecycle"
    | "tools"
    | "resources"
    | "prompts"
    | "transport"
    | "protocol";
  severity: "critical" | "high" | "medium" | "low";
  tags: string[];
  spec_ref?: string;
  owasp_ref?: string;
  run(ctx: TestContext): Promise<TestResult>;
}

export interface TestContext {
  client: MCPClientWrapper;
  timeout: number;
}

export interface MCPClientWrapper {
  getServerCapabilities(): ServerCapabilities | undefined;
  getServerVersion(): ServerVersion | undefined;
  listTools(params?: { cursor?: string }): Promise<ListToolsResult>;
  callTool(params: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<CallToolResult>;
  listResources(params?: { cursor?: string }): Promise<ListResourcesResult>;
  readResource(params: { uri: string }): Promise<ReadResourceResult>;
  listPrompts(params?: { cursor?: string }): Promise<ListPromptsResult>;
  getPrompt(params: {
    name: string;
    arguments?: Record<string, string>;
  }): Promise<GetPromptResult>;
  ping(): Promise<void>;
}

export interface ServerCapabilities {
  tools?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ServerVersion {
  name: string;
  version: string;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface ListToolsResult {
  tools: ToolDefinition[];
  nextCursor?: string;
}

export interface CallToolResult {
  content: ContentBlock[];
  isError?: boolean;
}

export interface ContentBlock {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ListResourcesResult {
  resources: ResourceDefinition[];
  nextCursor?: string;
}

export interface ReadResourceResult {
  contents: { uri: string; text?: string; blob?: string; mimeType?: string }[];
}

export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
}

export interface ListPromptsResult {
  prompts: PromptDefinition[];
  nextCursor?: string;
}

export interface GetPromptResult {
  messages: { role: string; content: ContentBlock[] }[];
  description?: string;
}

export interface TestResult {
  status: "pass" | "fail" | "skip" | "error";
  message?: string;
  duration_ms: number;
  details?: unknown;
}

export interface TestRunResult {
  test: Pick<MCPTest, "id" | "name" | "category" | "severity">;
  result: TestResult;
}

export interface SuiteResult {
  server: string;
  timestamp: string;
  duration_ms: number;
  results: TestRunResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
  };
  efficiency?: EfficiencyResult;
  quality?: QualityResult;
  security?: SecurityResult;
  score: number;
}

export interface RunOptions {
  skip?: string[];
  only?: string[];
}
