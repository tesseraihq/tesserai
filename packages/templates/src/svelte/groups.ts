import type { Anatomy } from "@tesserai/core";
import { q, unionType } from "../codegen";
import { buttonGroupPieces, emptyPieces, itemPieces, type LocalCva } from "../display";
import type { CvaConfig } from "../factor";
import { inputGroupPieces } from "../input-group";
import { inputOtpPieces } from "../input-otp";
import type { GeneratedFile } from "../render";
import { attributesOf, elementPart } from "./elements";
import { bitsImport, cva, indexFile, indexParts, lucideImport, quoted, svelteFile, UTILS_IMPORT } from "./emit";

// Button Group, Empty, Item, Input Group and Input OTP in shadcn-svelte's layout: plain elements
// (a `child` snippet where the React file takes asChild), and Bits' PinInput for the code input, as
// shadcn-svelte's input-otp. Each part's classes are its pieces', as the Radix output prints them.

const DIV = attributesOf("div");
const localCva = (name: string, config: LocalCva) => cva(name, config as unknown as CvaConfig);

// A part that renders its element, or hands its props to a `child` snippet (shadcn-svelte's asChild).
function childPart(path: string, slot: string, classes: string, { tag = "div", types = DIV, extraProps = "", destructure = [] as string[], attrs = "", script = "" } = {}): GeneratedFile {
  return svelteFile(path, {
    script: `${types.import}
import type { Snippet } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${classes};

let {
  ref = $bindable(null),
  class: className,
  child,
  children,
${destructure.map((d) => `  ${d},\n`).join("")}  ...restProps
}: WithElementRef<${types.type}> & { child?: Snippet<[{ props: Record<string, unknown> }]>${extraProps} } = $props();
${script}
const mergedProps = $derived({ "data-slot": "${slot}"${attrs}, class: cn(classes, className), ...restProps });`,
    markup: `{#if child}
  {@render child({ props: mergedProps })}
{:else}
  <${tag} bind:this={ref} {...mergedProps}>
    {@render children?.()}
  </${tag}>
{/if}`,
  });
}

export function buttonGroupFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = buttonGroupPieces(anatomy);
  return [
    svelteFile("button-group/button-group.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${localCva("buttonGroupVariants", slots["button-group"])}

export type ButtonGroupOrientation = VariantProps<typeof buttonGroupVariants>["orientation"];`,
      script: `${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  orientation = "horizontal",
  children,
  ...restProps
}: WithElementRef<${DIV.type}> & { orientation?: ButtonGroupOrientation } = $props();`,
      markup: `<div bind:this={ref} role="group" data-slot="button-group" data-orientation={orientation} class={cn(buttonGroupVariants({ orientation }), className)} {...restProps}>
  {@render children?.()}
</div>`,
    }),
    // Text or an icon in the group, e.g. "https://" before an input.
    childPart("button-group/button-group-text.svelte", "button-group-text", quoted(slots["button-group-text"])),
    elementPart("button-group/button-group-separator.svelte", "div", "button-group-separator", quoted(slots["button-group-separator"]), {
      propsExtra: `{ orientation?: "horizontal" | "vertical" }`,
      destructure: [`orientation = "vertical"`],
      attrs: [`role="separator"`, "aria-orientation={orientation}", "data-orientation={orientation}"],
      inner: "",
    }),
    indexFile(
      "button-group/index.ts",
      indexParts([
        ["button-group.svelte", "Root", "ButtonGroup"],
        ["button-group-text.svelte", "Text", "ButtonGroupText"],
        ["button-group-separator.svelte", "Separator", "ButtonGroupSeparator"],
      ]),
      [{ file: "button-group.svelte", names: ["buttonGroupVariants", "type ButtonGroupOrientation"] }],
    ),
  ];
}

export function emptyFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = emptyPieces(anatomy);
  const div = (file: string, slot: keyof typeof slots) => elementPart(`empty/${file}`, "div", slot, quoted(slots[slot] as string[]));
  return [
    div("empty.svelte", "empty"),
    div("empty-header.svelte", "empty-header"),
    // variant="icon" puts the icon on a tile.
    svelteFile("empty/empty-media.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${localCva("emptyMediaVariants", slots["empty-icon"])}

export type EmptyMediaVariant = VariantProps<typeof emptyMediaVariants>["variant"];`,
      script: `${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  variant = "default",
  children,
  ...restProps
}: WithElementRef<${DIV.type}> & { variant?: EmptyMediaVariant } = $props();`,
      markup: `<div bind:this={ref} data-slot="empty-icon" data-variant={variant} class={cn(emptyMediaVariants({ variant }), className)} {...restProps}>
  {@render children?.()}
</div>`,
    }),
    div("empty-title.svelte", "empty-title"),
    div("empty-description.svelte", "empty-description"),
    div("empty-content.svelte", "empty-content"),
    indexFile(
      "empty/index.ts",
      indexParts([
        ["empty.svelte", "Root", "Empty"],
        ["empty-header.svelte", "Header", "EmptyHeader"],
        ["empty-media.svelte", "Media", "EmptyMedia"],
        ["empty-title.svelte", "Title", "EmptyTitle"],
        ["empty-description.svelte", "Description", "EmptyDescription"],
        ["empty-content.svelte", "Content", "EmptyContent"],
      ]),
      [{ file: "empty-media.svelte", names: ["emptyMediaVariants", "type EmptyMediaVariant"] }],
    ),
  ];
}

