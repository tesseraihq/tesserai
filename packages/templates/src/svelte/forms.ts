import type { Anatomy } from "@tesserai/core";
import type { CvaConfig } from "../factor";
import { labelPieces } from "../base-ui/label";
import { textareaPieces } from "../base-ui/textarea";
import { q, unionType } from "../codegen";
import { fieldPieces } from "../field";
import { nativeSelectPieces } from "../native-select";
import { checkboxPieces } from "../radix/checkbox";
import { inputPieces } from "../radix/input";
import { radioGroupPieces } from "../radix/radio-group";
import { sliderPieces } from "../radix/slider";
import { switchPieces } from "../radix/switch";
import type { GeneratedFile } from "../render";
import { attributesOf, elementPart } from "./elements";
import { bitsImport, cva, indexFile, indexParts, lucideImport, partFile, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";
import { BITS_STATES } from "./states";

// A native input with the system's size axis in place of the size attribute (a character count).
// A file input binds its files, as in shadcn-svelte.
export function inputFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = inputPieces(anatomy);
  const attrs = `data-slot={dataSlot} data-size={size} class={cn(inputVariants({ size }), className)}`;
  return [
    svelteFile("input/input.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
import type { WithElementRef } from "$UTILS$.js";

export ${cva("inputVariants", slots.input)}

export type InputSize = ${unionType(sizes)};
export type InputVariants = VariantProps<typeof inputVariants>;

type InputType = Exclude<HTMLInputTypeAttribute, "file">;

// The native size attribute (a character count) is replaced by the design system's size axis.
export type InputProps = WithElementRef<
  Omit<HTMLInputAttributes, "type" | "size"> & ({ type: "file"; files?: FileList | undefined } | { type?: InputType | undefined; files?: undefined })
> & { size?: InputSize | undefined };`,
      script: `${UTILS_IMPORT(["cn"])}

let {
  ref = $bindable(null),
  value = $bindable(),
  type,
  files = $bindable(),
  class: className,
  size = ${q(defaultSize)},
  "data-slot": dataSlot = "input",
  ...restProps
}: InputProps = $props();`,
      markup: `{#if type === "file"}
  <input bind:this={ref} ${attrs} type="file" bind:files bind:value {...restProps} />
{:else}
  <input bind:this={ref} ${attrs} {type} bind:value {...restProps} />
{/if}`,
    }),
    indexFile("input/index.ts", indexParts([["input.svelte", "Root", "Input"]]), [
      { file: "input.svelte", names: ["inputVariants", "type InputProps", "type InputSize", "type InputVariants"] },
    ]),
  ];
}

export function textareaFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = textareaPieces(anatomy);
  const textarea = attributesOf("textarea");
  return [
    partFile({
      path: "textarea/textarea.svelte",
      imports: [textarea.import],
      utils: ["type WithElementRef", "type WithoutChildren"],
      props: `WithoutChildren<WithElementRef<${textarea.type}>>`,
      tag: "textarea",
      element: true,
      classes: quoted(slots.textarea),
      bindable: { value: "" },
      destructure: [`"data-slot": dataSlot = "textarea"`],
      attrs: ["data-slot={dataSlot}"],
      inner: "",
    }),
    indexFile("textarea/index.ts", indexParts([["textarea.svelte", "Root", "Textarea"]])),
  ];
}

export function labelFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = labelPieces(anatomy);
  return [
    partFile({ path: "label/label.svelte", imports: [bitsImport("Label")], props: "LabelPrimitive.RootProps", tag: "LabelPrimitive.Root", slot: "label", classes: quoted(slots.label) }),
    indexFile("label/index.ts", indexParts([["label.svelte", "Root", "Label"]])),
  ];
}

// Field is plain markup, as in shadcn; a checked control inside a choice card is found by Bits'
// data-state=checked, as by Radix's.
export function fieldFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = fieldPieces(anatomy);
  const div = attributesOf("div");
  const el = (file: string, tag: string, slot: string, classes: string[], extra: Parameters<typeof elementPart>[4] = {}) =>
    elementPart(`field/${file}`, tag, slot, quoted(classes), extra);
  return [
    el("field-set.svelte", "fieldset", "field-set", slots["field-set"]),
    el("field-legend.svelte", "legend", "field-legend", slots["field-legend"], {
      propsExtra: `{ variant?: "legend" | "label" | undefined }`,
      destructure: [`variant = "legend"`],
      attrs: ["data-variant={variant}"],
    }),
    el("field-group.svelte", "div", "field-group", slots["field-group"]),
    svelteFile("field/field.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

// Orientation is a layout prop, not a design axis, so the config is a cva by hand.
export ${cva("fieldVariants", slots.field as unknown as CvaConfig)}

export type FieldOrientation = NonNullable<VariantProps<typeof fieldVariants>["orientation"]>;`,
      script: `${div.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  orientation = "vertical",
  children,
  ...restProps
}: WithElementRef<${div.type}> & { orientation?: FieldOrientation | undefined } = $props();`,
      markup: `<div bind:this={ref} role="group" data-slot="field" data-orientation={orientation} class={cn(fieldVariants({ orientation }), className)} {...restProps}>
  {@render children?.()}
</div>`,
    }),
    el("field-content.svelte", "div", "field-content", slots["field-content"]),
    partFile({
      path: "field/field-label.svelte",
      imports: [`import type { ComponentProps } from "svelte";`, uiImport("label", ["Label"])],
      props: "ComponentProps<typeof Label>",
      tag: "Label",
      slot: "field-label",
      classes: quoted(slots["field-label"]),
      inner: "{@render children?.()}",
    }),
    el("field-title.svelte", "div", "field-label", slots["field-label:title"]),
    el("field-description.svelte", "p", "field-description", slots["field-description"]),
    svelteFile("field/field-separator.svelte", {
      script: `${div.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${quoted(slots["field-separator"])};
const lineClasses = ${quoted(slots["field-separator:line"])};
const contentClasses = ${quoted(slots["field-separator-content"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<${div.type}> = $props();`,
      markup: `<div bind:this={ref} data-slot="field-separator" data-content={children !== undefined} class={cn(classes, className)} {...restProps}>
  <div aria-hidden="true" class={lineClasses}></div>
  {#if children}
    <span data-slot="field-separator-content" class={contentClasses}>
      {@render children()}
    </span>
  {/if}
</div>`,
    }),
    svelteFile("field/field-error.svelte", {
      script: `${div.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${quoted(slots["field-error"])};
const listClasses = ${quoted(slots["field-error:list"])};

let {
  ref = $bindable(null),
  class: className,
  children,
  errors,
  ...restProps
}: WithElementRef<${div.type}> & { errors?: ({ message?: string | undefined } | undefined)[] | undefined } = $props();

// Each message once; one is shown as it is, several as a list.
const messages = $derived([...new Set((errors ?? []).map((error) => error?.message).filter((m): m is string => !!m))]);`,
      markup: `{#if children || messages.length > 0}
  <div bind:this={ref} role="alert" data-slot="field-error" class={cn(classes, className)} {...restProps}>
    {#if children}
      {@render children()}
    {:else if messages.length === 1}
      {messages[0]}
    {:else}
      <ul class={listClasses}>
        {#each messages as message (message)}
          <li>{message}</li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}`,
    }),
    indexFile("field/index.ts", [
      { file: "field.svelte", short: "Field", full: "Field" },
      ...indexParts([
        ["field-set.svelte", "Set", "FieldSet"],
        ["field-legend.svelte", "Legend", "FieldLegend"],
        ["field-group.svelte", "Group", "FieldGroup"],
        ["field-content.svelte", "Content", "FieldContent"],
        ["field-label.svelte", "Label", "FieldLabel"],
        ["field-title.svelte", "Title", "FieldTitle"],
        ["field-description.svelte", "Description", "FieldDescription"],
        ["field-separator.svelte", "Separator", "FieldSeparator"],
        ["field-error.svelte", "Error", "FieldError"],
      ]),
    ]),
  ];
}

