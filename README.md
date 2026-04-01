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

# Skip optional analysis dimensions
mcptest validate "./my-server" --skip-efficiency
mcptest validate "./my-server" --skip-quality
mcptest validate "./my-server" --skip-security
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
| `--max-tools` | Critical threshold for tool count | `50` |
| `--max-schema-tokens` | Critical threshold for schema tokens | `30000` |
| `--skip-efficiency` | Skip efficiency analysis | — |
| `--skip-quality` | Skip quality analysis | — |
| `--skip-security` | Skip security analysis | — |

## What's Tested (Phase 1, Week 2)

### Compliance Tests (17 total)

| Category | ID | Test | Severity |
|----------|----|------|----------|
| Lifecycle | `lifecycle-init-01` | Server reports name and version | Critical |
| Lifecycle | `lifecycle-init-02` | Server reports capabilities | Critical |
| Lifecycle | `lifecycle-init-03` | Server responds to ping | High |
| Tools | `tools-list-01` | Server lists tools without error | Critical |
| Tools | `tools-list-02` | Tool definitions have required fields | Critical |
| Tools | `tools-list-03` | Tool names follow naming convention | Medium |
| Tools | `tools-list-04` | Tool inputSchema has type "object" | High |
| Tools | `tools-call-01` | Can call a listed tool | Critical |
| Tools | `tools-call-02` | Calling nonexistent tool returns error | High |
| Tools | `tools-call-03` | Tool descriptions are present | Medium |
| Resources | `resources-list-01` | Server lists resources without error | Critical |
| Resources | `resources-list-02` | Resource definitions have required fields | Critical |
| Resources | `resources-list-03` | Resource descriptions are present | Medium |
| Resources | `resources-read-01` | Can read a listed resource | Critical |
| Prompts | `prompts-list-01` | Server lists prompts without error | Critical |
| Prompts | `prompts-list-02` | Prompt definitions have required fields | Critical |
| Prompts | `prompts-get-01` | Can get a listed prompt | Critical |

### Quality Analysis

Analyzes schema and description quality to help LLMs use your tools effectively.

| Check | Description |
|-------|-------------|
| Param description coverage | Percentage of parameters with descriptions |
| Description quality (short) | Tools with descriptions under 20 characters |
| Description quality (verbose) | Tools with descriptions over 500 characters |
| Deprecated tool detection | Tools whose descriptions mention "deprecated" or "obsolete" |
| Duplicate tool detection | Tools with identical input schemas |
| Required/default mismatch | Required parameters that also have default values |

### Security Analysis

Performs static analysis on tool definitions to detect common security risks.

| Check | Category | Description |
|-------|----------|-------------|
| Environment variable exposure | `env-exposure` | Tools whose name/description suggest leaking env vars or secrets |
| Code execution detection | `code-execution` | Tools that appear to execute arbitrary code or scripts |
| Dangerous default patterns | `dangerous-defaults` | Tools performing destructive operations without warnings |

### Efficiency Analysis

Analyzes tool proliferation and schema bloat — key causes of poor LLM performance with MCP servers.

| Metric | Warning | Critical |
|--------|---------|----------|
| Tool count | > 20 | > 50 |
| Schema tokens (est.) | > 10,000 | > 30,000 |

Token estimation uses `chars/4` heuristic (~15% accuracy vs tiktoken for JSON schemas).

## Scoring

Composite 0-100 score across four dimensions:

| Dimension | Max Points | Description |
|-----------|-----------|-------------|
| Compliance | 40 | Protocol conformance: `(passed / total_run) × 40` |
| Quality | 25 | Schema quality; deduct 5 per critical finding, 2 per warning |
| Efficiency | 15 | Tool count and token budget; deduct 8 per critical, 3 per warning |
| Security | 20 | Dangerous patterns; deduct 10 per critical finding, 5 per warning |

**Maximum score is 100** when all four dimensions are analyzed and no issues are found. Dimensions not analyzed contribute 0 points toward their maximum — a server with `--skip-security` can score at most 80.

### Real-World Results

Tested against official MCP servers (April 2026):

