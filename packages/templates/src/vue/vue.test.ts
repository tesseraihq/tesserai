import { createSystemFromBrand, parseColor } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { formatSource } from "../format";
import { el, expr } from "../pages/jsx";
import { printVuePage } from "./page";
import { dependenciesFor, renderAll, renderComponentFiles, supportedComponents } from "../render";

// The render API for Vue. The Vue output's parity with React (classes, server-rendered DOM) and
// its type check run in packages/vue-fixture, which has Vue, Reka UI and vue-tsc installed.

const system = createSystemFromBrand("acme", parseColor("#2563eb")!);

// What a React file exports that the Vue folder doesn't, and why.
const REACT_ONLY: Record<string, string[]> = {
  // Base UI's render-function collection and its anchor ref: in Vue the rows are written out (v-for),
  // and ComboboxChips anchors the list itself.
  combobox: ["ComboboxCollection", "useComboboxAnchor"],
};

// The names a React file exports: export { A, B } and export type lines aside.
function reactExports(source: string): string[] {
  return [...source.matchAll(/^export \{([^}]+)\};/gm)].flatMap((m) =>
    m[1]!
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
}

describe("Vue on Reka UI", () => {
  it("prints a chart whose crosshair finds the datum and whose tooltip is headed by the category", async () => {
    // Without the marks' accessors Unovis warns in the console on every page with a chart; without
    // labelKey the tooltip is headed by the category's index (1) rather than its name (Feb).
    const { componentDocs } = await import("../docs");
    const chart = (await componentDocs(system, "reka-ui")).find((d) => d.name === "chart")!.example!;
    const crosshair = /<ChartCrosshair[\s\S]*?\/>/.exec(chart)![0];
    expect(crosshair).toMatch(/:x="/);
    expect(crosshair).toMatch(/:y="\[/);
    expect(crosshair).toMatch(/labelKey: 'x'/);
  });

  it("names no lint rule in a comment, which ESLint fails a file on when the project doesn't load the rule", async () => {
    // init's lint config loads @shadcn/lint and the parsers, not typescript-eslint's rules.
    for (const file of await renderAll("reka-ui", system)) expect(file.source, file.path).not.toMatch(/eslint-disable/);
  });

  // Parts a Vue barrel has beyond the React file's, and why.
  const EXTRA_PARTS: Record<string, string[]> = {
    // React's Calendar picks a range with mode="range"; Reka's range calendar is a root of its own
    // (RangeCalendarRoot), so it's its own component, as in shadcn-vue and React Aria's React file.
    calendar: ["RangeCalendar"],
  };

  it("exports the same components and helpers from each barrel as the React file does", async () => {
    const react = await renderAll("radix", system);
    for (const name of supportedComponents("reka-ui")) {
      const expected = reactExports(react.find((f) => f.path === `components/ui/${name}.tsx`)!.source).filter((e) => !REACT_ONLY[name]?.includes(e));
      const barrel = (await renderComponentFiles("reka-ui", system.components[name]!, system)).find((f) => f.path.endsWith("index.ts"))!.source;
      // Parts: the folder's components, and a library's own re-exported under shadcn's name (the
      // chart's ChartTooltip is Unovis' VisTooltip, as in shadcn-vue).
      const parts = [
        ...[...barrel.matchAll(/export \{ default as (\w+) \}/g)].map((m) => m[1]!),
        ...[...barrel.matchAll(/^export \{([^}]+)\} from "@[^"]+";/gm)].flatMap((m) => m[1]!.split(",").map((n) => n.trim().split(/\s+as\s+/).at(-1)!)).filter((n) => expected.includes(n)),
      ];
      // Helpers defined in the barrel, or passed on from a module beside it (useSidebar, useCarousel).
      const helpers = [
        ...[...barrel.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]!),
        ...[...barrel.matchAll(/^export \{([^}]+)\} from/gm)].flatMap((m) => m[1]!.split(",").map((n) => n.trim().split(/\s+as\s+/).at(-1)!)),
      ];
      // Components by the same names; the React file's variants functions (buttonVariants…) and
      // hooks (useSidebar…) too.
      expect(parts.sort(), name).toEqual([...expected.filter((e) => /^[A-Z]/.test(e)), ...(EXTRA_PARTS[name] ?? [])].sort());
      expect(helpers, name).toEqual(expect.arrayContaining(expected.filter((e) => /^[a-z]/.test(e) && !e.startsWith("type "))));
    }
    const button = (await renderComponentFiles("reka-ui", system.components["button"]!, system)).find((f) => f.path.endsWith("index.ts"))!.source;
    expect(button).toContain('export { default as Button } from "./Button.vue";');
    expect(button).toContain("export type ButtonVariantProps");
  });

  it("imports icons from Lucide's Vue package, and needs it installed", async () => {
    const content = (await renderComponentFiles("reka-ui", system.components["dialog"]!, system)).find((f) => f.path.endsWith("DialogContent.vue"))!.source;
    expect(content).toContain('import { XIcon } from "@lucide/vue";');
    const deps = dependenciesFor(system, "reka-ui");
    expect(deps).toEqual(expect.arrayContaining(["reka-ui", "@vueuse/core", "class-variance-authority", "clsx", "tailwind-merge", "@lucide/vue"]));
    expect(deps).not.toContain("lucide-react");
  });

  it("draws the system's icon library through its Vue package, with the same meanings as React", async () => {
    const icons = (library: string, extra: object = {}) => ({ ...system, icons: { library, stroke: 2, weight: "regular", spots: {}, custom: {}, ...extra } }) as typeof system;
    const importOf = async (s: typeof system, component: string, file: string) =>
      (await renderComponentFiles("reka-ui", s.components[component]!, s)).find((f) => f.path.endsWith(file))!.source;

    expect(await importOf(icons("tabler"), "select", "SelectTrigger.vue")).toContain('import { IconChevronDown as ChevronDownIcon } from "@tabler/icons-vue";');
    expect(await importOf(icons("phosphor"), "select", "SelectTrigger.vue")).toContain('import { PhCaretDown as ChevronDownIcon } from "@phosphor-icons/vue";');
    expect(await importOf(icons("remix", { weight: "fill" }), "select", "SelectTrigger.vue")).toContain('import { RiArrowDownSFill as ChevronDownIcon } from "@remixicon/vue";');
    // A weight or a stroke is drawn through a component per icon, in a module-level script.
    const bold = await importOf(icons("phosphor", { weight: "bold" }), "checkbox", "Checkbox.vue");
    expect(bold).toMatch(/<script lang="ts">[\s\S]*h\(PhCheck, \{ \.\.\.attrs, weight: "bold" \}\)[\s\S]*<\/script>\s*<script setup lang="ts">/);
    const huge = await importOf(icons("hugeicons", { stroke: 1.5 }), "spinner", "Spinner.vue");
    expect(huge).toContain('import { HugeiconsIcon } from "@hugeicons/vue";');
    expect(huge).toContain("icon: HgLoading03Icon, strokeWidth: 1.5");
    // A spot takes an icon from another library, or one of the system's own.
    const spots = icons("lucide", { spots: { "dialog:x": "tabler:IconCircleX", "select:check": "custom:acme-mark" } });
    expect(await importOf(spots, "dialog", "DialogContent.vue")).toContain('import { IconCircleX as XIcon } from "@tabler/icons-vue";');
    expect(await importOf(spots, "select", "SelectItem.vue")).toContain('import { AcmeMarkIcon as CheckIcon } from "@/components/icons";');

    expect(dependenciesFor(icons("phosphor"), "reka-ui")).toEqual(expect.arrayContaining(["@phosphor-icons/vue"]));
    expect(dependenciesFor(icons("hugeicons"), "reka-ui")).toEqual(expect.arrayContaining(["@hugeicons/core-free-icons", "@hugeicons/vue"]));
    expect(dependenciesFor(icons("tabler"), "reka-ui")).not.toContain("@lucide/vue");
    expect(dependenciesFor(icons("tabler"), "reka-ui").some((d) => d.endsWith("-react") || d.startsWith("@hugeicons/react"))).toBe(false);
  });

  it("prints a page tree as a Vue single-file component", () => {
    const tree = el(
      "div",
      undefined,
      { className: "flex gap-2", tabIndex: 0 },
      el("Switch", "switch", { checked: expr("on"), onCheckedChange: expr("setOn") }),
      el("Checkbox", "checkbox", { defaultChecked: true, "aria-label": 'Say "yes"' }),
      el("Tabs", "tabs", { value: expr("tab"), onValueChange: expr('(v) => setTab(v === "a" ? "a" : "b")') }),
      el("Dialog", "dialog", { open: expr("open"), onOpenChange: expr("setOpen") }, { k: "trigger", from: "dialog", as: "DialogTrigger", child: el("Button", "button", {}, "Open") }),
      el("Button", "button", { onClick: expr("() => setCount((c) => c + 1)"), disabled: expr('tab === "b"') }, "Add"),
      el("span", undefined, {}, { k: "expr", code: "count" }, " {items} & more"),
      el("CircleIcon", "lucide-react", { className: "size-4" }),
    );
    const source = printVuePage({
      root: tree,
      states: [
        { value: "on", set: "setOn", type: "boolean", initial: "false" },
        { value: "tab", set: "setTab", type: "string", initial: '"a"' },
        { value: "open", set: "setOpen", type: "boolean", initial: "false" },
        { value: "count", set: "setCount", type: "number", initial: "0" },
      ],
      exports: new Map(),
      name: "demo",
      system,
    });
    expect(source.split("\n")[0]).toBe("<!-- DemoPage: generated by tesserai from a page spec, using this system's components. -->");
    expect(source).toContain('import { CircleIcon } from "@lucide/vue";');
    expect(source).toContain('import { Switch } from "@/components/ui/switch";');
    expect(source).toContain("const on = ref<boolean>(false);");
    // A setter only where the page calls it; a state and its setter together are v-model.
    expect(source).not.toContain("const setOn");
    expect(source).toContain("const setCount = (next: number | ((last: number) => number)) => (count.value = typeof next === \"function\" ? next(count.value) : next);");
    expect(source).toContain('<div class="flex gap-2" :tabindex="0">');
    expect(source).toContain('<Switch v-model="on" />');
    // A string with a double quote is bound, the quote written as an entity.
    expect(source).toContain(`<Checkbox :aria-label="'Say &quot;yes&quot;'" :default-value="true" />`);
    expect(source).toContain(`<Tabs @update:model-value="(v) => setTab(v === 'a' ? 'a' : 'b')" :model-value="tab" />`);
    expect(source).toMatch(/<Dialog v-model:open="open">\s*<DialogTrigger as-child>\s*<Button>Open<\/Button>\s*<\/DialogTrigger>\s*<\/Dialog>/);
    expect(source).toContain(`<Button @click="() => setCount((c) => c + 1)" :disabled="tab === 'b'">Add</Button>`);
    expect(source).toContain("{{ count }}");
    expect(source).toContain('{{ " {items} & more" }}');
  });

  // lib/utils.ts is written as it's meant to read, for every framework, and isn't formatted.
  it("is formatted, and formatting it again changes nothing", async () => {
    const raw = await renderAll("reka-ui", system, { format: false });
    const formatted = await renderAll("reka-ui", system);
    for (const [i, file] of formatted.entries()) {
      if (!file.path.startsWith("components/")) continue;
      expect(file.source, file.path).toBe(await formatSource(file.path, raw[i]!.source));
      expect(await formatSource(file.path, file.source), file.path).toBe(file.source);
    }
  });
});
