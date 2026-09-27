import type { Anatomy } from "@tesserai/core";
import { q, unionType } from "../codegen";
import { dropdownMenuPieces, RADIX_MENU_MOTION } from "../radix/dropdown-menu";
import { popoverPieces } from "../radix/popover";
import { SELECT_POPUP_MOTION, selectPieces } from "../radix/select";
import { tooltipPieces } from "../radix/tooltip";
import type { GeneratedFile } from "../render";
import { RADIX_ARROW } from "../tooltip-arrow";
import { elementPart } from "./elements";
import { bitsImport, cva, indexFile, indexParts, lucideImport, partFile, quoted, svelteFile, UTILS_IMPORT, type PartFile } from "./emit";
import { BITS_POPUP_MOTION, BITS_STATES, bitsVars } from "./states";

// A Bits part of a popup component: its own props type, tag and folder.
function primitives(folder: string, namespace: string) {
  const local = `${namespace}Primitive`;
  return (file: string, part: string, extra: Partial<PartFile> = {}) =>
    partFile({ path: `${folder}/${file}`, imports: [`import { ${namespace} as ${local} } from "bits-ui";`], props: `${local}.${part}Props`, tag: `${local}.${part}`, ...extra });
}

// The content of a floating popup, rendered in its portal (portalProps={{ disabled: true }} renders
// it in place), as in React.
function contentFile(path: string, namespace: string, slot: string, classes: string[], defaults: Record<string, string>, inner?: string, extraScript = ""): GeneratedFile {
  const local = `${namespace}Primitive`;
  const portal = `${path.split("/")[0]}-portal.svelte`;
  const Portal = `${namespace}Portal`;
  const props = Object.entries(defaults);
  return svelteFile(path, {
    script: `import { ${namespace} as ${local} } from "bits-ui";
import type { ComponentProps } from "svelte";
${extraScript}${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import ${Portal} from "./${portal}";

const classes = ${quoted(classes)};

let {
  ref = $bindable(null),
  class: className,
${props.map(([name, value]) => `  ${name} = ${value},`).join("\n")}
  portalProps,
${inner === undefined ? "" : "  children,\n"}  ...restProps
}: ${inner === undefined ? `${local}.ContentProps` : `WithoutChildrenOrChild<${local}.ContentProps> & { children?: import("svelte").Snippet }`} & {
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof ${Portal}>>;
} = $props();`,
    markup: `<${Portal} {...portalProps}>
  <${local}.Content bind:ref data-slot="${slot}" ${props.map(([name]) => `{${name}}`).join(" ")} class={cn(classes, className)} {...restProps}${inner === undefined ? " />" : `>\n${inner}\n  </${local}.Content>`}
</${Portal}>`,
  });
}

// Tooltip on Bits, which opens it with data-state=delayed-open (or instant-open) as Radix does.
// Each Tooltip brings its own provider, and tooltips open at once by default, as in React. The
// arrow is Radix's: a span Bits positions and turns to face each side, holding the styled SVG.
export function tooltipFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = tooltipPieces(anatomy, { states: BITS_STATES, motion: ["z-50", "data-[state=delayed-open]:animate-enter", "data-[state=closed]:animate-exit"], arrow: RADIX_ARROW });
  const part = primitives("tooltip", "Tooltip");
  return [
    part("tooltip-provider.svelte", "Provider", { ref: false, destructure: ["delayDuration = 0"], attrs: ["{delayDuration}"] }),
    svelteFile("tooltip/tooltip.svelte", {
      script: `${bitsImport("Tooltip")}
import TooltipProvider from "./tooltip-provider.svelte";

let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps = $props();`,
      markup: `<!-- Brings its own provider, so a tooltip works without one at the app's root. -->
<TooltipProvider>
  <TooltipPrimitive.Root bind:open {...restProps} />
</TooltipProvider>`,
    }),
    part("tooltip-trigger.svelte", "Trigger"),
    part("tooltip-portal.svelte", "Portal", { ref: false }),
    contentFile(
      "tooltip/tooltip-content.svelte",
      "Tooltip",
      "tooltip-content",
      slots["tooltip-content"],
      { sideOffset: "6" },
      `    {@render children?.()}
    <TooltipPrimitive.Arrow>
      {#snippet child({ props })}
        <span {...props}>
          <svg data-slot="tooltip-arrow" class={arrowClasses} width="10" height="5" viewBox="0 0 30 10" preserveAspectRatio="none" style="display: block;">
            <polygon points="0,0 30,0 15,10" />
          </svg>
        </span>
      {/snippet}
    </TooltipPrimitive.Arrow>`,
      `const arrowClasses = ${quoted(slots["tooltip-arrow"])};\n`,
    ),
    indexFile(
      "tooltip/index.ts",
      indexParts([
        ["tooltip.svelte", "Root", "Tooltip"],
        ["tooltip-trigger.svelte", "Trigger", "TooltipTrigger"],
        ["tooltip-content.svelte", "Content", "TooltipContent"],
        ["tooltip-provider.svelte", "Provider", "TooltipProvider"],
        ["tooltip-portal.svelte", "Portal", "TooltipPortal"],
      ]),
    ),
  ];
}