// Item: a row by variant and size, shadcn's name for the plain one; a link through the `child`
// snippet, where it hovers. In a group (a list) items are list items.
export function itemFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, sizes, defaultVariant, defaultSize, aliases } = itemPieces(anatomy);
  const div = (file: string, slot: keyof typeof slots) => elementPart(`item/${file}`, "div", slot, quoted(slots[slot] as string[]));
  return [
    svelteFile("item/item.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("itemVariants", slots.item)}

type Variant = ${unionType(variants)};
type Size = ${unionType(sizes)};
// shadcn's names keep working.
const aliases = { ${aliases.map(([n, v]) => `${q(n)}: ${q(v)}`).join(", ")} } as const;
type Alias = keyof typeof aliases;

export type ItemVariant = Variant | Alias;
export type ItemSize = Size | "default";
export type ItemVariants = VariantProps<typeof itemVariants>;

// Whether an item sits in an ItemGroup (item-group.svelte sets it).
export const ITEM_GROUP_CONTEXT = Symbol.for("item-group");

function resolve(variant: ItemVariant | undefined, size: ItemSize | undefined) {
  const v = variant === undefined ? ${q(defaultVariant)} : variant in aliases ? aliases[variant as Alias] : (variant as Variant);
  return { variant: v, size: size === undefined || size === "default" ? ${q(defaultSize)} : size };
}`,
      script: `import { getContext, type Snippet } from "svelte";
${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  child,
  children,
  variant,
  size,
  ...restProps
}: WithElementRef<${DIV.type}> & { child?: Snippet<[{ props: Record<string, unknown> }]>; variant?: ItemVariant | undefined; size?: ItemSize | undefined } = $props();

const inGroup = getContext<boolean | undefined>(ITEM_GROUP_CONTEXT) ?? false;
const axes = $derived(resolve(variant, size));
const mergedProps = $derived({
  role: inGroup ? "listitem" : undefined,
  "data-slot": "item",
  "data-variant": axes.variant,
  "data-size": axes.size,
  class: cn(itemVariants(axes), className),
  ...restProps,
});`,
      markup: `{#if child}
  {@render child({ props: mergedProps })}
{:else}
  <div bind:this={ref} {...mergedProps}>
    {@render children?.()}
  </div>
{/if}`,
    }),
    // variant="icon" sizes an icon; variant="image" crops a picture to a square.
    svelteFile("item/item-media.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${localCva("itemMediaVariants", slots["item-media"])}

export type ItemMediaVariant = VariantProps<typeof itemMediaVariants>["variant"];`,
      script: `${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  variant = "default",
  children,
  ...restProps
}: WithElementRef<${DIV.type}> & { variant?: ItemMediaVariant } = $props();`,
      markup: `<div bind:this={ref} data-slot="item-media" data-variant={variant} class={cn(itemMediaVariants({ variant }), className)} {...restProps}>
  {@render children?.()}
</div>`,
    }),
    div("item-content.svelte", "item-content"),
    div("item-title.svelte", "item-title"),
    elementPart("item/item-description.svelte", "p", "item-description", quoted(slots["item-description"])),
    div("item-actions.svelte", "item-actions"),
    // A group is a list, so the items in it are list items.
    svelteFile("item/item-group.svelte", {
      script: `import { setContext } from "svelte";
${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { ITEM_GROUP_CONTEXT } from "./item.svelte";

const classes = ${quoted(slots["item-group"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<${DIV.type}> = $props();

setContext(ITEM_GROUP_CONTEXT, true);`,
      markup: `<div bind:this={ref} role="list" data-slot="item-group" class={cn(classes, className)} {...restProps}>
  {@render children?.()}
</div>`,
    }),
    // Decorative: it sits between list items, where only items belong.
    elementPart("item/item-separator.svelte", "div", "item-separator", quoted(slots["item-separator"]), { attrs: [`role="none"`, `data-orientation="horizontal"`], inner: "" }),
    div("item-header.svelte", "item-header"),
    div("item-footer.svelte", "item-footer"),
    indexFile(
      "item/index.ts",
      indexParts([
        ["item.svelte", "Root", "Item"],
        ["item-group.svelte", "Group", "ItemGroup"],
        ["item-separator.svelte", "Separator", "ItemSeparator"],
        ["item-header.svelte", "Header", "ItemHeader"],
        ["item-footer.svelte", "Footer", "ItemFooter"],
        ["item-content.svelte", "Content", "ItemContent"],
        ["item-title.svelte", "Title", "ItemTitle"],
        ["item-description.svelte", "Description", "ItemDescription"],
        ["item-actions.svelte", "Actions", "ItemActions"],
        ["item-media.svelte", "Media", "ItemMedia"],
      ]),
      [
        { file: "item.svelte", names: ["itemVariants", "type ItemVariant", "type ItemSize", "type ItemVariants"] },
        { file: "item-media.svelte", names: ["itemMediaVariants", "type ItemMediaVariant"] },
      ],
    ),
  ];
}

