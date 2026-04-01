# mcptest

[![npm version](https://img.shields.io/npm/v/mcptest)](https://www.npmjs.com/package/mcptest)
[![license](https://img.shields.io/npm/l/mcptest)](https://github.com/bhvbhushan/mcptest/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/mcptest)](https://nodejs.org/)
[![CI](https://github.com/bhvbhushan/mcptest/actions/workflows/ci.yml/badge.svg)](https://github.com/bhvbhushan/mcptest/actions/workflows/ci.yml)

**Quality gate for MCP servers.** Like `npm audit` for packages, but for [Model Context Protocol](https://modelcontextprotocol.io/) servers.

When an LLM connects to your MCP server, it trusts whatever you expose. Bad tool schemas mean bad tool calls. Missing descriptions mean the model guesses. 50+ tools flood the context window. Leaked environment variables expose secrets. mcptest catches all of this in one command.

```bash
npx mcptest validate "npx -y @modelcontextprotocol/server-filesystem /tmp"
```

One command. Four dimensions. 0-100 score.

## What It Catches

mcptest scores every MCP server across four dimensions:

| Dimension | Weight | What It Checks | Why It Matters |
|-----------|:------:|----------------|----------------|
| **Compliance** | 40 pts | Protocol conformance — init, tool listing, tool calls, resources, prompts, error handling | A server that doesn't follow the spec breaks every client |
| **Quality** | 25 pts | Parameter descriptions, description length, deprecated tools, duplicate schemas, schema consistency | LLMs need good descriptions to make correct tool calls. 72% undocumented params = 72% guesswork |
| **Security** | 20 pts | Environment variable exposure, code execution surfaces, destructive operations without warnings | Tools run with user permissions. A `get-env` tool leaks every secret on the machine |
| **Efficiency** | 15 pts | Tool count, total schema token cost | Every tool schema eats context. 21 tools at 3000 tokens leaves less room for actual conversation |

## Install

```bash
npm install -g mcptest
```

Requires Node.js >= 22.

## Usage

```bash
# Test any stdio MCP server
mcptest validate "npx -y @modelcontextprotocol/server-filesystem /tmp"

# Test with environment variables
mcptest validate "npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref REF" \
  --env "SUPABASE_ACCESS_TOKEN=your-token"

# JSON output for CI/CD pipelines
mcptest validate "./my-server" --reporter json --output report.json

# Fail CI if score is below threshold
mcptest validate "./my-server" --threshold 80

# Test HTTP/SSE servers
mcptest validate "http://localhost:3000/mcp" --transport http
```

## Real-World Benchmarks

Tested against official MCP reference servers (April 2026). These are real results from live server connections, not synthetic data:

| Server | Score | Compliance | Quality | Efficiency | Security | What mcptest Found |
|--------|:-----:|:----------:|:-------:|:----------:|:--------:|---|
| **Memory** | **98** | 40/40 | 23/25 | 15/15 | 20/20 | 50% of parameters have no descriptions — LLMs have to guess argument format |
| **Sequential Thinking** | **98** | 40/40 | 23/25 | 15/15 | 20/20 | 500+ character description — wastes context tokens on a single tool |
| **Everything** | **88** | 40/40 | 23/25 | 15/15 | 10/20 | `get-env` tool leaks environment variables. Duplicate schemas across tools |
| **Filesystem** | **81** | 40/40 | 11/25 | 15/15 | 15/20 | 72% of params undocumented, `read_file` marked deprecated but still listed, duplicate schemas |
| **Playwright** | **81** | 40/40 | 19/25 | 12/15 | 10/20 | 21 tools consuming 3000+ schema tokens, code execution surfaces, short descriptions |

Servers tested: `@modelcontextprotocol/server-memory`, `@modelcontextprotocol/server-sequential-thinking`, `@modelcontextprotocol/server-everything`, `@modelcontextprotocol/server-filesystem`, `@anthropic/mcp-server-playwright`.

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

## Compliance Tests (17)

mcptest connects to your server, makes real protocol calls, and verifies behavior. This is not static analysis — it's a live test suite that actually calls your tools with generated arguments.

| Category | Tests | What's Verified |
|----------|:-----:|-----------------|
| **Lifecycle** | 3 | Server init (name, version, capabilities), ping response |
| **Tools** | 7 | Tool listing, required fields, naming conventions, schema structure, **live tool invocation with auto-generated arguments**, error handling for nonexistent tools, description presence |
| **Resources** | 4 | Resource listing, required fields, descriptions, resource read |
| **Prompts** | 3 | Prompt listing, required fields, prompt retrieval |

Tests are skipped (not failed) when a server doesn't advertise a capability. A tools-only server won't lose points for missing resources.

### Full Test Reference

| ID | Test | Severity |
|----|------|----------|
| `lifecycle-init-01` | Server reports name and version | Critical |
| `lifecycle-init-02` | Server reports capabilities | Critical |
| `lifecycle-init-03` | Server responds to ping | High |
| `tools-list-01` | Server lists tools without error | Critical |
| `tools-list-02` | Tool definitions have required fields | Critical |
| `tools-list-03` | Tool names follow naming convention | Medium |
| `tools-list-04` | Tool inputSchema has type "object" | High |
| `tools-call-01` | Can call a listed tool | Critical |
| `tools-call-02` | Calling nonexistent tool returns error | High |
| `tools-call-03` | Tool descriptions are present | Medium |
| `resources-list-01` | Server lists resources without error | Critical |
| `resources-list-02` | Resource definitions have required fields | Critical |
| `resources-list-03` | Resource descriptions are present | Medium |
| `resources-read-01` | Can read a listed resource | Critical |
| `prompts-list-01` | Server lists prompts without error | Critical |
| `prompts-list-02` | Prompt definitions have required fields | Critical |
| `prompts-get-01` | Can get a listed prompt | Critical |

## Quality Analysis

Checks how well your tool schemas help LLMs understand and use your tools:

| Check | What It Catches |
|-------|-----------------|
| Parameter description coverage | Parameters without descriptions — the #1 cause of incorrect LLM tool calls |
| Description quality (short) | Descriptions under 20 characters — too brief for LLMs to understand intent |
| Description quality (verbose) | Descriptions over 500 characters — wastes context tokens |
| Deprecated tool detection | Tools marked deprecated that are still listed — confuses tool selection |
| Duplicate tool detection | Tools with identical input schemas — suggests redundant or versioned tools |
| Required/default mismatch | Required parameters with default values — contradictory schema signals |

## Security Analysis

Static analysis on tool definitions to detect common security antipatterns:

| Check | What It Catches |
|-------|-----------------|
| Environment variable exposure | Tools like `get-env` that leak secrets to the LLM |
| Code execution detection | Tools accepting `code`, `script`, or `eval` parameters — arbitrary execution surfaces |
| Dangerous default patterns | Destructive operations (write, delete, drop) without proper warning descriptions |

## Efficiency Analysis

Catches tool proliferation and schema bloat — the top causes of poor LLM performance with MCP servers:

| Metric | Warning | Critical | Why |
|--------|:-------:|:--------:|-----|
| Tool count | > 20 | > 50 | More tools = more tokens in every request = less room for conversation |
| Schema tokens | > 10,000 | > 30,000 | Token budget is finite. Schema overhead competes with actual content |

Token estimation uses `chars/4` heuristic (~15% accuracy vs tiktoken for JSON schemas).

## Scoring

Composite 0-100 score. Each dimension starts at its maximum and deducts for findings:

| Dimension | Max | Deductions |
|-----------|:---:|------------|
| Compliance | 40 | `(passed / total_run) * 40` |
| Quality | 25 | -5 per critical, -2 per warning |
| Efficiency | 15 | -8 per critical, -3 per warning |
| Security | 20 | -10 per critical, -5 per warning |

Skipping a dimension with `--skip-*` flags means those points are not awarded. A server with `--skip-security` can score at most 80.

## CLI Reference

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --transport` | Transport type (`stdio` or `http`) | `stdio` |
| `-r, --reporter` | Output format (`console` or `json`) | `console` |
| `-o, --output` | Write report to file | |
| `--threshold` | Minimum passing score (0-100) — exit 1 if below | |
| `--timeout` | Test timeout in ms | `30000` |
| `--skip` | Comma-separated test IDs to skip | |
| `--only` | Comma-separated test IDs to run | |
| `-e, --env` | Environment variables as `KEY=VAL,KEY2=VAL2` | |
| `--max-tools` | Critical threshold for tool count | `50` |
| `--max-schema-tokens` | Critical threshold for schema tokens | `30000` |
| `--skip-efficiency` | Skip efficiency analysis | |
| `--skip-quality` | Skip quality analysis | |
| `--skip-security` | Skip security analysis | |

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Test MCP Server
  run: npx mcptest validate "./my-server" --threshold 80 --reporter json --output mcptest-report.json
```

mcptest exits with code 1 when the score falls below `--threshold`, failing the CI step.

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
mcptest
├── CLI (Commander)         → parse args, orchestrate
├── MCP Client Wrapper      → connect via stdio or HTTP, manage lifecycle
├── Compliance Tests (17)   → live protocol verification
│   ├── Lifecycle (3)       → init, capabilities, ping
│   ├── Tools (7)           → list, fields, naming, schema, call, errors, descriptions
│   ├── Resources (4)       → list, fields, descriptions, read
│   └── Prompts (3)         → list, fields, get
├── Quality Analyzer        → param descriptions, description length, deprecated, duplicates
├── Security Analyzer       → env exposure, code execution, dangerous defaults
├── Efficiency Analyzer     → tool count, schema token estimation
├── Score Calculator        → 4-dimension weighted composite (40+25+15+20=100)
└── Reporters               → console (colored), JSON (CI/CD)
```

## Releases

mcptest follows [Semantic Versioning](https://semver.org/):

- **0.x.y** — pre-1.0, API may change between minor versions
- **PATCH** (0.x.Y) — bug fixes, new compliance tests, doc updates
- **MINOR** (0.X.0) — new analyzer dimensions, new reporters, CLI flags
- **MAJOR** (X.0.0) — breaking API changes, scoring formula changes

### How Releases Work

1. Bump `version` in `package.json`
2. Update `CHANGELOG.md` with the new version entry
3. Merge to `main`
4. CI automatically: runs lint + test + build, publishes to npm with provenance, creates a GitHub Release with tag `v{version}`

The `prepublishOnly` script runs `lint && build && test` as a safety gate. See [CONTRIBUTING.md](CONTRIBUTING.md#releasing) for full release instructions.

## Roadmap

- [x] **v0.1** — Compliance tests (lifecycle, tools, resources, prompts), quality + security + efficiency analysis, 4-dimension scoring, CI/CD workflows
- [ ] **v0.2** — Transport compliance tests (HTTP/SSE edge cases), response schema validation, capability refusal tests
- [ ] **v0.3** — `mcptest init` scaffolding, GitHub Action for CI, performance benchmarking
- [ ] **v1.0** — Dynamic security testing, MCP server registry scanner, stable API

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code standards, and how to add tests.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
