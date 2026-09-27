import { type Anatomy } from "@tesserai/core";
import { mapStates, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";
import { BASE_POPUP_MOTION, RAC_POPUP_MOTION } from "./popup-shared";

const NONE = mapStates(() => []);
const FIELD_LAYOUT = ["group/combobox-field", "relative", "flex", "w-full", "min-w-0", "flex-wrap", "items-center", "outline-none", "transition-[color,background-color,border-color,box-shadow,opacity]"];
const BUTTON_LAYOUT = ["inline-flex", "shrink-0", "items-center", "justify-center", "outline-none", "[&_svg]:size-4", "[&_svg]:pointer-events-none"];
const ITEM_LAYOUT = ["relative", "flex", "w-full", "cursor-default", "items-center", "outline-none", "select-none", "[&_svg]:size-4", "[&_svg]:shrink-0"];

type Flavor = "base-ui" | "react-aria";

const TRIGGER_BESIDE_CLEAR = "group-has-data-[slot=combobox-clear]/combobox-field:hidden";

// What a combobox's library changes in its classes: the rows' state attributes, and the list's
// width (the field's, which each library names its own way) and motion.
export type ComboboxFlavor = { item: StatePrefixes; popup: string[] };

export const BASE_COMBOBOX_FLAVOR: ComboboxFlavor = {
  item: { ...NONE, highlighted: ["data-highlighted:"], disabled: ["data-disabled:"], selected: ["data-selected:"] },
  popup: ["w-(--anchor-width)", ...BASE_POPUP_MOTION],
};

function lists(anatomy: Anatomy, flavor: Flavor, combobox: ComboboxFlavor) {
  const part = (name: string, states: StatePrefixes, extra: string[] = []) => flatClasses(anatomy, name, { states }, extra);
  const field: StatePrefixes =
    flavor === "base-ui"
      ? { ...NONE, hover: ["hover:"], "focus-visible": ["has-[:focus-visible]:"], invalid: ["has-[[aria-invalid=true]]:"], disabled: ["has-[input:disabled]:"] }
      : { ...NONE, hover: ["data-hovered:"], "focus-visible": ["data-focus-visible:"], invalid: ["data-invalid:", "has-[[aria-invalid=true]]:"], disabled: ["data-disabled:"] };
  const hover: StatePrefixes = flavor === "base-ui" ? { ...NONE, hover: ["hover:"] } : { ...NONE, hover: ["data-hovered:"] };
  return {
    field: part("field", field, [...FIELD_LAYOUT, "pe-1"]),
    input: part("input", NONE, ["min-w-16", "flex-1", "self-stretch", "bg-transparent", "outline-none", "placeholder:text-neutral-text", "disabled:cursor-not-allowed"]),
    button: part("button", hover, BUTTON_LAYOUT),
    // As wide as the field it drops from.
    popup: part("popup", NONE, ["overflow-y-auto", "outline-none", ...combobox.popup]),
    item: part("item", combobox.item, ITEM_LAYOUT),
    indicator: part("item-indicator", NONE, ["ms-auto", "flex", "items-center"]),
    label: part("label", NONE),
    // Base UI keeps the empty-state element while there are results; it takes no room then.
    empty: part("empty", NONE, ["text-center", "empty:hidden"]),
    separator: part("separator", NONE, ["-mx-1", "my-1"]),
    chip: part("chip", NONE, ["inline-flex", "max-w-full", "items-center", "whitespace-nowrap"]),
    chipRemove: part("chip-remove", hover, ["inline-flex", "items-center", "justify-center", "outline-none", "[&_svg]:size-3"]),
  };
}

function parts(anatomy: Anatomy, flavor: Flavor) {
  const combobox: ComboboxFlavor =
    flavor === "base-ui" ? BASE_COMBOBOX_FLAVOR : { item: { ...NONE, highlighted: ["data-focused:"], disabled: ["data-disabled:"], selected: ["data-selected:"] }, popup: ["w-(--trigger-width)", ...RAC_POPUP_MOTION] };
  return Object.fromEntries(Object.entries(lists(anatomy, flavor, combobox)).map(([name, classes]) => [name, classString(classes)])) as Record<keyof ReturnType<typeof lists>, string>;
}

// Combobox's classes, which every framework's shell prints from: Base UI's by default, which the
// Radix output uses too (Radix has no combobox). The field's states are structural (has-[…]), the
// same in every library; a row's check is an unslotted indicator at its end.
export function comboboxPieces(anatomy: Anatomy, flavor: ComboboxFlavor = BASE_COMBOBOX_FLAVOR) {
  const c = lists(anatomy, "base-ui", flavor);
  return {
    slots: {
      "combobox-input-wrapper": c.field,
      // The field's own open button hides while its clear button shows.
      "combobox-input-wrapper:trigger": [TRIGGER_BESIDE_CLEAR],
      "combobox-input": c.input,
      "combobox-trigger": c.button,
      "combobox-clear": c.button,
      "combobox-content": c.popup,
      "combobox-list": ["outline-none"],
      "combobox-item": c.item,
      "combobox-item:indicator": c.indicator,
      "combobox-group": [] as string[],
      "combobox-label": c.label,
      "combobox-empty": c.empty,
      "combobox-separator": c.separator,
      "combobox-chips": [...c.field, "px-1", "py-1"],
      "combobox-chip": c.chip,
      "combobox-chip-remove": c.chipRemove,
      "combobox-chip-input": [...c.input, "px-1"],
    },
  };
}

// shadcn's Combobox on Base UI, which it also uses for Radix (Radix has no combobox): so the Radix
// version imports @base-ui/react too.
export function renderBaseCombobox(anatomy: Anatomy): string {
  const c = parts(anatomy, "base-ui");
  const P = (name: string) => `Omit<React.ComponentProps<typeof ComboboxPrimitive.${name}>, "className"> & { className?: string }`;
  return `import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;
const ComboboxCollection = ComboboxPrimitive.Collection;

function ComboboxValue(props: React.ComponentProps<typeof ComboboxPrimitive.Value>) {
  return <ComboboxPrimitive.Value {...props} />;
}

function ComboboxTrigger({ className, children, ...props }: ${P("Trigger")}) {
  return (
    <ComboboxPrimitive.Trigger data-slot="combobox-trigger" aria-label="Show options" className={cn(${c.button}, className)} {...props}>
      {children}
      <ChevronDownIcon />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ${P("Clear")}) {
  return (
    <ComboboxPrimitive.Clear data-slot="combobox-clear" aria-label="Clear" className={cn(${c.button}, className)} {...props}>
      <XIcon />
    </ComboboxPrimitive.Clear>
  );
}

// The field: the input, and at its end a button that opens the list and, optionally, one that clears it.
function ComboboxInput({ className, children, disabled = false, showTrigger = true, showClear = false, ...props }: ${P("Input")} & { showTrigger?: boolean; showClear?: boolean }) {
  return (
    <div data-slot="combobox-input-wrapper" className={cn(${c.field}, className)}>
      <ComboboxPrimitive.Input data-slot="combobox-input" disabled={disabled} className=${c.input} {...props} />
      {showClear ? <ComboboxClear disabled={disabled} /> : null}
      {showTrigger ? <ComboboxTrigger disabled={disabled} className="group-has-data-[slot=combobox-clear]/combobox-field:hidden" /> : null}
      {children}
    </div>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ${P("Popup")} & Pick<React.ComponentProps<typeof ComboboxPrimitive.Positioner>, "side" | "sideOffset" | "align" | "alignOffset" | "anchor">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset} {...(anchor === undefined ? {} : { anchor })} className="isolate z-50">
        <ComboboxPrimitive.Popup data-slot="combobox-content" data-chips={anchor !== undefined} className={cn(${c.popup}, className)} {...props} />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ${P("List")}) {
  return <ComboboxPrimitive.List data-slot="combobox-list" className={cn("outline-none", className)} {...props} />;
}

function ComboboxItem({ className, children, ...props }: ${P("Item")}) {
  return (
    <ComboboxPrimitive.Item data-slot="combobox-item" className={cn(${c.item}, className)} {...props}>
      {children}
      <ComboboxPrimitive.ItemIndicator className=${c.indicator}>
        <CheckIcon />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({ className, ...props }: ${P("Group")}) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" className={cn(className)} {...props} />;
}

function ComboboxLabel({ className, ...props }: ${P("GroupLabel")}) {
  return <ComboboxPrimitive.GroupLabel data-slot="combobox-label" className={cn(${c.label}, className)} {...props} />;
}

function ComboboxEmpty({ className, ...props }: ${P("Empty")}) {
  return <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn(${c.empty}, className)} {...props} />;
}

function ComboboxSeparator({ className, ...props }: ${P("Separator")}) {
  return <ComboboxPrimitive.Separator data-slot="combobox-separator" className={cn(${c.separator}, className)} {...props} />;
}

// For multiple selection: the chips and the input share one field, which anchors the list.
function ComboboxChips({ className, ...props }: ${P("Chips")}) {
  return <ComboboxPrimitive.Chips data-slot="combobox-chips" className={cn(${c.field}, "px-1 py-1", className)} {...props} />;
}

function ComboboxChip({ className, children, showRemove = true, ...props }: ${P("Chip")} & { showRemove?: boolean }) {
  return (
    <ComboboxPrimitive.Chip data-slot="combobox-chip" className={cn(${c.chip}, className)} {...props}>
      {children}
      {showRemove ? (
        <ComboboxPrimitive.ChipRemove data-slot="combobox-chip-remove" aria-label="Remove" className=${c.chipRemove}>
          <XIcon />
        </ComboboxPrimitive.ChipRemove>
      ) : null}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({ className, ...props }: ${P("Input")}) {
  return <ComboboxPrimitive.Input data-slot="combobox-chip-input" className={cn(${c.input}, "px-1", className)} {...props} />;
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
`;
}

// shadcn's React Aria Combobox: React Aria's ComboBox, with chips from its TagGroup for multiple
// selection.
export function renderAriaCombobox(anatomy: Anatomy): string {
  const c = parts(anatomy, "react-aria");
  return `import * as React from "react";
import {
  Button,
  Collection,
  ComboBox as ComboBoxPrimitive,
  ComboBoxStateContext,
  ComboBoxValue,
  composeRenderProps,
  Group,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Separator,
  Tag,
  TagGroup,
  TagList,
  type ButtonProps,
  type GroupProps,
  type HeaderProps,
  type InputProps,
  type Key,
  type ListBoxItemProps,
  type ListBoxProps,
  type ListBoxSectionProps,
  type PopoverProps,
  type SeparatorProps,
  type TagProps,
} from "react-aria-components";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Combobox = ComboBoxPrimitive;
const ComboboxCollection = Collection;

function ComboboxValue<T extends object>(props: React.ComponentProps<typeof ComboBoxValue<T>>) {
  return <ComboBoxValue<T> {...props} />;
}

function ComboboxTrigger({ className, children, ...props }: Omit<ButtonProps, "className"> & { className?: string }) {
  return (
    <Button data-slot="combobox-trigger" className={cn(${c.button}, className)} {...props}>
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <ChevronDownIcon />
        </>
      ))}
    </Button>
  );
}

// Shown only while there is text; clears the value (and so the text).
function ComboboxClear({ className, ...props }: Omit<ButtonProps, "className"> & { className?: string }) {
  const state = React.useContext(ComboBoxStateContext);
  if (state === null || state.inputValue === "") return null;
  return (
    <Button data-slot="combobox-clear" slot={null} aria-label="Clear" onPress={() => state.setValue(null)} className={cn(${c.button}, className)} {...props}>
      <XIcon />
    </Button>
  );
}

function ComboboxInput({ className, children, disabled = false, showTrigger = true, showClear = false, ...props }: Omit<InputProps, "className"> & { className?: string; showTrigger?: boolean; showClear?: boolean }) {
  return (
    <Group data-slot="combobox-input-wrapper" className={cn(${c.field}, className)}>
      <Input data-slot="combobox-input" disabled={disabled} className=${c.input} {...props} />
      {showClear ? <ComboboxClear isDisabled={disabled} /> : null}
      {showTrigger ? <ComboboxTrigger isDisabled={disabled} className="group-has-data-[slot=combobox-clear]/combobox-field:hidden" /> : null}
      {children}
    </Group>
  );
}

function ComboboxContent({ className, placement = "bottom start", offset = 6, crossOffset = 0, anchor, ...props }: Omit<PopoverProps, "className"> & { className?: string; anchor?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <Popover
      data-slot="combobox-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      {...(anchor === undefined ? {} : { triggerRef: anchor })}
      className={cn(${c.popup}, className)}
      {...props}
    />
  );
}

function ComboboxList<T extends object>({ className, ...props }: Omit<ListBoxProps<T>, "className"> & { className?: string }) {
  return <ListBox data-slot="combobox-list" className={cn("outline-none", className)} {...props} />;
}

function ComboboxItem<T extends object>({ className, children, ...props }: Omit<ListBoxItemProps<T>, "className"> & { className?: string }) {
  return (
    <ListBoxItem
      data-slot="combobox-item"
      {...(typeof children === "string" && props.textValue === undefined ? { textValue: children } : {})}
      className={cn(${c.item}, className)}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          {children}
          <span className=${c.indicator}>{isSelected ? <CheckIcon /> : null}</span>
        </>
      ))}
    </ListBoxItem>
  );
}

function ComboboxGroup<T extends object>(props: ListBoxSectionProps<T>) {
  return <ListBoxSection data-slot="combobox-group" {...props} />;
}

function ComboboxLabel({ className, ...props }: HeaderProps) {
  return <Header data-slot="combobox-label" className={cn(${c.label}, className)} {...props} />;
}

// Pass as the list's renderEmptyState: React Aria's ListBox holds only its items.
function ComboboxEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="combobox-empty" className={cn(${c.empty}, className)} {...props} />;
}

function ComboboxSeparator({ className, ...props }: SeparatorProps) {
  return <Separator data-slot="combobox-separator" className={cn(${c.separator}, className)} {...props} />;
}

function ComboboxChips({ className, children, ...props }: Omit<GroupProps, "className"> & { className?: string }) {
  return (
    <Group data-slot="combobox-chips" className={cn(${c.field}, "px-1 py-1", className)} {...props}>
      {children}
    </Group>
  );
}

// The selected values as removable chips, for a ComboBox with selectionMode="multiple".
function ComboboxChipList<T extends { id: Key; name?: string }>({ className }: { className?: string }) {
  return (
    <ComboBoxValue<T> className="contents">
      {({ selectedItems, state }) => (
        <TagGroup
          aria-label="Selected"
          data-slot="combobox-chip-list"
          className={cn("contents", className)}
          onRemove={(keys) => {
            if (Array.isArray(state.value)) state.setValue(state.value.filter((key) => !keys.has(key)));
          }}
        >
          <TagList className="contents" items={selectedItems.filter((item): item is T => item !== null)}>
            {(item) => <ComboboxChip id={item.id}>{item.name ?? String(item.id)}</ComboboxChip>}
          </TagList>
        </TagGroup>
      )}
    </ComboBoxValue>
  );
}

function ComboboxChip({ className, children, showRemove = true, ...props }: Omit<TagProps, "className"> & { className?: string; showRemove?: boolean }) {
  return (
    <Tag data-slot="combobox-chip" {...(typeof children === "string" ? { textValue: children } : {})} className={cn(${c.chip}, className)} {...props}>
      {composeRenderProps(children, (children) => (
        <>
          {children}
          {showRemove ? (
            <Button slot="remove" data-slot="combobox-chip-remove" aria-label="Remove" className=${c.chipRemove}>
              <XIcon />
            </Button>
          ) : null}
        </>
      ))}
    </Tag>
  );
}

function ComboboxChipsInput({ className, ...props }: Omit<InputProps, "className"> & { className?: string }) {
  return <Input data-slot="combobox-chip-input" className={cn(${c.input}, "px-1", className)} {...props} />;
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChipList,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
`;
}