// Popover on Bits; its motion scales from --bits-popover-content-transform-origin. Bits has no
// anchor part (its content takes a customAnchor instead).
export function popoverFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = popoverPieces(anatomy, { states: BITS_STATES, motion: BITS_POPUP_MOTION });
  const part = primitives("popover", "Popover");
  const div = (file: string, tag: string, slot: keyof typeof slots) => elementPart(`popover/${file}`, tag, slot, quoted(slots[slot]));
  return [
    part("popover.svelte", "Root", { ref: false, bindable: { open: "false" } }),
    part("popover-trigger.svelte", "Trigger", { slot: "popover-trigger" }),
    part("popover-portal.svelte", "Portal", { ref: false }),
    part("popover-close.svelte", "Close", { slot: "popover-close" }),
    contentFile("popover/popover-content.svelte", "Popover", "popover-content", slots["popover-content"], { align: `"center"`, sideOffset: "4" }),
    div("popover-header.svelte", "div", "popover-header"),
    div("popover-title.svelte", "h2", "popover-title"),
    div("popover-description.svelte", "p", "popover-description"),
    indexFile(
      "popover/index.ts",
      indexParts([
        ["popover.svelte", "Root", "Popover"],
        ["popover-trigger.svelte", "Trigger", "PopoverTrigger"],
        ["popover-content.svelte", "Content", "PopoverContent"],
        ["popover-header.svelte", "Header", "PopoverHeader"],
        ["popover-title.svelte", "Title", "PopoverTitle"],
        ["popover-description.svelte", "Description", "PopoverDescription"],
        ["popover-close.svelte", "Close", "PopoverClose"],
        ["popover-portal.svelte", "Portal", "PopoverPortal"],
      ]),
    ),
  ];
}

