import type { Anatomy } from "@tesserai/core";
import { q, unionType } from "../codegen";
import { RADIX_TOGGLE_STATES } from "../radix/toggle";
import type { GeneratedFile } from "../render";
import { togglePieces, toggleGroupPieces } from "../toggle-shared";
import { bitsImport, cva, indexFile, indexParts, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";
import { BITS_STATES } from "./states";

// Bits marks a pressed toggle data-state=on, as Radix does.
const TOGGLE_STATES = { ...BITS_STATES, selected: RADIX_TOGGLE_STATES.selected };

// Toggle on Bits (bind:pressed), with the system's variant and size; shadcn's "default" variant is
// the transparent one. toggleVariants and toggleVariant are exported for Toggle Group's items.
export function toggleFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, sizes, defaultVariant, defaultSize, aliases } = togglePieces(anatomy, TOGGLE_STATES);
  return [
    svelteFile("toggle/toggle.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("toggleVariants", slots.toggle)}

export type ToggleVariant = ${unionType(variants)};
export type ToggleSize = ${unionType(sizes)};
export type ToggleVariants = VariantProps<typeof toggleVariants>;

// shadcn calls the transparent toggle "default"; it maps to ${q(aliases.default)} here.
export function toggleVariant(variant: ToggleVariant | "default" | undefined): ToggleVariant {
  return variant === undefined ? ${q(defaultVariant)} : variant === "default" ? ${q(aliases.default)} : variant;
}`,
      script: `${bitsImport("Toggle")}
${UTILS_IMPORT(["cn"])}

let {
  ref = $bindable(null),
  pressed = $bindable(false),
  class: className,
  variant,
  size = ${q(defaultSize)},
  ...restProps
}: TogglePrimitive.RootProps & { variant?: ToggleVariant | "default" | undefined; size?: ToggleSize | undefined } = $props();

const resolved = $derived(toggleVariant(variant));`,
      markup: `<TogglePrimitive.Root bind:ref bind:pressed data-slot="toggle" data-variant={resolved} data-size={size} class={cn(toggleVariants({ variant: resolved, size }), className)} {...restProps} />`,
    }),
    indexFile("toggle/index.ts", indexParts([["toggle.svelte", "Root", "Toggle"]]), [
      { file: "toggle.svelte", names: ["toggleVariants", "toggleVariant", "type ToggleVariant", "type ToggleSize", "type ToggleVariants"] },
    ]),
  ];
}

// Toggle Group on Bits (type="single" or "multiple"). The group's variant, size and spacing reach
// its items through context; an item is the Toggle's cva plus the joined-group classes.
export function toggleGroupFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = toggleGroupPieces(anatomy, BITS_STATES);
  return [
    svelteFile("toggle-group/toggle-group.svelte", {
      module: `import { getContext, setContext } from "svelte";
${uiImport("toggle", ["type ToggleSize", "type ToggleVariant"])}

export type ToggleGroupSettings = {
  variant?: ToggleVariant | "default" | undefined;
  size?: ToggleSize | undefined;
  spacing?: number | undefined;
};

const key = Symbol("toggle-group");

export function setToggleGroupCtx(settings: ToggleGroupSettings) {
  setContext(key, settings);
}

export function getToggleGroupCtx(): ToggleGroupSettings {
  return getContext<ToggleGroupSettings | undefined>(key) ?? {};
}`,
      script: `${bitsImport("ToggleGroup")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["toggle-group"])};

let {
  ref = $bindable(null),
  value = $bindable(),
  class: className,
  style,
  variant,
  size,
  spacing,
  orientation = "horizontal",
  ...restProps
}: ToggleGroupPrimitive.RootProps & ToggleGroupSettings = $props();

// Read when an item renders, so a changed setting reaches the items.
setToggleGroupCtx({
  get variant() {
    return variant;
  },
  get size() {
    return size;
  },
  get spacing() {
    return spacing;
  },
});

// An explicit spacing is a gap in Tailwind spacing units.
const gap = $derived(spacing === undefined || spacing === 0 ? "" : \`gap: calc(var(--spacing) * \${spacing});\`);`,
      markup: `<!-- value is a string or an array by type, which destructuring can't narrow: hence the cast. -->
<ToggleGroupPrimitive.Root
  bind:ref
  bind:value={value as never}
  data-slot="toggle-group"
  data-variant={variant}
  data-size={size}
  data-spacing={spacing}
  data-orientation={orientation}
  {orientation}
  style={[gap, style].filter(Boolean).join(" ") || undefined}
  class={cn(classes, className)}
  {...restProps}
/>`,
    }),
    svelteFile("toggle-group/toggle-group-item.svelte", {
      script: `${bitsImport("ToggleGroup")}
${uiImport("toggle", ["toggleVariant", "toggleVariants", "type ToggleSize", "type ToggleVariant"])}
${UTILS_IMPORT(["cn"])}
import { getToggleGroupCtx } from "./toggle-group.svelte";

const classes = ${quoted(slots["toggle-group-item"])};

let {
  ref = $bindable(null),
  class: className,
  variant,
  size,
  ...restProps
}: ToggleGroupPrimitive.ItemProps & { variant?: ToggleVariant | "default" | undefined; size?: ToggleSize | undefined } = $props();

const group = getToggleGroupCtx();
const v = $derived(toggleVariant(group.variant ?? variant));
const s = $derived(group.size ?? size);`,
      markup: `<ToggleGroupPrimitive.Item
  bind:ref
  data-slot="toggle-group-item"
  data-variant={v}
  data-size={s}
  data-spacing={group.spacing}
  class={cn(toggleVariants({ variant: v, size: s }), classes, className)}
  {...restProps}
/>`,
    }),
    indexFile(
      "toggle-group/index.ts",
      indexParts([
        ["toggle-group.svelte", "Root", "ToggleGroup"],
        ["toggle-group-item.svelte", "Item", "ToggleGroupItem"],
      ]),
    ),
  ];
}
