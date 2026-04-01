import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    target: "node22",
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    target: "node22",
    banner: { js: "#!/usr/bin/env node" },
    sourcemap: true,
  },
]);
