# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-04-01

### Changed

- Refactored god-functions: `analyzeQuality` (147 → 5 focused helpers), `validateCommand` (extracted `runAnalyzers` + `writeOutput`), `ConsoleReporter.format` (extracted 5 section formatters), `runTests` (7 params → `AnalyzerResults` interface), `createMCPClient` (extracted `createTransport` + `createClientWrapper`)
- Removed double type assertion (`as unknown as`) in MCP client getPrompt wrapper
- Replaced `console.log` with `process.stdout.write`/`process.stderr.write` in CLI
- Added meaningful assertions to client tests (over-mocking fix)
- Extracted `dimensionScore` helper in score calculation
- Exported `AnalyzerResults` type from public API

## [0.1.0] - 2026-04-01

### Added

- CLI tool `mcp-quality-gate validate` for testing any MCP server via stdio or HTTP transport
- 17 compliance tests across 4 categories: lifecycle (3), tools (7), resources (4), prompts (3)
- Quality analyzer: parameter description coverage, description length checks, deprecated tool detection, duplicate schema detection, required/default mismatch
- Security analyzer: environment variable exposure detection, code execution surface detection, dangerous default pattern detection
- Efficiency analyzer: tool count thresholds, schema token estimation
- 4-dimension scoring: compliance (40) + quality (25) + efficiency (15) + security (20) = 100
- Console reporter with colored output and score breakdown
- JSON reporter for CI/CD integration
- `--threshold` flag for CI quality gates (exit 1 if score below threshold)
- `--skip` and `--only` flags for selective test execution
- `--skip-efficiency`, `--skip-quality`, `--skip-security` flags to skip analysis dimensions
- `--env` flag for passing environment variables to MCP servers
- HTTP/SSE transport support via `--transport http`
- Programmatic API: `createMCPClient`, `runTests`, `listAllTools`, `analyzeEfficiency`, `analyzeQuality`, `analyzeSecurity`
- Real-world benchmarks against 5 official MCP reference servers
- CI workflow (lint + test + build on push/PR)
- Automated npm publish with provenance on version bump
- GitHub Release creation on publish