// A native <select> with a chevron; `class` goes on the wrapper, as in React, so width and margins
// apply to the whole control.
export function nativeSelectFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = nativeSelectPieces(anatomy);
  const select = attributesOf("select");
  return [
    svelteFile("native-select/native-select.svelte", {
      module: `import { cva } from "class-variance-authority";

export ${cva("nativeSelectVariants", slots["native-select"])}

export type NativeSelectSize = ${unionType(sizes)};`,
      script: `${select.import}
${lucideImport("ChevronDownIcon")}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const wrapperClasses = ${quoted(slots["native-select-wrapper"])};
const iconClasses = ${quoted(slots["native-select-icon"])};

let {
  ref = $bindable(null),
  value = $bindable(),
  class: className,
  size = ${q(defaultSize)},
  children,
  ...restProps
}: WithElementRef<Omit<${select.type}, "size">> & { size?: NativeSelectSize | undefined } = $props();`,
      markup: `<div data-slot="native-select-wrapper" data-size={size} class={cn(wrapperClasses, className)}>
  <select bind:this={ref} bind:value data-slot="native-select" data-size={size} class={nativeSelectVariants({ size })} {...restProps}>
    {@render children?.()}
  </select>
  <ChevronDownIcon aria-hidden="true" data-slot="native-select-icon" class={iconClasses} />
</div>`,
    }),
    elementPart("native-select/native-select-option.svelte", "option", "native-select-option", quoted(slots["native-select-option"])),
    elementPart("native-select/native-select-opt-group.svelte", "optgroup", "native-select-optgroup", quoted(slots["native-select-optgroup"])),
    indexFile("native-select/index.ts", indexParts([
      ["native-select.svelte", "Root", "NativeSelect"],
      ["native-select-option.svelte", "Option", "NativeSelectOption"],
      ["native-select-opt-group.svelte", "OptGroup", "NativeSelectOptGroup"],
    ])),
  ];
}

