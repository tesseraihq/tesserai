import { PRESETS, type IconSettings } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { applyIcons, customIconsFile, meaningOf } from "./icons";

const source = `import * as React from "react";
import { CheckIcon, ChevronDownIcon, ZapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Select() {
  return <ChevronDownIcon className="size-4" />;
}
`;
const withIcons = (icons: Partial<IconSettings>) => ({ icons: { library: "lucide", stroke: 2, weight: "regular", spots: {}, custom: {}, ...icons } as IconSettings });

describe("icons in generated code", () => {
  it("names icons by meaning", () => {
    expect(["ChevronDownIcon", "Loader2Icon", "ChevronsUpDownIcon", "OctagonXIcon", "Trash2Icon"].map(meaningOf)).toEqual(["chevron-down", "loader-2", "chevrons-up-down", "octagon-x", "trash-2"]);
  });

  it("leaves Lucide as it is", () => {
    expect(applyIcons(source, "select", PRESETS[0]!.build())).toBe(source);
  });

  it("imports another library under the same names, keeping icons it doesn't map on Lucide", () => {
    const out = applyIcons(source, "select", withIcons({ library: "tabler" }));
    expect(out).toContain(`import { IconCheck as CheckIcon, IconChevronDown as ChevronDownIcon } from "@tabler/icons-react";`);
    expect(out).toContain(`import { ZapIcon } from "lucide-react";`);
    expect(out).toContain(`return <ChevronDownIcon className="size-4" />;`);
  });

  it("draws Phosphor weights and Hugeicons through one-line components", () => {
    const phosphor = applyIcons(source, "select", withIcons({ library: "phosphor", weight: "light" }));
    expect(phosphor).toContain(`const ChevronDownIcon = (props: ComponentProps<typeof PhCaretDownIcon>) => <PhCaretDownIcon weight="light" {...props} />;`);
    expect(phosphor).toContain(`import type { ComponentProps } from "react";`);
    const huge = applyIcons(source, "select", withIcons({ library: "hugeicons", stroke: 1.5 }));
    expect(huge).toContain(`<HugeiconsIcon icon={HgArrowDown01Icon} strokeWidth={1.5} {...props} />`);
    expect(huge).toContain(`import { HugeiconsIcon } from "@hugeicons/react";`);
    // The wrappers come after every import.
    expect(huge.indexOf("const ChevronDownIcon")).toBeGreaterThan(huge.indexOf(`from "@/lib/utils"`));
    const remix = applyIcons(source, "select", withIcons({ library: "remix", weight: "fill" }));
    expect(remix).toContain(`RiArrowDownSFill as ChevronDownIcon`);
  });

  it("puts a spot's own icon in its place, from another library or the system's own", () => {
    const out = applyIcons(source, "select", withIcons({ spots: { "select:chevron-down": "custom:acme-logo", "select:check": "tabler:IconCircleCheck", "dialog:x": "plus" } }));
    expect(out).toContain(`import { AcmeLogoIcon as ChevronDownIcon } from "@/components/icons";`);
    expect(out).toContain(`import { IconCircleCheck as CheckIcon } from "@tabler/icons-react";`);
    // Another component's spot doesn't touch this one.
    expect(applyIcons(source, "select", withIcons({ spots: { "dialog:x": "plus" } }))).toBe(source);
  });

  it("writes the system's own icons as components that follow the text color", () => {
    const file = customIconsFile(withIcons({ custom: { "acme-logo": { name: "Acme logo", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" fill="currentColor"><path fill-rule="evenodd" d="M0 0h48v24z"/></svg>' } } }));
    expect(file?.path).toBe("components/icons.tsx");
    expect(file?.source).toContain(`export function AcmeLogoIcon(props: ComponentProps<"svg">) {`);
    expect(file?.source).toContain(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" fill="currentColor" width={48} height={24} {...props}><path fillRule="evenodd"`);
    expect(customIconsFile(PRESETS[0]!.build())).toBeNull();
  });
});
