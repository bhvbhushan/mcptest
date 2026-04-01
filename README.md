# mcptest

Quality gate for MCP servers — compliance, security, and efficiency testing. Like `npm audit` for packages, but for MCP servers. One command tells you if a server is spec-compliant, secure, and performant.

## Install

```bash
npm install -g mcptest
```

Requires Node.js >= 22.

## Usage

```bash
# Run compliance tests against any MCP server
mcptest validate "npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref REF" \
  --env "SUPABASE_ACCESS_TOKEN=your-token"

# Use JSON output for CI/CD pipelines
mcptest validate "./my-server" --reporter json --output report.json

# Set a minimum quality threshold (exits with code 1 if below)
mcptest validate "./my-server" --threshold 80

# Test an HTTP/SSE server
mcptest validate "http://localhost:3000/mcp" --transport http

# Run specific tests or skip tests
mcptest validate "./my-server" --only lifecycle-init-01,lifecycle-init-02
mcptest validate "./my-server" --skip lifecycle-init-03
```

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --transport` | Transport type (`stdio` or `http`) | `stdio` |
| `-r, --reporter` | Output format (`console` or `json`) | `console` |
| `-o, --output` | Write report to file | — |
| `--threshold` | Minimum passing score (0-100) | — |
| `--timeout` | Test timeout in ms | `30000` |
| `--skip` | Comma-separated test IDs to skip | — |
| `--only` | Comma-separated test IDs to run | — |
| `-e, --env` | Environment variables as `KEY=VAL,KEY2=VAL2` | — |

## What's Tested (Phase 1)

### Compliance Tests — Lifecycle

| ID | Test | Severity |
|----|------|----------|
| `lifecycle-init-01` | Server reports name and version | Critical |
| `lifecycle-init-02` | Server reports capabilities | Critical |
| `lifecycle-init-03` | Server responds to ping | High |

More compliance tests (tools, resources, prompts, transport, protocol) and the tool efficiency module are coming in Phase 1 Week 2.

## Programmatic API

```typescript
import { createMCPClient, runTests, complianceTests, ConsoleReporter } from "mcptest";

const client = await createMCPClient({
  command: "node",
  args: ["./my-server.js"],
  transport: "stdio",
});

const result = await runTests(complianceTests, { client, timeout: 10000 });
console.log(new ConsoleReporter().format(result));

await client.close();
```

## Architecture

```
mcptest CLI (Commander)
├── Test Runner Engine — discovers, filters, executes tests, scores results
├── MCP Client Wrapper — connects via stdio or HTTP transport
├── Compliance Tests — spec conformance checks (lifecycle, tools, resources, etc.)
├── Reporters — console (colored) and JSON output
└── Score: (passed / total_run) × 100
```

## Roadmap

- **Phase 1 Week 2**: Tools, resources, prompts, protocol compliance tests + tool efficiency module
- **Phase 1 Week 3**: Extended tests, capability refusal test, transport tests
- **Phase 1 Week 4**: Real-server validation, npm publish, GitHub Action, `mcptest init`
- **Phase 2**: Security scanner (static + dynamic), registry scanner

## License

MIT
