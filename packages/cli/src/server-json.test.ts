import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The official MCP Registry lists the server from server.json and checks it against the package on
// npm: the name must be the package's mcpName, and the versions the one published. A release that
// bumps one and not the other is refused (or lists an old version).
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { name: string; version: string; mcpName: string };
const server = JSON.parse(readFileSync(new URL("../server.json", import.meta.url), "utf8")) as {
  name: string;
  description: string;
  version: string;
  packages: { identifier: string; version: string; packageArguments: { value: string }[] }[];
};

describe("server.json", () => {
  it("names and versions the package as npm has it", () => {
    expect(server.name).toBe(pkg.mcpName);
    expect(server.version).toBe(pkg.version);
    expect(server.packages).toHaveLength(1);
    expect(server.packages[0]).toMatchObject({ identifier: pkg.name, version: pkg.version, packageArguments: [{ value: "mcp" }] });
  });

  it("keeps the description within the registry's 100 characters", () => {
    expect(server.description.length).toBeLessThanOrEqual(100);
  });
});
