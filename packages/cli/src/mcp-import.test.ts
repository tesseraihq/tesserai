import { rmSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { applyChangeset, emitPlatform, PRESETS } from "@tesserai/core";
import { grade } from "../bench/import/grade";
import { stage, truthOf } from "../bench/import/run";
import { importFromAgent } from "./mcp-import";

// The agent route without an agent: what a coding agent would send for the antd project, checked
// and graded like the real thing. A citation that doesn't hold is dropped, never kept.

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const src = (path: string, line: number) => ({ $extensions: { "tesserai.source": `${path}:${line}` } });

describe("importing what a coding agent read", () => {
  it("keeps what's cited correctly, drops what isn't, and grades like the real route", async () => {
    const dir = stage("a1-antd-v5");
    dirs.push(dir);
    const tokens = {
      color: {
        $type: "color",
        primary: { $value: "#0f766e", ...src("src/theme/antd.ts", 4) },
        destructive: { $value: "#be123c", ...src("src/theme/antd.ts", 5) },
        success: { $value: "#15803d", ...src("src/theme/antd.ts", 6) },
        warning: { $value: "#b45309", ...src("src/theme/antd.ts", 7) },
        background: { $value: "#ffffff", ...src("src/theme/antd.ts", 16) },
        foreground: { $value: "#111827", ...src("src/theme/antd.ts", 17) },
        border: { $value: "#d1d5db", ...src("src/theme/antd.ts", 18) },
        // Wrong line: dropped. No source: dropped.
        "primary-foreground": { $value: "#ffffff", ...src("src/theme/antd.ts", 2) },
        card: { $value: "#ffffff" },
      },
      fontFamily: { $type: "fontFamily", sans: { $value: ["IBM Plex Sans", "sans-serif"], ...src("src/theme/antd.ts", 20) } },
      fontSize: { $type: "dimension", base: { $value: "14px", ...src("src/theme/antd.ts", 21) } },
      radius: { $type: "dimension", md: { $value: "4px", ...src("src/theme/antd.ts", 19) } },
    };
    const got = await importFromAgent(dir, tokens, { notes: ["Dark mode comes from antd's darkAlgorithm, so it's filled in."] });
    expect(got.dropped.map((d) => d.token).sort()).toEqual(["color.card", "color.primary-foreground"]);
    if ("error" in got.result) throw new Error(got.result.error);
    expect(got.result.warnings).toContain("Dark mode comes from antd's darkAlgorithm, so it's filled in.");
    const applied = applyChangeset(PRESETS[0]!.build(), got.result.changeset);
    if (!applied.ok) throw new Error(applied.error);
    const s = grade("a1-antd-v5", dir, truthOf("a1-antd-v5"), { ok: true, system: applied.system, found: got.result.found, filled: got.result.filled, seconds: 0 });
    expect(s.accuracy).toBe(1);
    expect(s.trust?.precision).toBe(1);
    expect(s.trust?.evidence).toBe(1);
    expect(s.decoyHits).toEqual([]);
    // And back out as an antd theme: the team's own values, where antd reads them.
    const exported = emitPlatform(applied.system, "antd").split("export const darkTheme")[0]!;
    expect(exported).toContain('colorPrimary: "#0f766e"');
    expect(exported).toContain('colorError: "#be123c"');
    expect(exported).toContain('colorTextBase: "#111827"');
    expect(exported).toContain("borderRadius: 4,");
    expect(exported).toContain("fontSize: 14,");
    expect(exported).toMatch(/fontFamily: "IBM Plex Sans/);
  });

  it("won't read outside the project", async () => {
    const dir = stage("a1-antd-v5");
    dirs.push(dir);
    const got = await importFromAgent(dir, { color: { primary: { $value: "#0f766e", $type: "color", ...src("../../../etc/hosts", 1) } } });
    expect(got.dropped[0]?.why).toMatch(/outside the project/);
  });
});