// Dropdown Menu on Bits: rows carry data-highlighted, data-disabled and (a submenu's trigger)
// data-state=open, as Radix's do. A label is a plain div, as in shadcn-svelte (Bits' GroupHeading,
// which labels a group, is there too). Checkbox and radio rows hold their check or dot in an
// indicator span at their start.
export function dropdownMenuFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = dropdownMenuPieces(anatomy, { motion: RADIX_MENU_MOTION });
  const part = primitives("dropdown-menu", "DropdownMenu");
  const inset = { destructure: ["inset"], attrs: ["data-inset={inset}"] };
  const insetProps = (props: string) => `${props} & { inset?: boolean | undefined }`;
  const choice = (file: string, part: "CheckboxItem" | "RadioItem", slot: string, bind: string[], state: string, icon: string, iconClasses: string | null) =>
    svelteFile(`dropdown-menu/${file}`, {
      script: `${bitsImport("DropdownMenu")}
${lucideImport(icon)}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import type { Snippet } from "svelte";

const classes = ${quoted(slots[slot as keyof typeof slots])};
const indicatorClasses = ${quoted(slots[`${slot}:indicator` as keyof typeof slots])};
${iconClasses === null ? "" : `const iconClasses = ${iconClasses};\n`}
let {
  ref = $bindable(null),
${bind.map((b) => `  ${b} = $bindable(false),`).join("\n")}
  class: className,
  children: childrenProp,
  ...restProps
}: WithoutChildrenOrChild<DropdownMenuPrimitive.${part}Props> & { children?: Snippet } = $props();`,
      markup: `<DropdownMenuPrimitive.${part} bind:ref ${bind.map((b) => `bind:${b}`).join(" ")} data-slot="${slot}" class={cn(classes, className)} {...restProps}>
  {#snippet children({ ${bind.length === 0 ? "checked" : bind.join(", ")} })}
    <span class={indicatorClasses}>
      {#if ${state === "checkbox" ? "checked || indeterminate" : "checked"}}
        <span data-state=${state === "checkbox" ? `{indeterminate ? "indeterminate" : "checked"}` : `"checked"`}>
          <${icon} ${iconClasses === null ? "" : "class={iconClasses} "}/>
        </span>
      {/if}
    </span>
    {@render childrenProp?.()}
  {/snippet}
</DropdownMenuPrimitive.${part}>`,
    });
  return [
    part("dropdown-menu.svelte", "Root", { ref: false, bindable: { open: "false" } }),
    part("dropdown-menu-portal.svelte", "Portal", { ref: false }),
    part("dropdown-menu-trigger.svelte", "Trigger", { slot: "dropdown-menu-trigger" }),
    contentFile("dropdown-menu/dropdown-menu-content.svelte", "DropdownMenu", "dropdown-menu-content", slots["dropdown-menu-content"], { sideOffset: "4" }),
    part("dropdown-menu-sub-content.svelte", "SubContent", { slot: "dropdown-menu-sub-content", classes: quoted(slots["dropdown-menu-sub-content"]) }),
    part("dropdown-menu-group.svelte", "Group", { slot: "dropdown-menu-group" }),
    elementPart("dropdown-menu/dropdown-menu-label.svelte", "div", "dropdown-menu-label", quoted(slots["dropdown-menu-label"]), { propsExtra: "{ inset?: boolean | undefined }", ...inset }),
    part("dropdown-menu-group-heading.svelte", "GroupHeading", { slot: "dropdown-menu-group-heading", classes: quoted(slots["dropdown-menu-label"]), props: insetProps("DropdownMenuPrimitive.GroupHeadingProps"), ...inset }),
    part("dropdown-menu-item.svelte", "Item", {
      slot: "dropdown-menu-item",
      classes: quoted(slots["dropdown-menu-item"]),
      props: `DropdownMenuPrimitive.ItemProps & { inset?: boolean | undefined; variant?: "default" | "destructive" | undefined }`,
      destructure: ["inset", `variant = "default"`],
      attrs: ["data-inset={inset}", "data-variant={variant}"],
    }),
    choice("dropdown-menu-checkbox-item.svelte", "CheckboxItem", "dropdown-menu-checkbox-item", ["checked", "indeterminate"], "checkbox", "CheckIcon", null),
    part("dropdown-menu-checkbox-group.svelte", "CheckboxGroup", { slot: "dropdown-menu-checkbox-group", bindable: { value: "[]" } }),
    part("dropdown-menu-radio-group.svelte", "RadioGroup", { slot: "dropdown-menu-radio-group", bindable: { value: `""` } }),
    choice("dropdown-menu-radio-item.svelte", "RadioItem", "dropdown-menu-radio-item", [], "radio", "CircleIcon", quoted(slots["dropdown-menu-radio-item:dot"])),
    part("dropdown-menu-separator.svelte", "Separator", { slot: "dropdown-menu-separator", classes: quoted(slots["dropdown-menu-separator"]) }),
    elementPart("dropdown-menu/dropdown-menu-shortcut.svelte", "span", "dropdown-menu-shortcut", quoted(slots["dropdown-menu-shortcut"])),
    part("dropdown-menu-sub.svelte", "Sub", { ref: false, bindable: { open: "false" } }),
    svelteFile("dropdown-menu/dropdown-menu-sub-trigger.svelte", {
      script: `${bitsImport("DropdownMenu")}
${lucideImport("ChevronRightIcon")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["dropdown-menu-sub-trigger"])};
const chevronClasses = ${quoted(slots["dropdown-menu-sub-trigger:chevron"])};

let { ref = $bindable(null), class: className, inset, children, ...restProps }: ${insetProps("DropdownMenuPrimitive.SubTriggerProps")} = $props();`,
      markup: `<DropdownMenuPrimitive.SubTrigger bind:ref data-slot="dropdown-menu-sub-trigger" data-inset={inset} class={cn(classes, className)} {...restProps}>
  {@render children?.()}
  <ChevronRightIcon class={chevronClasses} />
</DropdownMenuPrimitive.SubTrigger>`,
    }),
    indexFile(
      "dropdown-menu/index.ts",
      indexParts([
        ["dropdown-menu.svelte", "Root", "DropdownMenu"],
        ["dropdown-menu-portal.svelte", "Portal", "DropdownMenuPortal"],
        ["dropdown-menu-trigger.svelte", "Trigger", "DropdownMenuTrigger"],
        ["dropdown-menu-content.svelte", "Content", "DropdownMenuContent"],
        ["dropdown-menu-group.svelte", "Group", "DropdownMenuGroup"],
        ["dropdown-menu-label.svelte", "Label", "DropdownMenuLabel"],
        ["dropdown-menu-group-heading.svelte", "GroupHeading", "DropdownMenuGroupHeading"],
        ["dropdown-menu-item.svelte", "Item", "DropdownMenuItem"],
        ["dropdown-menu-checkbox-item.svelte", "CheckboxItem", "DropdownMenuCheckboxItem"],
        ["dropdown-menu-checkbox-group.svelte", "CheckboxGroup", "DropdownMenuCheckboxGroup"],
        ["dropdown-menu-radio-group.svelte", "RadioGroup", "DropdownMenuRadioGroup"],
        ["dropdown-menu-radio-item.svelte", "RadioItem", "DropdownMenuRadioItem"],
        ["dropdown-menu-separator.svelte", "Separator", "DropdownMenuSeparator"],
        ["dropdown-menu-shortcut.svelte", "Shortcut", "DropdownMenuShortcut"],
        ["dropdown-menu-sub.svelte", "Sub", "DropdownMenuSub"],
        ["dropdown-menu-sub-trigger.svelte", "SubTrigger", "DropdownMenuSubTrigger"],
        ["dropdown-menu-sub-content.svelte", "SubContent", "DropdownMenuSubContent"],
      ]),
    ),
  ];
}