// Input Group: its control and button are parts of its own, bare inside the group (see the React
// template). Clicking an addon (outside a button in it) focuses the control.
export function inputGroupFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = inputGroupPieces(anatomy);
  const control = slots["input-group-control"];
  const input = attributesOf("input");
  const textarea = attributesOf("textarea");
  const span = attributesOf("span");
  return [
    elementPart("input-group/input-group.svelte", "div", "input-group", quoted(slots["input-group"]), { attrs: [`role="group"`] }),
    svelteFile("input-group/input-group-addon.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${localCva("inputGroupAddonVariants", slots["input-group-addon"])}

export type InputGroupAddonAlign = VariantProps<typeof inputGroupAddonVariants>["align"];`,
      script: `${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  align = "inline-start",
  children,
  ...restProps
}: WithElementRef<${DIV.type}> & { align?: InputGroupAddonAlign } = $props();

function focusControl(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
  if (event.target instanceof Element && event.target.closest("button") !== null) return;
  const control = event.currentTarget.parentElement?.querySelector("input, textarea");
  if (control instanceof HTMLElement) control.focus();
}`,
      markup: `<!-- svelte-ignore a11y_click_events_have_key_events -->
<div bind:this={ref} role="group" data-slot="input-group-addon" data-align={align} class={cn(inputGroupAddonVariants({ align }), className)} onclick={focusControl} {...restProps}>
  {@render children?.()}
</div>`,
    }),
    svelteFile("input-group/input-group-button.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${localCva("inputGroupButtonVariants", slots["input-group-button"])}

export type InputGroupButtonSize = VariantProps<typeof inputGroupButtonVariants>["size"];`,
      script: `import type { HTMLButtonAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  size = "xs",
  type = "button",
  children,
  ...restProps
}: WithElementRef<HTMLButtonAttributes> & { size?: InputGroupButtonSize } = $props();`,
      markup: `<button bind:this={ref} {type} data-slot="input-group-button" data-size={size} class={cn(inputGroupButtonVariants({ size }), className)} {...restProps}>
  {@render children?.()}
</button>`,
    }),
    // Text or an icon in an addon; it has no data-slot of its own.
    svelteFile("input-group/input-group-text.svelte", {
      script: `${span.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${quoted(slots["input-group-addon:text"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<${span.type}> = $props();`,
      markup: `<span bind:this={ref} class={cn(classes, className)} {...restProps}>
  {@render children?.()}
</span>`,
    }),
    svelteFile("input-group/input-group-input.svelte", {
      script: `${input.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${quoted(control)};

let { ref = $bindable(null), value = $bindable(), class: className, ...restProps }: WithElementRef<${input.type}> = $props();`,
      markup: `<input bind:this={ref} bind:value data-slot="input-group-control" class={cn(classes, className)} {...restProps} />`,
    }),
    svelteFile("input-group/input-group-textarea.svelte", {
      script: `${textarea.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${quoted(control)};
const textareaClasses = ${quoted(slots["input-group-control:textarea"].slice(control.length))};

let { ref = $bindable(null), value = $bindable(), class: className, ...restProps }: WithElementRef<${textarea.type}> = $props();`,
      markup: `<textarea bind:this={ref} bind:value data-slot="input-group-control" class={cn(classes, textareaClasses, className)} {...restProps}></textarea>`,
    }),
    indexFile(
      "input-group/index.ts",
      indexParts([
        ["input-group.svelte", "Root", "InputGroup"],
        ["input-group-addon.svelte", "Addon", "InputGroupAddon"],
        ["input-group-button.svelte", "Button", "InputGroupButton"],
        ["input-group-input.svelte", "Input", "InputGroupInput"],
        ["input-group-text.svelte", "Text", "InputGroupText"],
        ["input-group-textarea.svelte", "Textarea", "InputGroupTextarea"],
      ]),
      [
        { file: "input-group-addon.svelte", names: ["inputGroupAddonVariants", "type InputGroupAddonAlign"] },
        { file: "input-group-button.svelte", names: ["inputGroupButtonVariants", "type InputGroupButtonSize"] },
      ],
    ),
  ];
}

