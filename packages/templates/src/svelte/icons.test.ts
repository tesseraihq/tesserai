import { createSystemFromBrand, parseColor, PRESETS, type IconSettings } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { dependenciesFor, renderAll } from "../render";
import { applySvelteIcons, pascalToKebab, svelteCustomIconFiles, svelteIconPackages } from "./icons";

const source = `<script lang="ts">
  import type { ComponentProps } from "svelte";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ZapIcon from "@lucide/svelte/icons/zap";
  import { cn } from "$UTILS$.js";

  let { class: className, ...restProps }: ComponentProps<typeof ChevronDownIcon> = $props();
</script>

<ChevronDownIcon class={cn("size-4", className)} {...restProps} />
<CheckIcon aria-hidden="true"></CheckIcon>
<span>ChevronDownIcon</span>
`;
const withIcons = (icons: Partial<IconSettings>) => ({ icons: { library: "lucide", stroke: 2, weight: "regular", spots: {}, custom: {}, ...icons } as IconSettings });
const packagesFor = (icons: Partial<IconSettings>) => svelteIconPackages({ ...withIcons(icons), intents: {} });

describe("icons in generated Svelte code", () => {
  it("names Tabler and Remix icons' files as their packages do", () => {
    expect(["ChevronDown", "Stack2", "Loader2", "ArrowDownSLine", "Download2Line", "LogoutBoxRLine", "AB2", "24Hours"].map(pascalToKebab)).toEqual([
      "chevron-down",
      "stack-2",
      "loader-2",
      "arrow-down-s-line",
      "download-2-line",
      "logout-box-r-line",
      "a-b-2",
      "24-hours",
    ]);
  });

  it("leaves Lucide as it is", () => {
    expect(applySvelteIcons(source, "select", PRESETS[0]!.build())).toBe(source);
    expect(applySvelteIcons(source, "select", withIcons({ stroke: 1.5, spots: { "dialog:x": "plus" } }))).toBe(source);
  });

  it("imports another library's component under the same name, keeping icons it doesn't map on Lucide", () => {
    const out = applySvelteIcons(source, "select", withIcons({ library: "tabler" }));
    expect(out).toContain(`  import CheckIcon from "@tabler/icons-svelte-runes/icons/check";\n  import ChevronDownIcon from "@tabler/icons-svelte-runes/icons/chevron-down";\n  import ZapIcon from "@lucide/svelte/icons/zap";\n  import { cn } from "$UTILS$.js";`);
    // The markup is as it was.
    expect(out.slice(out.indexOf("</script>"))).toBe(source.slice(source.indexOf("</script>")));
    const remix = applySvelteIcons(source, "select", withIcons({ library: "remix", weight: "fill" }));
    expect(remix).toContain(`import ChevronDownIcon from "remixicon-svelte/icons/arrow-down-s-fill";`);
    expect(applySvelteIcons(source, "select", withIcons({ library: "remix" }))).toContain(`import ChevronDownIcon from "remixicon-svelte/icons/arrow-down-s-line";`);
    const phosphor = applySvelteIcons(source, "select", withIcons({ library: "phosphor" }));
    expect(phosphor).toContain(`import ChevronDownIcon from "phosphor-svelte/lib/CaretDownIcon";`);
    expect(phosphor).toContain(`<ChevronDownIcon class=`);
  });

  it("puts a Phosphor weight on each tag, and draws Hugeicons through HugeiconsIcon", () => {
    const phosphor = applySvelteIcons(source, "select", withIcons({ library: "phosphor", weight: "bold" }));
    expect(phosphor).toContain(`import ChevronDownIcon from "phosphor-svelte/lib/CaretDownIcon";`);
    expect(phosphor).toContain(`<ChevronDownIcon weight="bold" class={cn("size-4", className)} {...restProps} />`);
    expect(phosphor).toContain(`<CheckIcon weight="bold" aria-hidden="true"></CheckIcon>`);
    // Text isn't a tag.
    expect(phosphor).toContain(`<span>ChevronDownIcon</span>`);

    const huge = applySvelteIcons(source, "select", withIcons({ library: "hugeicons", stroke: 1.5 }));
    expect(huge).toContain(`  import { ArrowDown01Icon as HgArrowDown01Icon, Tick02Icon as HgTick02Icon } from "@hugeicons/core-free-icons";\n  import { HugeiconsIcon } from "@hugeicons/svelte";`);
    expect(huge).toContain(`<HugeiconsIcon icon={HgArrowDown01Icon} strokeWidth={1.5} class={cn("size-4", className)} {...restProps} />`);
    expect(huge).toContain(`<HugeiconsIcon icon={HgTick02Icon} strokeWidth={1.5} aria-hidden="true"></HugeiconsIcon>`);
    // A type naming the icon names what draws it now.
    expect(huge).toContain(`}: Omit<ComponentProps<typeof HugeiconsIcon>, "icon"> = $props();`);
    expect(huge).toContain(`import ZapIcon from "@lucide/svelte/icons/zap";`);
    expect(huge).not.toMatch(/<ChevronDownIcon|<CheckIcon/);
  });

  it("puts a spot's own icon in its place, from another library or the system's own", () => {
    const out = applySvelteIcons(
      source,
      "select",
      withIcons({ spots: { "select:chevron-down": "custom:acme-logo", "select:check": "tabler:IconCircleCheck", "select:zap": "lucide:Trash2Icon", "dialog:x": "plus" } }),
    );
    expect(out).toContain(`  import CheckIcon from "@tabler/icons-svelte-runes/icons/circle-check";\n  import ZapIcon from "@lucide/svelte/icons/trash-2";\n  import { AcmeLogoIcon as ChevronDownIcon } from "$COMPONENTS$/icons/index.js";\n`);
    expect(applySvelteIcons(source, "select", withIcons({ library: "tabler", spots: { "select:check": "hugeicons:Tick01Icon", "select:zap": "phosphor:LightningIcon", "select:chevron-down": "remix:RiArrowDownLine" } }))).toContain(
      `  import ChevronDownIcon from "remixicon-svelte/icons/arrow-down-line";\n  import ZapIcon from "phosphor-svelte/lib/LightningIcon";\n  import { Tick01Icon as HgTick01Icon } from "@hugeicons/core-free-icons";`,
    );
  });

  it("names the packages the code imports", () => {
    expect(svelteIconPackages(PRESETS[0]!.build())).toEqual(["@lucide/svelte"]);
    expect(packagesFor({ library: "tabler" })).toEqual(["@tabler/icons-svelte-runes"]);
    expect(packagesFor({ library: "tabler", spots: { "select:check": "zap" } })).toEqual(["@tabler/icons-svelte-runes", "@lucide/svelte"]);
    expect(packagesFor({ library: "hugeicons" })).toEqual(["@hugeicons/svelte", "@hugeicons/core-free-icons"]);
    expect(packagesFor({ library: "phosphor", spots: { "select:check": "custom:acme", "dialog:x": "remix:RiCloseLine" } })).toEqual(["phosphor-svelte", "remixicon-svelte"]);
    const system = { ...createSystemFromBrand("acme", parseColor("#2563eb")!), ...withIcons({ library: "remix" }) };
    expect(dependenciesFor(system, "bits-ui")).toContain("remixicon-svelte");
    expect(dependenciesFor(system, "bits-ui")).not.toContain("@lucide/svelte");
  });

  it("writes the system's own icons as Svelte components that follow the text color", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" fill="currentColor"><path fill-rule="evenodd" d="M0 0h48v24z"/></svg>';
    const files = svelteCustomIconFiles(withIcons({ custom: { "acme-logo": { name: "Acme logo", svg }, mark: { name: "Mark", svg, dark: svg.replace("currentColor", "#fff") } } }));
    expect(files.map((f) => f.path)).toEqual(["components/icons/acme-logo.svelte", "components/icons/mark.svelte", "components/icons/index.ts"]);
    expect(files[0]!.source).toContain(`let { class: className, ...restProps }: SVGAttributes<SVGSVGElement> = $props();`);
    expect(files[0]!.source).toContain(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" fill="currentColor" width={48} height={24} class={className} {...restProps}><path fill-rule="evenodd" d="M0 0h48v24z"/></svg>`);
    expect(files[1]!.source).toContain(`const lightClasses = "dark:hidden";`);
    expect(files[1]!.source).toContain(`import { cn } from "$UTILS$.js";`);
    expect(files[1]!.source).toContain(`width={48} height={24} class={cn(darkClasses, className)} {...restProps}`);
    expect(files[2]!.source).toBe(`export { default as AcmeLogoIcon } from "./acme-logo.svelte";\nexport { default as MarkIcon } from "./mark.svelte";\n`);
    expect(svelteCustomIconFiles(PRESETS[0]!.build())).toEqual([]);
  });

  it("escapes braces in an icon's attributes, which Svelte would read as expressions", () => {
    const [file] = svelteCustomIconFiles(withIcons({ custom: { odd: { name: "Odd </script>", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24z" id="{x}"/></svg>' } } }));
    expect(file!.source).toContain(`id="&#123;x&#125;"`);
    expect(file!.source).toContain(`// Odd <\\/script>`);
  });

  it("render with the system's icons in renderAll, and its own icons beside the components", async () => {
    const system = { ...createSystemFromBrand("acme", parseColor("#2563eb")!), ...withIcons({ library: "hugeicons", custom: { "acme-logo": { name: "Acme logo", svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24z"/></svg>' } } }) };
    const files = await renderAll("bits-ui", system);
    const content = files.find((f) => f.path.endsWith("dialog-content.svelte"))!.source;
    expect(content).toContain(`from "@hugeicons/core-free-icons"`);
    expect(content).toMatch(/<HugeiconsIcon\s+icon=\{HgCancel01Icon\}/);
    expect(files.map((f) => f.path)).toEqual(expect.arrayContaining(["components/icons/acme-logo.svelte", "components/icons/index.ts"]));
  });
});