// Checkbox on Bits: a check and a dash inside an indicator shown while checked or indeterminate,
// which carries Radix's data-state and data-disabled, as Radix's Indicator does.
export function checkboxFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = checkboxPieces(anatomy, BITS_STATES);
  return [
    svelteFile("checkbox/checkbox.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("checkboxVariants", slots.checkbox)}

export type CheckboxSize = ${unionType(sizes)};
export type CheckboxVariants = VariantProps<typeof checkboxVariants>;`,
      script: `${bitsImport("Checkbox")}
${lucideImport("CheckIcon")}
${lucideImport("MinusIcon")}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}

const indicatorClasses = ${quoted(slots["checkbox-indicator"])};
const checkClasses = ${quoted(slots["checkbox-indicator:check"])};
const dashClasses = ${quoted(slots["checkbox-indicator:dash"])};

let {
  ref = $bindable(null),
  checked = $bindable(false),
  indeterminate = $bindable(false),
  class: className,
  size = ${q(defaultSize)},
  disabled = false,
  ...restProps
}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> & { size?: CheckboxSize | undefined } = $props();`,
      markup: `<CheckboxPrimitive.Root bind:ref bind:checked bind:indeterminate data-slot="checkbox" data-size={size} class={cn(checkboxVariants({ size }), className)} {disabled} {...restProps}>
  {#snippet children({ checked, indeterminate })}
    {#if checked || indeterminate}
      <span
        data-slot="checkbox-indicator"
        data-state={indeterminate ? "indeterminate" : "checked"}
        data-disabled={disabled ? "" : undefined}
        class={indicatorClasses}
        style="pointer-events: none;"
      >
        <!-- Indeterminate shows a dash rather than a check. -->
        <CheckIcon aria-hidden="true" class={checkClasses} />
        <MinusIcon aria-hidden="true" class={dashClasses} />
      </span>
    {/if}
  {/snippet}
</CheckboxPrimitive.Root>`,
    }),
    indexFile("checkbox/index.ts", indexParts([["checkbox.svelte", "Root", "Checkbox"]]), [
      { file: "checkbox.svelte", names: ["checkboxVariants", "type CheckboxSize", "type CheckboxVariants"] },
    ]),
  ];
}

export function switchFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = switchPieces(anatomy, BITS_STATES);
  return [
    svelteFile("switch/switch.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("switchVariants", slots.switch)}

${cva("switchThumbVariants", slots["switch-thumb"])}

export type SwitchSize = ${unionType(sizes)};
export type SwitchVariants = VariantProps<typeof switchVariants>;`,
      script: `${bitsImport("Switch")}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}

let {
  ref = $bindable(null),
  checked = $bindable(false),
  class: className,
  size = ${q(defaultSize)},
  ...restProps
}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> & { size?: SwitchSize | undefined } = $props();`,
      markup: `<SwitchPrimitive.Root bind:ref bind:checked data-slot="switch" data-size={size} class={cn(switchVariants({ size }), className)} {...restProps}>
  <SwitchPrimitive.Thumb data-slot="switch-thumb" class={switchThumbVariants({ size })} />
</SwitchPrimitive.Root>`,
    }),
    indexFile("switch/index.ts", indexParts([["switch.svelte", "Root", "Switch"]]), [{ file: "switch.svelte", names: ["switchVariants", "type SwitchSize", "type SwitchVariants"] }]),
  ];
}

