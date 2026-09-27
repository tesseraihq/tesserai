import { PRESETS, tokenDocs } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { componentDocs } from "./docs";

const system = PRESETS[0]!.build();

describe("docs", () => {
  it("lists every value with the class that uses it", () => {
    const d = tokenDocs(system);
    const primary = d.meanings.find((m) => m.name === "primary")!;
    expect(primary.roles.find((r) => r.name === "solid")).toMatchObject({ use: "bg-primary-solid", light: expect.stringMatching(/^#/) });
    expect(primary.roles.find((r) => r.name === "border")!.use).toBe("border-primary-border");
    expect(primary.roles.find((r) => r.name === "text")!.use).toBe("text-primary-text");
    expect(d.surfaces[0]).toMatchObject({ name: "page", use: "bg-(--surface-page)" });
    expect(d.radius.find((r) => r.name === "md")).toMatchObject({ use: "rounded-md" });
    expect(d.fonts.map((f) => f.use)).toEqual(["font-sans", "font-heading", "font-mono"]);
  });

  it("documents each component from its generated code", async () => {
    const docs = await componentDocs(system);
    expect(docs[0]!.name).toBe("button");
    const dialog = docs.find((c) => c.name === "alert-dialog")!;
    expect(dialog.exports).toContain("AlertDialogTrigger");
    expect(dialog.requires).toEqual(["button"]);
    expect(dialog.importLine).toMatch(/^import \{ AlertDialog, .* \} from "@\/components\/ui\/alert-dialog";$/);
    const button = docs[0]!;
    expect(button.props.map((p) => p.name)).toEqual(["variant", "intent", "size"]);
    expect(button.props[0]!.default).toBe("solid");
  });

  // What people copy: a SvelteKit project's $lib, not shadcn-svelte's import placeholders.
  it("writes Svelte examples with $lib imports", async () => {
    const docs = await componentDocs(system, "bits-ui");
    const examples = docs.flatMap((d) => (d.example === null ? [] : [d.example]));
    expect(examples.length).toBeGreaterThan(20);
    for (const example of examples) expect(example).not.toMatch(/\$(UI|UTILS|LIB|HOOKS|COMPONENTS)\$/);
    expect(docs.find((d) => d.name === "button")!.example).toContain('from "$lib/components/ui/button/index.js"');
  });

  // A project on another React library than the system's gets examples in that library's idiom.
  it("prints React examples for the library asked for", async () => {
    const baseUi = { ...system, base: "base-ui" as const };
    const dialog = async (target: "base-ui" | "radix") => (await componentDocs(baseUi, target)).find((d) => d.name === "dialog")!.example!;
    expect(await dialog("base-ui")).toContain("render={");
    expect(await dialog("radix")).toContain("asChild");
    expect(await dialog("radix")).not.toContain("render={");
  });
});