// Input OTP on Bits' PinInput, as shadcn-svelte's: the root's children snippet hands out the cells,
// and each slot draws one (<InputOTP.Slot {cell} />). Bits gives `class` to the row of slots (React's
// containerClassName); the input the code is typed into takes the root's other attributes, and is
// styled from the row. Bits marks the active cell with a bare data-active.
export function inputOtpFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = inputOtpPieces(anatomy, "data-active:");
  const div = attributesOf("div");
  return [
    svelteFile("input-otp/input-otp.svelte", {
      script: `${bitsImport("PinInput", "InputOTPPrimitive")}
${UTILS_IMPORT(["cn"])}

// The input takes no class through Bits' root, so the row styles it.
const containerClasses = ${quoted([...slots["input-otp:container"], ...slots["input-otp"].map((c) => `[&_input]:${c}`)])};

let { ref = $bindable(null), value = $bindable(""), class: className, ...restProps }: InputOTPPrimitive.RootProps = $props();`,
      markup: `<InputOTPPrimitive.Root bind:ref bind:value data-slot="input-otp" spellcheck={false} class={cn(containerClasses, className)} {...restProps} />`,
    }),
    elementPart("input-otp/input-otp-group.svelte", "div", "input-otp-group", quoted(slots["input-otp-group"])),
    svelteFile("input-otp/input-otp-slot.svelte", {
      script: `${bitsImport("PinInput", "InputOTPPrimitive")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["input-otp-slot"])};
const caretBoxClasses = ${quoted(slots["input-otp-slot:caret-box"])};
const caretClasses = ${quoted(slots["input-otp-slot:caret"])};

let { ref = $bindable(null), cell, class: className, ...restProps }: InputOTPPrimitive.CellProps = $props();`,
      markup: `<InputOTPPrimitive.Cell {cell} bind:ref data-slot="input-otp-slot" class={cn(classes, className)} {...restProps}>
  {cell.char}
  {#if cell.hasFakeCaret}
    <div class={caretBoxClasses}>
      <div class={caretClasses}></div>
    </div>
  {/if}
</InputOTPPrimitive.Cell>`,
    }),
    svelteFile("input-otp/input-otp-separator.svelte", {
      script: `${div.import}
${lucideImport("MinusIcon")}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${quoted(slots["input-otp-separator"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<${div.type}> = $props();`,
      markup: `<div bind:this={ref} data-slot="input-otp-separator" role="separator" class={cn(classes, className)} {...restProps}>
  {#if children}
    {@render children()}
  {:else}
    <MinusIcon />
  {/if}
</div>`,
    }),
    indexFile(
      "input-otp/index.ts",
      indexParts([
        ["input-otp.svelte", "Root", "InputOTP"],
        ["input-otp-group.svelte", "Group", "InputOTPGroup"],
        ["input-otp-slot.svelte", "Slot", "InputOTPSlot"],
        ["input-otp-separator.svelte", "Separator", "InputOTPSeparator"],
      ]),
    ),
  ];
}
