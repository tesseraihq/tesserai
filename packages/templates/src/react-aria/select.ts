import { type Anatomy } from "@tesserai/core";
import { type StatePrefixes } from "../classes";
import { classString, cvaSource, q, unionType } from "../codegen";
import { factorClasses, flatClasses } from "../factor";
import { groupStates, RAC_STATES } from "./states";

// The trigger is a React Aria Button inside the Select, which carries invalid on the root (marked
// with `group`); items are ListBoxItems (data-focused, data-selected).
const TRIGGER_STATES: StatePrefixes = { ...RAC_STATES, invalid: groupStates(RAC_STATES).invalid };

const TRIGGER_BASE = [
  "inline-flex",
  "w-full",
  "items-center",
  "justify-between",
  "gap-2",
  "whitespace-nowrap",
  "outline-none",
  "transition-[color,background-color,border-color,box-shadow]",
  "*:data-[slot=select-value]:line-clamp-1",
  "*:data-[slot=select-value]:flex",
  "*:data-[slot=select-value]:items-center",
  "*:data-[slot=select-value]:gap-2",
  "[&_svg]:pointer-events-none",
  "[&_svg]:shrink-0",
];

const POPUP_BASE = [
  "relative",
  "isolate",
  "z-50",
  "w-(--trigger-width)",
  "origin-(--trigger-anchor-point)",
  "overflow-hidden",
  "outline-none",
  "data-entering:animate-enter",
  "data-exiting:animate-exit",
];

const ITEM_BASE = ["relative", "grid", "w-full", "grid-cols-[1fr_auto]", "items-center", "gap-2", "outline-none", "select-none", "cursor-default", "[&_svg]:pointer-events-none", "[&_svg]:shrink-0"];

