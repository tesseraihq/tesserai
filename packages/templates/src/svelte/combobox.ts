import type { Anatomy } from "@tesserai/core";
import { comboboxPieces, BASE_COMBOBOX_FLAVOR, type ComboboxFlavor } from "../combobox";
import type { GeneratedFile } from "../render";
import { bitsImport, indexFile, indexParts, lucideImport, quoted, svelteFile, UTILS_IMPORT } from "./emit";

// Bits' combobox is its Select's: rows marked data-highlighted, data-disabled and data-selected, as
// Base UI's are, and the list opening and closing with starting- and ending-style, as Base UI's
// does. Only its variables are its own: the list is as wide as its anchor
// (--bits-combobox-anchor-width) and scales from --bits-combobox-content-transform-origin.
export const BITS_COMBOBOX: ComboboxFlavor = {
  item: BASE_COMBOBOX_FLAVOR.item,
  popup: BASE_COMBOBOX_FLAVOR.popup.map((c) => c.replace("--anchor-width", "--bits-combobox-anchor-width").replace("--transform-origin", "--bits-combobox-content-transform-origin")),
};

// What the parts share through the root: the text typed (which rows it matches: Bits leaves the
// filtering to the page, Base UI does it, and so do these parts), each row's label, the chosen
// value, and the element the list opens under (the field, or the chips).
const STATE = `import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

const KEY = Symbol("combobox");

export class ComboboxState {
  search = $state("");
  anchor = $state<HTMLElement | null>(null);
  chips = $state(false);
  labels = new SvelteMap<string, string>();
  #value: { get: () => unknown; set: (value: unknown) => void };

  readonly disabled: () => boolean;

  constructor(value: { get: () => unknown; set: (value: unknown) => void }, disabled: () => boolean) {
    this.#value = value;
    this.disabled = disabled;
  }

  get value() {
    return this.#value.get();
  }

  set value(value: unknown) {
    if (!this.disabled()) this.#value.set(value);
  }

  // Whether a row with this label shows for the text typed.
  matches(label: string): boolean {
    const search = this.search.trim().toLowerCase();
    return search === "" || label.toLowerCase().includes(search);
  }

  // No row matches (and, rendered on the server, none has mounted to be counted).
  get empty(): boolean {
    for (const label of this.labels.values()) if (this.matches(label)) return false;
    return true;
  }
}

export const setComboboxState = (state: ComboboxState) => setContext(KEY, state);
export const getComboboxState = () => getContext<ComboboxState>(KEY);
`;

