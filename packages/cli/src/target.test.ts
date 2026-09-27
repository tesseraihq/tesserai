import { PRESETS } from "@tesserai/core";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectProject } from "./detect";
import { chooseTarget, syncTarget, TargetError } from "./target";

const all = () => true;
const system = (framework?: "vue" | "svelte") => ({ ...PRESETS[0]!.build(), base: "radix" as const, ...(framework === undefined ? {} : { framework }) });

async function projectWith(dependencies: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), "tesserai-target-"));
  await writeFile(join(dir, "package.json"), JSON.stringify({ dependencies }));
  return detectProject(dir);
}

describe("which framework a project gets", () => {
  it("reads the framework from the project's dependencies", async () => {
    expect((await projectWith({ react: "^19", next: "16" })).ui).toBe("react");
    expect((await projectWith({ nuxt: "^4" })).ui).toBe("vue");
    expect((await projectWith({ vue: "^3.5" })).ui).toBe("vue");
    const kit = await projectWith({ "@sveltejs/kit": "^2", svelte: "^5.1" });
    expect([kit.ui, kit.svelteMajor]).toEqual(["svelte", 5]);
    const both = await projectWith({ react: "^19", vue: "^3" });
    expect(both.ui).toBe("unknown");
    expect(both.warnings.join()).toMatch(/react and vue/);
  });

  it("follows the project, not the system, and says so when they differ", () => {
    expect(chooseTarget({ ui: "vue" }, system(), undefined, all)).toEqual({ target: "reka-ui", note: expect.stringMatching(/shown in React; this project is Vue/) });
    expect(chooseTarget({ ui: "react" }, system("svelte"), undefined, all).target).toBe("radix");
    expect(chooseTarget({ ui: "svelte", svelteMajor: 5 }, system("svelte"), undefined, all)).toEqual({ target: "bits-ui", note: null });
    // An empty folder takes the system's framework.
    expect(chooseTarget({ ui: "unknown" }, system("vue"), undefined, all).target).toBe("reka-ui");
    expect(chooseTarget({ ui: "react" }, system(), "react-aria", all).target).toBe("react-aria");
  });

  it("refuses what it can't do well, in words that say what to do", () => {
    expect(() => chooseTarget({ ui: "svelte", svelteMajor: 4 }, system(), undefined, all)).toThrow(/Svelte 4.*sv migrate svelte-5/);
    expect(() => chooseTarget({ ui: "vue" }, system(), "base-ui", all)).toThrow(TargetError);
    // A framework that isn't offered yet is refused, not half-written.
    expect(() => chooseTarget({ ui: "vue" }, system(), undefined, (f) => f === "react")).toThrow(/doesn't write Vue components yet/);
  });

  it("keeps a project's framework on sync, and follows the React library within React", () => {
    expect(syncTarget("reka-ui", system()).target).toBe("reka-ui");
    expect(syncTarget("base-ui", system("vue"))).toEqual({ target: "radix", note: expect.stringMatching(/stays React/) });
    expect(syncTarget("bits-ui", system("svelte"))).toEqual({ target: "bits-ui", note: null });
  });
});
