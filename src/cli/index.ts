import { Command } from "commander";
import { validateCommand, MCPTestError } from "./validate.js";

const program = new Command()
  .name("mcptest")
  .description("Quality gate for MCP servers — compliance, security, and efficiency testing")
  .version("0.1.0");

program
  .command("validate <server>")
  .description("Run compliance tests against an MCP server")
  .option("-t, --transport <type>", "transport type (stdio or http)", "stdio")
  .option("-r, --reporter <type>", "reporter type (console or json)", "console")
  .option("-o, --output <path>", "write report to file")
  .option("--threshold <score>", "minimum passing score (0-100)")
  .option("--timeout <ms>", "test timeout in milliseconds", "30000")
  .option("--skip <tests>", "comma-separated test IDs to skip")
  .option("--only <tests>", "comma-separated test IDs to run")
  .option("-e, --env <vars>", "environment variables as KEY=VAL,KEY2=VAL2")
  .action(validateCommand);

program.parseAsync().catch((error) => {
  if (error instanceof MCPTestError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }
  console.error(error);
  process.exit(1);
});
