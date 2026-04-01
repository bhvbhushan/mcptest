# Contributing to mcp-quality-gate

Contributions are welcome! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/bhvbhushan/mcp-quality-gate.git
cd mcp-quality-gate
npm install
npm run build     # tsup: src/ -> dist/
npm test          # vitest (unit + integration)
npm run lint      # tsc --noEmit
```

Requires Node.js >= 22.

## Project Structure

```
src/
  cli/             # Commander CLI (validate command, option parsing)
  core/            # Test runner engine, MCP client wrapper, type definitions
  compliance/      # Protocol compliance tests (lifecycle, tools, resources, prompts)
  efficiency/      # Tool count and schema token analysis
  quality/         # Schema quality checks (descriptions, deprecated, duplicates)
  security/        # Static security analysis (env exposure, code execution, dangerous defaults)
  reporters/       # Output formatters (console with color, JSON for CI)
tests/             # Mirrors src/ structure, vitest
  fixtures/        # Test MCP servers (echo-server)
  integration/     # End-to-end smoke tests
```

## How to Contribute

1. **Check existing issues** ... your idea may already be tracked
2. **Open an issue first** for large changes ... discuss before coding
3. **Fork and branch** ... create a feature branch from `main`
4. **Write tests** ... all PRs must pass `npm test`
5. **Follow code style** ... TypeScript strict mode, ESM, functional patterns
6. **Submit a PR** ... fill out the PR template, target `main`

## Code Standards

- TypeScript strict mode (`"strict": true`)
- ESM (`"type": "module"`)
- Small, focused functions (<50 lines)
- Zod for validation at boundaries
- No `any` types ... use proper interfaces
- Tests for all new functionality

## Adding a New Compliance Test

1. Pick a category: `lifecycle`, `tools`, `resources`, or `prompts`
2. Add the test to the appropriate file in `src/compliance/`
3. Follow the `MCPTest` interface: `{ id, name, description, category, severity, fn }`
4. Add unit tests in `tests/compliance/`
5. Export from `src/compliance/index.ts`
6. Update the test table in README.md

## Adding a New Analyzer

1. Create `src/<analyzer>/types.ts` with finding and result interfaces
2. Create `src/<analyzer>/analyzer.ts` with a pure function taking `ToolDefinition[]`
3. Add tests in `tests/<analyzer>/analyzer.test.ts`
4. Wire into `src/cli/validate.ts` and `src/core/runner.ts`
5. Add display in `src/reporters/console.ts`
6. Export from `src/index.ts`

## Before Submitting a PR

```bash
npm run lint      # Must pass - zero type errors
npm test          # Must pass - all tests green
npm run build     # Must succeed
```

## What We're Looking For

- Bug fixes with reproduction steps
- New compliance tests for MCP protocol coverage
- New analyzer dimensions (e.g., naming conventions, documentation completeness)
- Performance improvements with benchmarks
- Better real-world server test results and benchmarks
- Documentation improvements

## What to Avoid

- Large refactors without prior discussion in an issue
- PRs that don't include tests for new functionality
- Changes that break existing tests without justification
- Adding dependencies without strong justification

## Review Process

- PRs are reviewed by maintainers within a few days
- CI must pass before review
- One approval required for merge
- Squash merge to keep history clean

## Releasing

Releases are automated via CI. To publish a new version:

1. **Bump the version** in `package.json` following semver:
   - `PATCH` for bug fixes, new tests, docs
   - `MINOR` for new analyzers, reporters, CLI flags
   - `MAJOR` for breaking API changes or scoring formula changes

2. **Update CHANGELOG.md** with the new version entry

3. **Merge to `main`** — CI will automatically:
   - Run lint, tests, and build
   - Publish to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements)
   - Create a GitHub Release with auto-generated notes
   - Tag the release as `v{version}`

### Manual Publish (not recommended)

```bash
npm run lint && npm run build && npm test   # prepublishOnly runs this automatically
npm publish --provenance --access public
```

### Required Secrets

The publish workflow requires `NPM_TOKEN` configured as a GitHub repository secret. Generate one at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens) with "Automation" type.

## Questions?

Use [GitHub Discussions](https://github.com/bhvbhushan/mcp-quality-gate/discussions) for questions, not issues.