| Server | Score | Compliance | Quality | Efficiency | Security | Key Findings |
|--------|:---:|:---:|:---:|:---:|:---:|---|
| Memory | **98** | 40/40 | 23/25 | 15/15 | 20/20 | 50% params undocumented |
| Sequential Thinking | **98** | 40/40 | 23/25 | 15/15 | 20/20 | Verbose 500+ char description |
| Everything | **88** | 40/40 | 23/25 | 15/15 | 10/20 | `get-env` leaks env vars, duplicate schemas |
| Filesystem | **81** | 40/40 | 11/25 | 15/15 | 15/20 | 72% params undocumented, deprecated tool, duplicates |
| Playwright | **81** | 40/40 | 19/25 | 12/15 | 10/20 | Code execution tools, short descriptions, 21 tools |

### Example Output

```
mcptest v0.1.0
Server: npx -y @modelcontextprotocol/server-filesystem /tmp

  lifecycle
    PASS Server reports name and version (0ms)
    PASS Server reports capabilities (0ms)
    PASS Server responds to ping (1ms)

  tools
    PASS Server lists tools without error (5ms)
    PASS Tool definitions have required fields (6ms)
    PASS Tool names follow naming convention (8ms)
    PASS Tool inputSchema has type object (4ms)
    PASS Can call a listed tool (10ms)
    PASS Calling nonexistent tool returns error (1ms)
    PASS Tool descriptions are present (8ms)

  resources
    SKIP Server lists resources without error
    SKIP Resource definitions have required fields
    SKIP Resource descriptions are present
    SKIP Can read a listed resource

  prompts
    SKIP Server lists prompts without error
    SKIP Prompt definitions have required fields
    SKIP Can get a listed prompt

  efficiency
    14 tools, ~3057 schema tokens

  quality
    Param description coverage: 28%
    Deprecated: read_file
    Duplicates: read_file, read_text_file
    CRIT 18 of 25 parameters lack descriptions (72%)
    CRIT 1 deprecated tool(s) still listed: read_file
    WARN Tools with identical schemas: read_file, read_text_file

  security
    WARN "write_file" performs destructive operations — description warns of risk

Results: 10 passed, 7 skipped (45ms)
Score: 81/100
  compliance 40/40 | quality 11/25 | efficiency 15/15 | security 15/20
```

## Programmatic API

```typescript
import {
  createMCPClient,
  listAllTools,
  runTests,
  complianceTests,
  analyzeEfficiency,
  analyzeQuality,
  analyzeSecurity,
  ConsoleReporter,
} from "mcptest";

const client = await createMCPClient({
  command: "node",
  args: ["./my-server.js"],
  transport: "stdio",
});

const tools = await listAllTools(client);
const efficiency = analyzeEfficiency(tools);
const quality = analyzeQuality(tools);
const security = analyzeSecurity(tools);

const result = await runTests(
  complianceTests,
  { client, timeout: 10000 },
  undefined,
  "my-server",
  efficiency,
  quality,
  security,
);

console.log(new ConsoleReporter().format(result));
await client.close();
```

## Architecture

```
mcptest CLI (Commander)
├── Test Runner Engine — discovers, filters, executes tests, scores results
├── MCP Client Wrapper — connects via stdio or HTTP transport
├── Compliance Tests — spec conformance checks (lifecycle, tools, resources, prompts)
├── Reporters — console (colored) and JSON output
├── Efficiency Analyzer — tool count, schema token estimation, threshold findings
├── Quality Analyzer — param descriptions, description quality, deprecated/duplicate detection
├── Security Analyzer — env exposure, code execution, dangerous default patterns
└── Score: 4-dimension weighted composite (compliance 40 + quality 25 + efficiency 15 + security 20 = 100)
```

## Roadmap

- **Phase 1 Week 2**: ~~Tools compliance tests, resources, prompts, quality + security analysis~~ (done)
- **Phase 1 Week 3**: Transport tests, capability refusal test, protocol compliance tests
- **Phase 1 Week 4**: Real-server validation, npm publish, GitHub Action, `mcptest init`
- **Phase 2**: Registry scanner, dynamic security testing

## License

MIT
