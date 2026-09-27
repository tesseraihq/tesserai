import type { Anatomy } from "@tesserai/core";
import type { StatePrefixes } from "./classes";
import { classString, cvaSource, q, unionType } from "./codegen";
import { factorClasses, flatClasses } from "./factor";
import { LABEL_TRUNCATES, SHRINKS, TEXT_IN_SPAN } from "./label";
import { RADIX_STATES } from "./radix/states";

// The list's variant and the root's orientation, as seen from a tab.
const inVariant = (variant: string) => `group-data-[variant=${variant}]/tabs-list:`;
const VERTICAL = "group-data-[orientation=vertical]/tabs:";
const HORIZONTAL = "group-data-[orientation=horizontal]/tabs:";

export type TabsFlavor = {
  states: StatePrefixes;
  // How the selected tab is marked: data-active (Base UI), data-[state=active] (Radix), data-selected.
  selected: string;
  imports: string;
  // Tabs, TabsList, TabsTrigger and TabsContent, given each one's class string. TabsList resolves
  // its variant with resolveVariant and styles itself with tabsListVariants.
  components: (classes: { root: string; trigger: string; content: string }) => string;
};

// Radix marks the selected tab data-state=active.
export const RADIX_TABS: Pick<TabsFlavor, "states" | "selected"> = { states: { ...RADIX_STATES, selected: ["data-[state=active]:"] }, selected: "data-[state=active]:" };

// Tabs' classes and variants, which every framework's shell prints from. The list is a cva by
// variant; a tab reads the list's variant (group-data-[variant]/tabs-list) and the root's
// orientation (group-data-[orientation]/tabs), so both must be written out as data attributes.
export function tabsPieces(anatomy: Anatomy, flavor: Pick<TabsFlavor, "states" | "selected"> = RADIX_TABS) {
  const opts = { states: flavor.states };
  const variants = anatomy.axes.variant?.enabled ?? [];

  const list = factorClasses(anatomy, "list", { ...opts, borderSides: "bottom" }, [
    "group/tabs-list",
    "inline-flex",
    "w-fit",
    ...SHRINKS,
    "items-center",
    `${VERTICAL}h-fit`,
    `${VERTICAL}flex-col`,
    `${VERTICAL}items-stretch`,
    `${VERTICAL}border-b-0`,
  ]);

  // Standing vertically, the list's bottom border becomes its end border.
  const sideways = (classes: string[]) => classes.flatMap((c) => (c.startsWith("border-b-(") ? [c, `${VERTICAL}border-e-${c.slice("border-b-".length)}`] : [c]));
  list.base = sideways(list.base);
  for (const [v, classes] of Object.entries(list.variants.variant ?? {})) list.variants.variant![v] = sideways(classes);

  // A tab's own styles, then whatever each list variant adds to it.
  const tab = factorClasses(anatomy, "tab", { ...opts, label: true });
  const tabClasses = [
    "relative",
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "whitespace-nowrap",
    ...SHRINKS,
    ...LABEL_TRUNCATES,
    "outline-none",
    "transition-[color,background-color,box-shadow]",
    `${VERTICAL}justify-start`,
    "[&_svg]:pointer-events-none",
    "[&_svg]:shrink-0",
    ...tab.base,
    ...Object.entries(tab.variants.variant ?? {}).flatMap(([v, classes]) => classes.map((c) => inVariant(v) + c)),
  ];

  // The indicator: a bar along the tab's outer edge, shown on the selected tab.
  const indicator = factorClasses(anatomy, "indicator", { ...opts, prefix: "after:" });
  const bar = (classes: string[]) =>
    classes.flatMap((c) => {
      const thickness = /^after:h-(.*)$/.exec(c);
      // The bar's thickness is its height across the bottom, its width down the side.
      return thickness === null ? [c] : [HORIZONTAL + c, `${VERTICAL}after:w-${thickness[1]}`];
    });
  tabClasses.push(
    "after:absolute",
    "after:opacity-0",
    "after:transition-opacity",
    `${HORIZONTAL}after:inset-x-0`,
    `${HORIZONTAL}after:-bottom-(--border-width)`,
    `${VERTICAL}after:inset-y-0`,
    `${VERTICAL}after:-end-(--border-width)`,
    ...bar(indicator.base),
    ...Object.entries(indicator.variants.variant ?? {}).flatMap(([v, classes]) => bar(classes).map((c) => inVariant(v) + c)),
    `${flavor.selected}after:opacity-100`,
  );
  // shadcn's "default" is the segmented look, when the system has one and no "default" of its own.
  const aliases: Record<string, string> = variants.includes("segmented") && !variants.includes("default") ? { default: "segmented" } : {};
  return {
    slots: {
      tabs: ["group/tabs", "flex", "gap-2", "data-[orientation=horizontal]:flex-col"],
      "tabs-list": list,
      "tabs-trigger": tabClasses,
      "tabs-content": flatClasses(anatomy, "panel", opts, ["flex-1", "outline-none"]),
    },
    variants: [...variants],
    defaultVariant: anatomy.axes.variant?.default ?? variants[0] ?? "line",
    aliases,
  };
}

// Tabs as in shadcn: TabsList takes a variant (line or segmented here; shadcn's "default" is
// segmented), Tabs an orientation, and the selected tab's underline is an ::after bar, so it looks
// the same on every library.
export function tabsSource(anatomy: Anatomy, flavor: TabsFlavor): string {
  const { slots, variants, defaultVariant, aliases: aliasMap } = tabsPieces(anatomy, flavor);
  const aliases = "default" in aliasMap ? `\n// shadcn's name for the segmented look.\nconst aliases = { default: "segmented" } as const;` : "\nconst aliases = {} as const;";

  return `import * as React from "react";
${flavor.imports}
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("tabsListVariants", slots["tabs-list"])}

type Variant = ${unionType(variants)};${aliases}
type Alias = keyof typeof aliases;

function resolveVariant(variant: Variant | Alias | undefined): Variant {
  if (variant === undefined) return ${q(defaultVariant)};
  return variant in aliases ? aliases[variant as Alias] : (variant as Variant);
}

${TEXT_IN_SPAN}

${flavor.components({ root: classString(slots.tabs), trigger: classString(slots["tabs-trigger"]), content: classString(slots["tabs-content"]) })}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
export type TabsListVariants = VariantProps<typeof tabsListVariants>;
`;
}