export function renderSelect(anatomy: Anatomy): string {
  const opts = { states: RAC_STATES };
  const trigger = factorClasses(anatomy, "trigger", { states: TRIGGER_STATES }, TRIGGER_BASE);
  const placeholder = flatClasses(anatomy, "placeholder", { ...opts, prefix: "data-placeholder:" });
  const icon = flatClasses(anatomy, "icon", opts, ["size-4", "shrink-0", "pointer-events-none"]);
  const popup = flatClasses(anatomy, "popup", opts, POPUP_BASE);
  const item = flatClasses(anatomy, "item", opts, ITEM_BASE);
  const indicator = flatClasses(anatomy, "item-indicator", opts, ["flex", "items-center", "[&_svg]:size-4"]);
  const label = flatClasses(anatomy, "label", opts, ["flex", "items-center", "py-1.5"]);
  const separator = flatClasses(anatomy, "separator", opts, ["pointer-events-none", "-mx-1", "my-1"]);
  const empty = flatClasses(anatomy, "label", opts, ["hidden", "w-full", "justify-center", "py-2", "text-center", "group-data-empty/select-list:flex"]);
  const sizes = anatomy.axes.size?.enabled ?? [];
  const defaultSize = anatomy.axes.size?.default ?? sizes[0] ?? "md";

  return `import * as React from "react";
import {
  Button as ButtonPrimitive,
  Header as HeaderPrimitive,
  Input as InputPrimitive,
  ListBox as ListBoxPrimitive,
  ListBoxItem as ListBoxItemPrimitive,
  ListBoxSection as ListBoxSectionPrimitive,
  Popover as PopoverPrimitive,
  SearchField,
  Select as SelectPrimitive,
  SelectValue as SelectValuePrimitive,
  Separator as SeparatorPrimitive,
  composeRenderProps,
  type ListBoxProps,
  type ListBoxSectionProps,
  type SearchFieldProps,
  type SelectProps,
  type SelectValueProps,
} from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${cvaSource("selectTriggerVariants", trigger)}

// value / defaultValue select an item by its id; selectionMode="multiple" allows several.
function Select<T extends object, M extends "single" | "multiple" = "single">({ className, ...props }: SelectProps<T, M>) {
  return <SelectPrimitive data-slot="select" className={composeRenderProps(className, (className) => cn("group w-fit", className))} {...props} />;
}

function SelectGroup<T extends object>({ className, ...props }: ListBoxSectionProps<T>) {
  return <ListBoxSectionPrimitive data-slot="select-group" className={cn("scroll-my-1", className)} {...props} />;
}

// With several items chosen it shows their names, joined.
function SelectValue<T extends object>({ className, children, ...props }: SelectValueProps<T>) {
  return (
    <SelectValuePrimitive
      data-slot="select-value"
      className={composeRenderProps(className, (className) => cn("flex flex-1 truncate text-start", ${classString(placeholder)}, className))}
      {...props}
    >
      {typeof children === "function" ? children : ({ selectedItems, selectedText, defaultChildren }) => (selectedItems.length > 1 ? selectedText : defaultChildren)}
    </SelectValuePrimitive>
  );
}

type Size = ${unionType(sizes)};

export type SelectTriggerProps = Omit<React.ComponentProps<typeof ButtonPrimitive>, "children"> & {
  children?: React.ReactNode;
  size?: Size | "default";
};

function SelectTrigger({ className, size = "default", children, ...props }: SelectTriggerProps) {
  const resolved: Size = size === "default" ? ${q(defaultSize)} : size;
  return (
    <ButtonPrimitive
      data-slot="select-trigger"
      data-size={resolved}
      className={composeRenderProps(className, (className) => cn(selectTriggerVariants({ size: resolved }), className))}
      {...props}
    >
      {children}
      <ChevronDownIcon data-slot="select-icon" aria-hidden="true" className=${classString(icon)} />
    </ButtonPrimitive>
  );
}

type PopupProps = Omit<React.ComponentProps<typeof PopoverPrimitive>, "className" | "children"> & {
  className?: string | undefined;
  children?: React.ReactNode;
};

// The popup and the list in it; SelectPopover and SelectList compose with SelectInput for a
// searchable select.
function SelectContent({ className, children, placement = "bottom", offset = 4, crossOffset = 0, ...props }: PopupProps) {
  return (
    <SelectPopover className={className} placement={placement} offset={offset} crossOffset={crossOffset} {...props}>
      <SelectList>{children}</SelectList>
    </SelectPopover>
  );
}

function SelectPopover({ className, children, placement = "bottom start", offset = 4, crossOffset = 0, ...props }: PopupProps) {
  return (
    <PopoverPrimitive
      data-slot="select-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(${classString(popup)}, className)}
      {...props}
    >
      {children}
    </PopoverPrimitive>
  );
}

function SelectList<T extends object>({ className, ...props }: ListBoxProps<T>) {
  return (
    <ListBoxPrimitive
      data-slot="select-list"
      className={composeRenderProps(className, (className) => cn("group/select-list max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden", className))}
      {...props}
    />
  );
}

// A search field above the list; wrap the popup's contents in React Aria's Autocomplete to filter.
function SelectInput({ className, ...props }: SearchFieldProps) {
  return (
    <SearchField aria-label="Search" autoFocus data-slot="select-input-wrapper" className={cn("flex flex-col", className)} {...props}>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <SearchIcon aria-hidden="true" className=${classString(icon)} />
        <InputPrimitive data-slot="select-input" className="min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:hidden" />
      </div>
      <div aria-hidden="true" className=${classString(separator.filter((c) => c !== "-mx-1"))} />
    </SearchField>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof HeaderPrimitive>) {
  return <HeaderPrimitive data-slot="select-label" className={cn(${classString(label)}, className)} {...props} />;
}

// id is the value the Select reports; plain-text children double as the typeahead text.
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof ListBoxItemPrimitive>) {
  return (
    <ListBoxItemPrimitive
      data-slot="select-item"
      {...(typeof children === "string" && props.textValue === undefined ? { textValue: children } : {})}
      className={composeRenderProps(className, (className) => cn(${classString(item)}, className))}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span className="flex flex-1 items-center gap-2 whitespace-nowrap">{children}</span>
          <span data-slot="select-item-indicator" className=${classString(indicator)}>
            {isSelected ? <CheckIcon aria-hidden="true" /> : null}
          </span>
        </>
      ))}
    </ListBoxItemPrimitive>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SeparatorPrimitive>) {
  return <SeparatorPrimitive data-slot="select-separator" className={cn(${classString(separator)}, className)} {...props} />;
}

// Shown when the list has nothing to show, e.g. a search with no matches.
function SelectEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="select-empty" className={cn(${classString(empty)}, className)} {...props} />;
}

export {
  Select,
  SelectContent,
  SelectEmpty,
  SelectGroup,
  SelectInput,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectPopover,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  selectTriggerVariants,
};
export type SelectTriggerVariants = VariantProps<typeof selectTriggerVariants>;
`;
}