// Radio Group on Bits: the item's indicator (with the dot inside) is shown while checked, and
// carries Radix's data-state and data-disabled, as Radix's Indicator does.
export function radioGroupFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = radioGroupPieces(anatomy, BITS_STATES);
  return [
    partFile({
      path: "radio-group/radio-group.svelte",
      imports: [bitsImport("RadioGroup")],
      props: "RadioGroupPrimitive.RootProps",
      tag: "RadioGroupPrimitive.Root",
      slot: "radio-group",
      classes: quoted(slots["radio-group"]),
      bindable: { value: `""` },
    }),
    svelteFile("radio-group/radio-group-item.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("radioGroupItemVariants", slots["radio-group-item"])}

${cva("radioGroupDotVariants", slots["radio-group-indicator:dot"])}

export type RadioGroupItemSize = ${unionType(sizes)};
export type RadioGroupItemVariants = VariantProps<typeof radioGroupItemVariants>;`,
      script: `${bitsImport("RadioGroup")}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}

const indicatorClasses = ${quoted(slots["radio-group-indicator"])};

let {
  ref = $bindable(null),
  class: className,
  size = ${q(defaultSize)},
  disabled = false,
  ...restProps
}: WithoutChildrenOrChild<RadioGroupPrimitive.ItemProps> & { size?: RadioGroupItemSize | undefined } = $props();`,
      markup: `<RadioGroupPrimitive.Item bind:ref data-slot="radio-group-item" data-size={size} class={cn(radioGroupItemVariants({ size }), className)} {disabled} {...restProps}>
  {#snippet children({ checked })}
    {#if checked}
      <span data-slot="radio-group-indicator" data-state="checked" data-disabled={disabled ? "" : undefined} class={indicatorClasses}>
        <span class={radioGroupDotVariants({ size })}></span>
      </span>
    {/if}
  {/snippet}
</RadioGroupPrimitive.Item>`,
    }),
    indexFile(
      "radio-group/index.ts",
      indexParts([
        ["radio-group.svelte", "Root", "RadioGroup"],
        ["radio-group-item.svelte", "Item", "RadioGroupItem"],
      ]),
      [{ file: "radio-group-item.svelte", names: ["radioGroupItemVariants", "type RadioGroupItemSize", "type RadioGroupItemVariants"] }],
    ),
  ];
}

// Slider on Bits (type="single" or "multiple", as Bits asks). Bits has no track part: the track is
// a span carrying the orientation, as Radix's Track does. The label given to the slider is also
// given to each thumb, since the thumb is what gets focus.
export function sliderFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = sliderPieces(anatomy, BITS_STATES);
  return [
    svelteFile("slider/slider.svelte", {
      script: `${bitsImport("Slider")}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}

const classes = ${quoted(slots.slider)};
const trackClasses = ${quoted(slots["slider-track"])};
const rangeClasses = ${quoted(slots["slider-range"])};
const thumbClasses = ${quoted(slots["slider-thumb"])};

let {
  ref = $bindable(null),
  value = $bindable(),
  orientation = "horizontal",
  disabled = false,
  class: className,
  "aria-label": label,
  "aria-labelledby": labelledBy,
  ...restProps
}: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();`,
      markup: `<!-- value is a number or an array by type, which destructuring can't narrow: hence the cast. -->
<SliderPrimitive.Root
  bind:ref
  bind:value={value as never}
  data-slot="slider"
  {orientation}
  {disabled}
  aria-label={label}
  aria-labelledby={labelledBy}
  class={cn(classes, className)}
  {...restProps}
>
  {#snippet children({ thumbs })}
    <span data-slot="slider-track" data-orientation={orientation} data-disabled={disabled ? "" : undefined} class={trackClasses}>
      <SliderPrimitive.Range data-slot="slider-range" class={rangeClasses} />
    </span>
    {#each thumbs as thumb (thumb)}
      <SliderPrimitive.Thumb data-slot="slider-thumb" index={thumb} aria-label={label} aria-labelledby={labelledBy} class={thumbClasses} />
    {/each}
  {/snippet}
</SliderPrimitive.Root>`,
    }),
    indexFile("slider/index.ts", indexParts([["slider.svelte", "Root", "Slider"]])),
  ];
}
