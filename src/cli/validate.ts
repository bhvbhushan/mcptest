import type { ServerConfig } from "../core/client.js";
import type { ToolDefinition } from "../core/types.js";
import { createMCPClient } from "../core/client.js";

export class MCPTestError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = "MCPTestError";
  }
}
import { runTests } from "../core/runner.js";
import { complianceTests } from "../compliance/index.js";
import { ConsoleReporter } from "../reporters/console.js";
import { JsonReporter } from "../reporters/json.js";
import type { Reporter } from "../reporters/types.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { analyzeEfficiency } from "../efficiency/analyzer.js";
import type { EfficiencyConfig } from "../efficiency/types.js";
import { listAllTools } from "../core/client.js";
import { analyzeQuality } from "../quality/analyzer.js";
import { analyzeSecurity } from "../security/analyzer.js";
import type { QualityResult } from "../quality/types.js";
import type { SecurityResult } from "../security/types.js";

export function parseServerArg(
  server: string,
  transport: string,
): ServerConfig {
  if (
    server.startsWith("http://") ||
    server.startsWith("https://") ||
    transport === "http"
  ) {
    return { command: "", transport: "http", url: server };
  }

  const parts = server.split(" ");
  return {
    command: parts[0],
    args: parts.slice(1),
    transport: "stdio",
  };
}

function createReporter(type: string): Reporter {
  switch (type) {
    case "json":
      return new JsonReporter();
    case "console":
    default:
      return new ConsoleReporter();
  }
}

export interface ValidateOptions {
  transport: string;
  reporter: string;
  output?: string;
  threshold?: string;
  timeout?: string;
  skip?: string;
  only?: string;
  env?: string;
  maxTools?: string;
  maxSchemaTokens?: string;
  skipEfficiency?: boolean;
  skipQuality?: boolean;
  skipSecurity?: boolean;
}

interface AnalyzerOptions {
  skipEfficiency?: boolean;
  skipQuality?: boolean;
  skipSecurity?: boolean;
  maxTools?: string;
  maxSchemaTokens?: string;
}

function runAnalyzers(allTools: ToolDefinition[], opts: AnalyzerOptions) {
  let efficiency;
  if (!opts.skipEfficiency) {
    const efficiencyConfig: EfficiencyConfig = {};
    if (opts.maxTools)
      efficiencyConfig.maxToolsCritical = parseInt(opts.maxTools, 10);
    if (opts.maxSchemaTokens)
      efficiencyConfig.maxSchemaTokensCritical = parseInt(opts.maxSchemaTokens, 10);
    efficiency = analyzeEfficiency(allTools, efficiencyConfig);
  }

  let quality: QualityResult | undefined;
  if (!opts.skipQuality) {
    quality = analyzeQuality(allTools);
  }

  let security: SecurityResult | undefined;
  if (!opts.skipSecurity) {
    security = analyzeSecurity(allTools);
  }

  return { efficiency, quality, security };
}

function writeOutput(output: string, outputPath?: string): void {
  if (outputPath) {
    const resolved = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, output, "utf-8");
    process.stderr.write(`Report written to ${resolved}\n`);
  } else {
    process.stdout.write(output + "\n");
  }
}

export async function validateCommand(
  server: string,
  options: ValidateOptions,
): Promise<void> {
  const serverConfig = parseServerArg(server, options.transport);

  if (options.env) {
    serverConfig.env = Object.fromEntries(
      options.env.split(",").map((pair) => {
        const eq = pair.indexOf("=");
        return [pair.slice(0, eq), pair.slice(eq + 1)];
      }),
    );
  }

  const reporter = createReporter(options.reporter);
  const timeout = parseInt(options.timeout ?? "30000", 10);

  let client;
  try {
    client = await createMCPClient(serverConfig);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : String(error);
    throw new MCPTestError(
      `Failed to connect to server: ${msg}\nEnsure the server command is correct and the server is running.`
    );
  }

  try {
    const skipList = options.skip?.split(",").map((s) => s.trim()) ?? [];
    const onlyList = options.only?.split(",").map((s) => s.trim()) ?? undefined;
    const serverLabel =
      serverConfig.transport === "http"
        ? serverConfig.url!
        : [serverConfig.command, ...(serverConfig.args ?? [])].join(" ");

    let allTools: ToolDefinition[];
    try {
      allTools = await listAllTools(client);
    } catch {
      allTools = [];
    }

    const analyzers = runAnalyzers(allTools, options);

    const result = await runTests(
      complianceTests,
      { client, timeout },
      {
        skip: skipList.length > 0 ? skipList : undefined,
        only: onlyList && onlyList.length > 0 ? onlyList : undefined,
      },
      serverLabel,
      analyzers,
    );

    writeOutput(reporter.format(result), options.output);

    if (options.threshold) {
      const threshold = parseInt(options.threshold, 10);
      if (result.score < threshold) {
        throw new MCPTestError(
          `Threshold: ${threshold} — FAIL (score: ${result.score})`
        );
      }
    }
  } finally {
    await client.close();
  }
}
