import { describe, expect, it } from "vitest";
import { parseBundle, renamedFormat } from "./bundle";
import { PRESETS } from "./presets";
import { SYSTEM_FORMAT } from "./system";

// Every saved system, download and database row from before the product was named tesserai says
// "tessera/…": it reads as the same format, forever.
describe("files saved before the rename", () => {
  it("read as the current format", () => {
    const saved = { ...PRESETS[0]!.build(), format: "tessera/design-system@0" };
    const parsed = parseBundle(JSON.parse(JSON.stringify(saved)));
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.system.format).toBe(SYSTEM_FORMAT);
    expect(parsed.system.name).toBe(saved.name);
  });

  it("only the old prefix is translated", () => {
    expect(renamedFormat("tessera/archive@1")).toBe("tesserai/archive@1");
    expect(renamedFormat(SYSTEM_FORMAT)).toBe(SYSTEM_FORMAT);
    expect(renamedFormat("something/else@1")).toBe("something/else@1");
    expect(parseBundle({ format: "unknown/thing@1" }).ok).toBe(false);
  });
});