// Combobox on Bits' parts, with tesserai's (and shadcn's React) API: ComboboxInput is the field (the
// input, and a button at its end that opens the list and, optionally, one that clears it),
// ComboboxContent the list's popup and ComboboxList its scrolling list; rows hide as the typed text
// stops matching them. For multiple selection, ComboboxChips is the field, a chip per chosen value
// (ComboboxChip), and ComboboxChipsInput the text box in it.
export function comboboxFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = comboboxPieces(anatomy, BITS_COMBOBOX);
  const file = (name: string, parts: { module?: string; script: string; markup: string }) => svelteFile(`combobox/${name}`, parts);
  return [
    { path: "combobox/combobox-state.svelte.ts", source: STATE },
    // type="single" or "multiple", as Bits' root; bind:value.
    file("combobox.svelte", {
      script: `${bitsImport("Combobox")}
import { ComboboxState, setComboboxState } from "./combobox-state.svelte.js";

let { open = $bindable(false), value = $bindable(), onOpenChange, ...restProps }: ComboboxPrimitive.RootProps = $props();

const combobox = setComboboxState(new ComboboxState({ get: () => value, set: (next) => (value = next as never) }, () => restProps.disabled ?? false));`,
      markup: `<!-- value is a string or an array by type, which destructuring can't narrow: hence the cast. -->
<ComboboxPrimitive.Root
  bind:open
  bind:value={value as never}
  onOpenChange={(next) => {
    if (!next) combobox.search = "";
    onOpenChange?.(next);
  }}
  {...restProps}
/>`,
    }),
    // What's chosen, as text (or as the children snippet draws it).
    file("combobox-value.svelte", {
      script: `import type { Snippet } from "svelte";
import { getComboboxState } from "./combobox-state.svelte.js";

let { children }: { children?: Snippet<[{ value: unknown }]> } = $props();

const combobox = getComboboxState();`,
      markup: `{#if children}
  {@render children({ value: combobox.value })}
{:else}
  {Array.isArray(combobox.value) ? combobox.value.join(", ") : (combobox.value ?? "")}
{/if}`,
    }),
    file("combobox-trigger.svelte", {
      script: `${bitsImport("Combobox")}
${lucideImport("ChevronDownIcon")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["combobox-trigger"])};

let { ref = $bindable(null), class: className, children, ...restProps }: ComboboxPrimitive.TriggerProps = $props();`,
      markup: `<ComboboxPrimitive.Trigger bind:ref data-slot="combobox-trigger" aria-label="Show options" class={cn(classes, className)} {...restProps}>
  {@render children?.()}
  <ChevronDownIcon />
</ComboboxPrimitive.Trigger>`,
    }),
    // Shown while something is chosen, as Base UI's is; clears the choice and the text.
    file("combobox-clear.svelte", {
      script: `${lucideImport("XIcon")}
import type { HTMLButtonAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getComboboxState } from "./combobox-state.svelte.js";

const classes = ${quoted(slots["combobox-clear"])};

let { ref = $bindable(null), class: className, disabled = false, onclick, ...restProps }: WithElementRef<HTMLButtonAttributes> = $props();

const combobox = getComboboxState();
const chosen = $derived(Array.isArray(combobox.value) ? combobox.value.length > 0 : combobox.value !== undefined && combobox.value !== null && combobox.value !== "");`,
      markup: `{#if chosen}
  <button
    bind:this={ref}
    type="button"
    tabindex={-1}
    data-slot="combobox-clear"
    aria-label="Clear"
    disabled={combobox.disabled() || disabled}
    class={cn(classes, className)}
    onclick={(event) => {
      if (combobox.disabled() || disabled) return;
      combobox.value = Array.isArray(combobox.value) ? [] : "";
      combobox.search = "";
      onclick?.(event);
    }}
    {...restProps}
  >
    <XIcon />
  </button>
{/if}`,
    }),
    // The field: its class goes on the field, everything else on the input. It anchors the list.
    file("combobox-input.svelte", {
      script: `${bitsImport("Combobox")}
import type { Snippet } from "svelte";
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import ComboboxClear from "./combobox-clear.svelte";
import { getComboboxState } from "./combobox-state.svelte.js";
import ComboboxTrigger from "./combobox-trigger.svelte";

const classes = ${quoted(slots["combobox-input-wrapper"])};
const inputClasses = ${quoted(slots["combobox-input"])};
const triggerClasses = ${quoted(slots["combobox-input-wrapper:trigger"])};

let {
  ref = $bindable(null),
  class: className,
  disabled = false,
  showTrigger = true,
  showClear = false,
  oninput,
  children,
  ...restProps
}: WithoutChildrenOrChild<ComboboxPrimitive.InputProps> & { showTrigger?: boolean; showClear?: boolean; children?: Snippet } = $props();

const combobox = getComboboxState();
let field: HTMLElement | null = $state(null);
$effect(() => {
  if (!combobox.chips) combobox.anchor = field;
});`,
      markup: `<div bind:this={field} data-slot="combobox-input-wrapper" class={cn(classes, className)}>
  <ComboboxPrimitive.Input
    bind:ref
    data-slot="combobox-input"
    {disabled}
    class={inputClasses}
    oninput={(event) => {
      combobox.search = event.currentTarget.value;
      oninput?.(event);
    }}
    {...restProps}
  />
  {#if showClear}
    <ComboboxClear {disabled} />
  {/if}
  {#if showTrigger}
    <ComboboxTrigger {disabled} class={triggerClasses} />
  {/if}
  {@render children?.()}
</div>`,
    }),
    file("combobox-portal.svelte", {
      script: `${bitsImport("Combobox")}

let { ...restProps }: ComboboxPrimitive.PortalProps = $props();`,
      markup: `<ComboboxPrimitive.Portal {...restProps} />`,
    }),
    // The list's popup, under the field (or the chips), as wide as it, in its portal
    // (portalProps={{ disabled: true }} renders it in place).
    file("combobox-content.svelte", {
      script: `${bitsImport("Combobox")}
import type { ComponentProps } from "svelte";
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import ComboboxPortal from "./combobox-portal.svelte";
import { getComboboxState } from "./combobox-state.svelte.js";

const classes = ${quoted(slots["combobox-content"])};

let {
  ref = $bindable(null),
  class: className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  portalProps,
  ...restProps
}: ComboboxPrimitive.ContentProps & {
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof ComboboxPortal>>;
} = $props();

const combobox = getComboboxState();`,
      markup: `<ComboboxPortal {...portalProps}>
  <ComboboxPrimitive.Content
    bind:ref
    data-slot="combobox-content"
    data-chips={combobox.chips}
    customAnchor={combobox.anchor}
    {side}
    {sideOffset}
    {align}
    {alignOffset}
    class={cn(classes, className)}
    {...restProps}
  />
</ComboboxPortal>`,
    }),
    // Base UI's list is a plain element: here Bits' viewport, which scrolls the rows.
    file("combobox-list.svelte", {
      script: `${bitsImport("Combobox")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["combobox-list"])};

let { ref = $bindable(null), class: className, ...restProps }: ComboboxPrimitive.ViewportProps = $props();`,
      markup: `<ComboboxPrimitive.Viewport bind:ref data-slot="combobox-list" class={cn(classes, className)} {...restProps} />`,
    }),
    // A row: shown while it matches the text typed; its check at its end while it's chosen.
    file("combobox-item.svelte", {
      script: `${bitsImport("Combobox")}
${lucideImport("CheckIcon")}
${UTILS_IMPORT(["cn", "type WithoutChild"])}
import { getComboboxState } from "./combobox-state.svelte.js";

const classes = ${quoted(slots["combobox-item"])};
const indicatorClasses = ${quoted(slots["combobox-item:indicator"])};

let { ref = $bindable(null), class: className, value, label, children: childrenProp, ...restProps }: WithoutChild<ComboboxPrimitive.ItemProps> = $props();

const combobox = getComboboxState();
const text = $derived(label ?? value);
const id = $props.id();
$effect(() => {
  combobox.labels.set(id, text);
  return () => combobox.labels.delete(id);
});`,
      markup: `{#if combobox.matches(text)}
  <ComboboxPrimitive.Item bind:ref {value} label={text} data-slot="combobox-item" class={cn(classes, className)} {...restProps}>
    {#snippet children({ selected, highlighted })}
      {#if childrenProp}
        {@render childrenProp({ selected, highlighted })}
      {:else}
        {text}
      {/if}
      {#if selected}
        <span class={indicatorClasses}>
          <CheckIcon />
        </span>
      {/if}
    {/snippet}
  </ComboboxPrimitive.Item>
{/if}`,
    }),
    file("combobox-group.svelte", {
      script: `${bitsImport("Combobox")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["combobox-group"])};

let { ref = $bindable(null), class: className, ...restProps }: ComboboxPrimitive.GroupProps = $props();`,
      markup: `<ComboboxPrimitive.Group bind:ref data-slot="combobox-group" class={cn(classes, className)} {...restProps} />`,
    }),
    file("combobox-label.svelte", {
      script: `${bitsImport("Combobox")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["combobox-label"])};

let { ref = $bindable(null), class: className, ...restProps }: ComboboxPrimitive.GroupHeadingProps = $props();`,
      markup: `<ComboboxPrimitive.GroupHeading bind:ref data-slot="combobox-label" class={cn(classes, className)} {...restProps} />`,
    }),
    // Kept in place and empty while rows match (it takes no room then), as Base UI's is.
    file("combobox-empty.svelte", {
      script: `import type { HTMLAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getComboboxState } from "./combobox-state.svelte.js";

const classes = ${quoted(slots["combobox-empty"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

const combobox = getComboboxState();`,
      markup: `<div bind:this={ref} data-slot="combobox-empty" class={cn(classes, className)} {...restProps}>
  {#if combobox.empty}
    {@render children?.()}
  {/if}
</div>`,
    }),
    file("combobox-separator.svelte", {
      script: `${bitsImport("Combobox")}
import type { Separator as SeparatorPrimitive } from "bits-ui";
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["combobox-separator"])};

// Bits' combobox separator is its Separator.
let { ref = $bindable(null), class: className, ...restProps }: SeparatorPrimitive.RootProps = $props();`,
      markup: `<ComboboxPrimitive.Separator bind:ref data-slot="combobox-separator" class={cn(classes, className)} {...restProps} />`,
    }),
    // For multiple selection: the chips and the input share one field, which anchors the list.
    file("combobox-chips.svelte", {
      script: `import type { HTMLAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getComboboxState } from "./combobox-state.svelte.js";

const classes = ${quoted(slots["combobox-input-wrapper"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

const combobox = getComboboxState();
$effect(() => {
  combobox.chips = true;
  combobox.anchor = ref;
});`,
      markup: `<div bind:this={ref} data-slot="combobox-chips" class={cn(classes, "px-1 py-1", className)} {...restProps}>
  {@render children?.()}
</div>`,
    }),
    // A chosen value; its remove button takes it out of the value.
    file("combobox-chip.svelte", {
      script: `${lucideImport("XIcon")}
import type { HTMLAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getComboboxState } from "./combobox-state.svelte.js";

const classes = ${quoted(slots["combobox-chip"])};
const removeClasses = ${quoted(slots["combobox-chip-remove"])};

let {
  ref = $bindable(null),
  class: className,
  value,
  showRemove = true,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLSpanElement>> & { value: string; showRemove?: boolean } = $props();

const combobox = getComboboxState();`,
      markup: `<span bind:this={ref} data-slot="combobox-chip" class={cn(classes, className)} {...restProps}>
  {@render children?.()}
  {#if showRemove}
    <button
      type="button"
      tabindex={-1}
      data-slot="combobox-chip-remove"
      aria-label="Remove"
      disabled={combobox.disabled()}
      class={removeClasses}
      onclick={() => {
        if (combobox.disabled()) return;
        if (Array.isArray(combobox.value)) combobox.value = combobox.value.filter((v) => v !== value);
      }}
    >
      <XIcon />
    </button>
  {/if}
</span>`,
    }),
    file("combobox-chips-input.svelte", {
      script: `${bitsImport("Combobox")}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import { getComboboxState } from "./combobox-state.svelte.js";

const classes = ${quoted(slots["combobox-input"])};

let { ref = $bindable(null), class: className, oninput, ...restProps }: WithoutChildrenOrChild<ComboboxPrimitive.InputProps> = $props();

const combobox = getComboboxState();`,
      markup: `<ComboboxPrimitive.Input
  bind:ref
  data-slot="combobox-chip-input"
  class={cn(classes, "px-1", className)}
  oninput={(event) => {
    combobox.search = event.currentTarget.value;
    oninput?.(event);
  }}
  {...restProps}
/>`,
    }),
    indexFile(
      "combobox/index.ts",
      indexParts([
        ["combobox.svelte", "Root", "Combobox"],
        ["combobox-value.svelte", "Value", "ComboboxValue"],
        ["combobox-input.svelte", "Input", "ComboboxInput"],
        ["combobox-trigger.svelte", "Trigger", "ComboboxTrigger"],
        ["combobox-clear.svelte", "Clear", "ComboboxClear"],
        ["combobox-portal.svelte", "Portal", "ComboboxPortal"],
        ["combobox-content.svelte", "Content", "ComboboxContent"],
        ["combobox-list.svelte", "List", "ComboboxList"],
        ["combobox-item.svelte", "Item", "ComboboxItem"],
        ["combobox-group.svelte", "Group", "ComboboxGroup"],
        ["combobox-label.svelte", "Label", "ComboboxLabel"],
        ["combobox-empty.svelte", "Empty", "ComboboxEmpty"],
        ["combobox-separator.svelte", "Separator", "ComboboxSeparator"],
        ["combobox-chips.svelte", "Chips", "ComboboxChips"],
        ["combobox-chip.svelte", "Chip", "ComboboxChip"],
        ["combobox-chips-input.svelte", "ChipsInput", "ComboboxChipsInput"],
      ]),
    ),
  ];
}
