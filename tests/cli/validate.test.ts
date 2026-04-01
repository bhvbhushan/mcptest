import { describe, it, expect } from "vitest";
import { parseServerArg } from "../../src/cli/validate.js";

describe("parseServerArg", () => {
  it("parses simple command as stdio", () => {
    const config = parseServerArg("./my-server", "stdio");
    expect(config.transport).toBe("stdio");
    expect(config.command).toBe("./my-server");
    expect(config.args).toEqual([]);
  });

  it("parses command with args as stdio", () => {
    const config = parseServerArg("node dist/index.js", "stdio");
    expect(config.transport).toBe("stdio");
    expect(config.command).toBe("node");
    expect(config.args).toEqual(["dist/index.js"]);
  });

  it("parses http URL with http transport", () => {
    const config = parseServerArg("http://localhost:3000/mcp", "http");
    expect(config.transport).toBe("http");
    expect(config.url).toBe("http://localhost:3000/mcp");
  });

  it("auto-detects http transport from URL", () => {
    const config = parseServerArg("http://localhost:3000/mcp", "stdio");
    expect(config.transport).toBe("http");
    expect(config.url).toBe("http://localhost:3000/mcp");
  });

  it("auto-detects https transport from URL", () => {
    const config = parseServerArg("https://api.example.com/mcp", "stdio");
    expect(config.transport).toBe("http");
    expect(config.url).toBe("https://api.example.com/mcp");
  });
});
