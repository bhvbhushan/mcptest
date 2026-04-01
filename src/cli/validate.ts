import type { ServerConfig } from "../core/client.js";
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
}

export async function validateCommand(
  server: string,
  options: ValidateOptions,
): Promise<void> {
  const serverConfig = parseServerArg(server, options.transport);
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

    const result = await runTests(
      complianceTests,
      { client, timeout },
      {
        skip: skipList.length > 0 ? skipList : undefined,
        only: onlyList && onlyList.length > 0 ? onlyList : undefined,
      },
      serverLabel,
    );

    const output = reporter.format(result);

    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, output, "utf-8");
      console.log(`Report written to ${outputPath}`);
    } else {
      console.log(output);
    }

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