// Select on Bits. Bits always opens the list as a popover below the trigger (Radix's
// position="popper"); it has no item-aligned mode. Items mark the chosen one data-selected where
// Radix says data-state=checked, and the list is at least as wide as the trigger
// (--bits-select-anchor-width). Bits has a Value part, which shows the chosen label or a placeholder.
export function selectFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = bitsVars(selectPieces(anatomy, { states: { ...BITS_STATES, selected: ["data-selected:"] }, motion: SELECT_POPUP_MOTION }));
  const part = primitives("select", "Select");
  return [
    svelteFile("select/select.svelte", {
      script: `${bitsImport("Select")}

let { open = $bindable(false), value = $bindable(), ...restProps }: SelectPrimitive.RootProps = $props();`,
      markup: `<!-- value is a string or an array by type, which destructuring can't narrow: hence the cast. -->
<SelectPrimitive.Root bind:open bind:value={value as never} {...restProps} />`,
    }),
    part("select-portal.svelte", "Portal", { ref: false }),
    part("select-group.svelte", "Group", { slot: "select-group", classes: quoted(slots["select-group"]) }),
    part("select-value.svelte", "Value", { slot: "select-value" }),
    svelteFile("select/select-trigger.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("selectTriggerVariants", slots["select-trigger"])}

export type SelectTriggerSize = ${unionType(sizes)};
export type SelectTriggerVariants = VariantProps<typeof selectTriggerVariants>;`,
      script: `${bitsImport("Select")}
${lucideImport("ChevronDownIcon")}
${UTILS_IMPORT(["cn", "type WithoutChild"])}

const iconClasses = ${quoted(slots["select-icon"])};

let {
  ref = $bindable(null),
  class: className,
  size = "default",
  children,
  ...restProps
}: WithoutChild<SelectPrimitive.TriggerProps> & { size?: SelectTriggerSize | "default" | undefined } = $props();

const resolved: SelectTriggerSize = $derived(size === "default" ? ${q(defaultSize)} : size);`,
      markup: `<SelectPrimitive.Trigger bind:ref data-slot="select-trigger" data-size={resolved} class={cn(selectTriggerVariants({ size: resolved }), className)} {...restProps}>
  {@render children?.()}
  <ChevronDownIcon data-slot="select-icon" aria-hidden="true" class={iconClasses} />
</SelectPrimitive.Trigger>`,
    }),
    svelteFile("select/select-content.svelte", {
      script: `${bitsImport("Select")}
import type { ComponentProps } from "svelte";
${UTILS_IMPORT(["cn", "type WithoutChild", "type WithoutChildrenOrChild"])}
import SelectPortal from "./select-portal.svelte";
import SelectScrollDownButton from "./select-scroll-down-button.svelte";
import SelectScrollUpButton from "./select-scroll-up-button.svelte";

const classes = ${quoted(slots["select-content"])};
const viewportClasses = ${quoted(slots["select-content:viewport"])};

let {
  ref = $bindable(null),
  class: className,
  sideOffset = 4,
  portalProps,
  children,
  ...restProps
}: WithoutChild<SelectPrimitive.ContentProps> & {
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SelectPortal>>;
} = $props();`,
      markup: `<SelectPortal {...portalProps}>
  <SelectPrimitive.Content bind:ref data-slot="select-content" {sideOffset} class={cn(classes, className)} {...restProps}>
    <SelectScrollUpButton />
    <SelectPrimitive.Viewport data-position="popper" class={viewportClasses}>
      {@render children?.()}
    </SelectPrimitive.Viewport>
    <SelectScrollDownButton />
  </SelectPrimitive.Content>
</SelectPortal>`,
    }),
    part("select-label.svelte", "GroupHeading", { slot: "select-label", classes: quoted(slots["select-label"]) }),
    svelteFile("select/select-item.svelte", {
      script: `${bitsImport("Select")}
${lucideImport("CheckIcon")}
${UTILS_IMPORT(["cn", "type WithoutChild"])}

const classes = ${quoted(slots["select-item"])};
const indicatorClasses = ${quoted(slots["select-item-indicator"])};

let { ref = $bindable(null), class: className, value, children: childrenProp, ...restProps }: WithoutChild<SelectPrimitive.ItemProps> = $props();`,
      markup: `<SelectPrimitive.Item bind:ref {value} data-slot="select-item" class={cn(classes, className)} {...restProps}>
  {#snippet children({ selected, highlighted })}
    <span>
      {#if childrenProp}
        {@render childrenProp({ selected, highlighted })}
      {:else}
        {restProps.label || value}
      {/if}
    </span>
    {#if selected}
      <span data-slot="select-item-indicator" aria-hidden="true" class={indicatorClasses}>
        <CheckIcon aria-hidden="true" />
      </span>
    {/if}
  {/snippet}
</SelectPrimitive.Item>`,
    }),
    elementPart("select/select-separator.svelte", "div", "select-separator", quoted(slots["select-separator"]), { attrs: [`aria-hidden="true"`], inner: "" }),
    ...(["ScrollUpButton", "ScrollDownButton"] as const).map((name) => {
      const slot = name === "ScrollUpButton" ? "select-scroll-up-button" : "select-scroll-down-button";
      const icon = name === "ScrollUpButton" ? "ChevronUpIcon" : "ChevronDownIcon";
      return partFile({
        path: `select/${slot}.svelte`,
        imports: [bitsImport("Select"), lucideImport(icon)],
        utils: ["type WithoutChildrenOrChild"],
        props: `WithoutChildrenOrChild<SelectPrimitive.${name}Props>`,
        tag: `SelectPrimitive.${name}`,
        slot,
        classes: quoted(slots[slot]),
        inner: `<${icon} aria-hidden="true" />`,
      });
    }),
    indexFile("select/index.ts", [
      ...indexParts([
        ["select.svelte", "Root", "Select"],
        ["select-group.svelte", "Group", "SelectGroup"],
        ["select-value.svelte", "Value", "SelectValue"],
        ["select-trigger.svelte", "Trigger", "SelectTrigger"],
        ["select-content.svelte", "Content", "SelectContent"],
        ["select-label.svelte", "Label", "SelectLabel"],
        // shadcn-svelte's name for the same part.
        ["select-label.svelte", "GroupHeading", "SelectGroupHeading"],
        ["select-item.svelte", "Item", "SelectItem"],
        ["select-separator.svelte", "Separator", "SelectSeparator"],
        ["select-scroll-up-button.svelte", "ScrollUpButton", "SelectScrollUpButton"],
        ["select-scroll-down-button.svelte", "ScrollDownButton", "SelectScrollDownButton"],
        ["select-portal.svelte", "Portal", "SelectPortal"],
      ]),
    ], [{ file: "select-trigger.svelte", names: ["selectTriggerVariants", "type SelectTriggerSize", "type SelectTriggerVariants"] }]),
  ];
}
