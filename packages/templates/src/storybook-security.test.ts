import { parseBundle, PRESETS } from "@tesserai/core";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { renderAll } from "./render";
import { storybookFilesFor } from "./storybook-frameworks";

const targets = [
  ["radix", "react-vite"], ["reka-ui", "vue3-vite"], ["bits-ui", "sveltekit"],
] as const;

describe.each(targets)("%s Storybook treats names as text", (target, framework) => {
  it.each(["\n", "\r", "\r\n", "\u2028", "\u2029"])("keeps a %j name inside its comment", async (newline) => {
    const system = PRESETS[0]!.build();
    system.excluded = Object.keys(system.components).filter((name) => name !== "button");
    system.name = `Review${newline}globalThis.storybookMetadataExecuted = 17; //`;
    expect(parseBundle(system).ok).toBe(true);
    const generated = await renderAll(target, system, { format: false });
    const { files } = storybookFilesFor(system, generated, { framework, storiesDir: "src/stories", stylesheet: "../src/style.css" });
    for (const file of files.filter((f) => f.path === ".storybook/main.ts" || f.path.endsWith(".stories.ts") || f.path.endsWith(".stories.tsx"))) {
      const ast = ts.createSourceFile(file.path, file.source, ts.ScriptTarget.Latest, true);
      // Inspect executable statements, without evaluating an untrusted payload.
      expect(ast.statements.some((s) => ts.isExpressionStatement(s) && s.getText(ast).includes("storybookMetadataExecuted")), file.path).toBe(false);
      expect(file.source.split(/[\r\n\u2028\u2029]/)[0], file.path).toContain("storybookMetadataExecuted");
    }
  });
});
