import { type Anatomy } from "@tesserai/core";
import { mapStates, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

export type MenuFlavor = "base-ui" | "radix" | "react-aria";

const ITEM_LAYOUT = [
  "relative",
  "flex",
  "cursor-default",
  "items-center",
  "outline-none",
  "select-none",
  "data-[inset]:ps-8",
  "[&_svg]:pointer-events-none",
  "[&_svg]:shrink-0",
  "[&_svg]:size-4",
];

// Classes for every menu row part, from the anatomy, with each library's state attributes, as
// class strings to print.
export function menuClasses(anatomy: Anatomy, flavor: MenuFlavor): Record<keyof MenuClassLists, string> {
  const lists = menuClassLists(anatomy, flavor);
  return Object.fromEntries(Object.entries(lists).map(([name, classes]) => [name, classString(classes)])) as Record<keyof MenuClassLists, string>;
}

export type MenuClassLists = ReturnType<typeof menuClassLists>;

// The same classes as lists, for pieces functions.
export function menuClassLists(anatomy: Anatomy, flavor: MenuFlavor) {
  const s = (base: Partial<StatePrefixes>) => ({ ...mapStates(() => []), ...base });
  const itemStates =
    flavor === "base-ui"
      ? s({ highlighted: ["data-highlighted:"], disabled: ["data-disabled:"], hover: ["hover:"], "focus-visible": ["focus-visible:"] })
      : flavor === "radix"
        ? s({ highlighted: ["data-[highlighted]:"], disabled: ["data-[disabled]:"], hover: ["hover:"], "focus-visible": ["focus-visible:"] })
        : // React Aria highlights the focused row (keyboard or pointer) with data-focused.
          s({ highlighted: ["data-focused:"], disabled: ["data-disabled:"], hover: ["data-hovered:"], "focus-visible": ["data-focus-visible:"] });
  const part = (name: string, states: StatePrefixes, extra: string[] = [], prefix?: string) =>
    flatClasses(anatomy, name, prefix === undefined ? { states } : { states, prefix }, extra);
  const destructive = part("destructive", itemStates, [], "data-[variant=destructive]:");
  const item = [...part("item", itemStates, ITEM_LAYOUT), ...destructive];
  const subOpen = flavor === "base-ui" ? ["data-popup-open:"] : flavor === "radix" ? ["data-[state=open]:"] : ["data-open:"];
  return {
    item,
    // Checkbox and radio rows leave room at the start for their indicator.
    choiceItem: [...part("item", itemStates, [...ITEM_LAYOUT, "ps-8!"]), ...destructive],
    indicator: part("item-indicator", itemStates, ["pointer-events-none", "absolute", "start-2", "flex", "items-center", "justify-center"]),
    subTrigger: [...part("item", itemStates, ITEM_LAYOUT), ...part("sub-trigger", s({ open: subOpen }))],
    label: part("label", itemStates, ["flex", "items-center", "py-1.5", "data-[inset]:ps-8"]),
    separator: part("separator", itemStates, ["-mx-1", "my-1"]),
    shortcut: part("shortcut", itemStates, ["ms-auto"]),
    // A radio row's dot, and the chevron at a submenu trigger's end.
    radioDot: ["size-2!", "fill-current"],
    subChevron: ["ms-auto", "rtl:rotate-180"],
  };
}

type MenuRowKey = "label" | "item" | "checkbox-item" | "checkbox-item:indicator" | "radio-item" | "radio-item:indicator" | "radio-item:dot" | "separator" | "shortcut" | "sub-trigger" | "sub-trigger:chevron";

// The row parts every menu shares, by data-slot under the menu's own ("context-menu-item"), for a
// menu's pieces: a checkbox or radio row's indicator is an unslotted span at its start, holding a
// check or a dot; a submenu trigger ends in a chevron.
export function menuRowSlots<P extends string>(c: MenuClassLists, slot: P): Record<`${P}-${MenuRowKey}`, string[]> {
  const rows: Record<MenuRowKey, string[]> = {
    label: c.label,
    item: c.item,
    "checkbox-item": c.choiceItem,
    "checkbox-item:indicator": c.indicator,
    "radio-item": c.choiceItem,
    "radio-item:indicator": c.indicator,
    "radio-item:dot": c.radioDot,
    separator: c.separator,
    shortcut: c.shortcut,
    "sub-trigger": c.subTrigger,
    "sub-trigger:chevron": c.subChevron,
  };
  return Object.fromEntries(Object.entries(rows).map(([key, classes]) => [`${slot}-${key}`, classes])) as Record<`${P}-${MenuRowKey}`, string[]>;
}

// Those slots as the class strings menuItemsSource prints.
export function menuRowStrings(slots: Record<string, string[]>, slot: string): Record<keyof MenuClassLists, string> {
  const s = (key: MenuRowKey) => classString(slots[`${slot}-${key}`]!);
  return {
    item: s("item"),
    choiceItem: s("checkbox-item"),
    indicator: s("checkbox-item:indicator"),
    subTrigger: s("sub-trigger"),
    label: s("label"),
    separator: s("separator"),
    shortcut: s("shortcut"),
    radioDot: s("radio-item:dot"),
    subChevron: s("sub-trigger:chevron"),
  };
}

// The row components every menu shares, named with the menu's prefix (DropdownMenuItem,
// ContextMenuItem, MenubarItem), written once per library. c, the class strings, may come from a
// menu's pieces.
export function menuItemsSource(anatomy: Anatomy, flavor: MenuFlavor, ns: string, prefix: string, slot: string, c = menuClasses(anatomy, flavor)): string {
  const P = prefix;
  if (flavor === "base-ui") {
    const props = (part: string) => `Omit<React.ComponentProps<typeof ${ns}.${part}>, "className"> & { className?: string }`;
    return `function ${P}Group(props: React.ComponentProps<typeof ${ns}.Group>) {
  return <${ns}.Group data-slot="${slot}-group" {...props} />;
}

// Must sit inside ${P}Group: Base UI wires the group's aria-labelledby to it.
function ${P}Label({ className, inset, ...props }: ${props("GroupLabel")} & { inset?: boolean }) {
  return <${ns}.GroupLabel data-slot="${slot}-label" data-inset={inset} className={cn(${c.label}, className)} {...props} />;
}

function ${P}Item({ className, inset, variant = "default", ...props }: ${props("Item")} & { inset?: boolean; variant?: "default" | "destructive" }) {
  return <${ns}.Item data-slot="${slot}-item" data-inset={inset} data-variant={variant} className={cn(${c.item}, className)} {...props} />;
}

function ${P}CheckboxItem({ className, children, ...props }: ${props("CheckboxItem")}) {
  return (
    <${ns}.CheckboxItem data-slot="${slot}-checkbox-item" className={cn(${c.choiceItem}, className)} {...props}>
      <span className=${c.indicator}>
        <${ns}.CheckboxItemIndicator>
          <CheckIcon />
        </${ns}.CheckboxItemIndicator>
      </span>
      {children}
    </${ns}.CheckboxItem>
  );
}

function ${P}RadioGroup(props: React.ComponentProps<typeof ${ns}.RadioGroup>) {
  return <${ns}.RadioGroup data-slot="${slot}-radio-group" {...props} />;
}

function ${P}RadioItem({ className, children, ...props }: ${props("RadioItem")}) {
  return (
    <${ns}.RadioItem data-slot="${slot}-radio-item" className={cn(${c.choiceItem}, className)} {...props}>
      <span className=${c.indicator}>
        <${ns}.RadioItemIndicator>
          <CircleIcon className=${c.radioDot} />
        </${ns}.RadioItemIndicator>
      </span>
      {children}
    </${ns}.RadioItem>
  );
}

function ${P}Separator({ className, ...props }: ${props("Separator")}) {
  return <${ns}.Separator data-slot="${slot}-separator" className={cn(${c.separator}, className)} {...props} />;
}

function ${P}Shortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="${slot}-shortcut" className={cn(${c.shortcut}, className)} {...props} />;
}

function ${P}Sub(props: React.ComponentProps<typeof ${ns}.SubmenuRoot>) {
  return <${ns}.SubmenuRoot data-slot="${slot}-sub" {...props} />;
}

function ${P}SubTrigger({ className, inset, children, ...props }: ${props("SubmenuTrigger")} & { inset?: boolean }) {
  return (
    <${ns}.SubmenuTrigger data-slot="${slot}-sub-trigger" data-inset={inset} className={cn(${c.subTrigger}, className)} {...props}>
      {children}
      <ChevronRightIcon className=${c.subChevron} />
    </${ns}.SubmenuTrigger>
  );
}`;
  }
  return `function ${P}Group(props: React.ComponentProps<typeof ${ns}.Group>) {
  return <${ns}.Group data-slot="${slot}-group" {...props} />;
}

function ${P}Label({ className, inset, ...props }: React.ComponentProps<typeof ${ns}.Label> & { inset?: boolean }) {
  return <${ns}.Label data-slot="${slot}-label" data-inset={inset} className={cn(${c.label}, className)} {...props} />;
}

function ${P}Item({ className, inset, variant = "default", ...props }: React.ComponentProps<typeof ${ns}.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return <${ns}.Item data-slot="${slot}-item" data-inset={inset} data-variant={variant} className={cn(${c.item}, className)} {...props} />;
}

function ${P}CheckboxItem({ className, children, ...props }: React.ComponentProps<typeof ${ns}.CheckboxItem>) {
  return (
    <${ns}.CheckboxItem data-slot="${slot}-checkbox-item" className={cn(${c.choiceItem}, className)} {...props}>
      <span className=${c.indicator}>
        <${ns}.ItemIndicator>
          <CheckIcon />
        </${ns}.ItemIndicator>
      </span>
      {children}
    </${ns}.CheckboxItem>
  );
}

function ${P}RadioGroup(props: React.ComponentProps<typeof ${ns}.RadioGroup>) {
  return <${ns}.RadioGroup data-slot="${slot}-radio-group" {...props} />;
}

function ${P}RadioItem({ className, children, ...props }: React.ComponentProps<typeof ${ns}.RadioItem>) {
  return (
    <${ns}.RadioItem data-slot="${slot}-radio-item" className={cn(${c.choiceItem}, className)} {...props}>
      <span className=${c.indicator}>
        <${ns}.ItemIndicator>
          <CircleIcon className=${c.radioDot} />
        </${ns}.ItemIndicator>
      </span>
      {children}
    </${ns}.RadioItem>
  );
}

function ${P}Separator({ className, ...props }: React.ComponentProps<typeof ${ns}.Separator>) {
  return <${ns}.Separator data-slot="${slot}-separator" className={cn(${c.separator}, className)} {...props} />;
}

function ${P}Shortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="${slot}-shortcut" className={cn(${c.shortcut}, className)} {...props} />;
}

function ${P}Sub(props: React.ComponentProps<typeof ${ns}.Sub>) {
  return <${ns}.Sub data-slot="${slot}-sub" {...props} />;
}

function ${P}SubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof ${ns}.SubTrigger> & { inset?: boolean }) {
  return (
    <${ns}.SubTrigger data-slot="${slot}-sub-trigger" data-inset={inset} className={cn(${c.subTrigger}, className)} {...props}>
      {children}
      <ChevronRightIcon className=${c.subChevron} />
    </${ns}.SubTrigger>
  );
}`;
}

// React Aria's menus, as shadcn's React Aria versions build them: the component named after the menu
// is the content (a Popover around a Menu, taking the Menu's selection props); any row shows a
// check when its menu or section has a selection mode; a submenu is a SubmenuTrigger around a row
// and its own content.
export function racMenuSource(anatomy: Anatomy, prefix: string, slot: string, popupClasses: string[], contentName: string = prefix): string {
  const c = menuClasses(anatomy, "react-aria");
  const P = prefix;
  const C = contentName;
  const popup = menuPopupClasses(anatomy, popupClasses);
  return `export type ${C}Props = Omit<MenuProps<object>, "className" | "children"> &
  Pick<PopoverProps, "placement" | "offset" | "crossOffset" | "isOpen" | "onOpenChange" | "triggerRef"> & {
    className?: string;
    children?: React.ReactNode;
    "data-slot"?: string;
  };

function ${C}({ "data-slot": dataSlot = "${slot}-content", placement = "bottom start", offset = 4, crossOffset = 0, isOpen, onOpenChange, triggerRef, className, children, ...props }: ${C}Props) {
  return (
    <Popover
      data-slot={dataSlot}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      {...(isOpen === undefined ? {} : { isOpen })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
      {...(triggerRef === undefined ? {} : { triggerRef })}
      className={cn(${popup}, className)}
    >
      <Menu className="outline-none" {...props}>
        {children}
      </Menu>
    </Popover>
  );
}

function ${P}Item({ className, inset, variant = "default", children, ...props }: MenuItemProps<object> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return (
    <MenuItem
      data-slot="${slot}-item"
      data-inset={inset}
      data-variant={variant}
      {...(typeof children === "string" && props.textValue === undefined ? { textValue: children } : {})}
      className={composeRenderProps(className, (className, { selectionMode }) => cn(selectionMode === "none" ? ${c.item} : ${c.choiceItem}, className))}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, selectionMode }) => (
        <>
          {selectionMode === "none" ? null : (
            <span className=${c.indicator} data-slot={selectionMode === "single" ? "${slot}-radio-item-indicator" : "${slot}-checkbox-item-indicator"}>
              {isSelected ? <CheckIcon /> : null}
            </span>
          )}
          {children}
        </>
      ))}
    </MenuItem>
  );
}

// A section of rows; give it selectionMode and selectedKeys for checkbox (multiple) or radio (single) rows.
function ${P}Group<T extends object>(props: MenuSectionProps<T>) {
  return <MenuSection data-slot="${slot}-group" {...props} />;
}

function ${P}Label({ className, inset, ...props }: React.ComponentProps<typeof Header> & { inset?: boolean }) {
  return <Header data-slot="${slot}-label" data-inset={inset} className={cn(${c.label}, className)} {...props} />;
}

function ${P}Separator({ className, ...props }: SeparatorProps) {
  return <Separator data-slot="${slot}-separator" className={cn(${c.separator}, className)} {...props} />;
}

function ${P}Shortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="${slot}-shortcut" className={cn(${c.shortcut}, className)} {...props} />;
}

function ${P}Sub(props: React.ComponentProps<typeof SubmenuTrigger>) {
  return <SubmenuTrigger data-slot="${slot}-sub" {...props} />;
}

function ${P}SubTrigger({ className, inset, children, ...props }: MenuItemProps<object> & { inset?: boolean }) {
  return (
    <MenuItem
      data-slot="${slot}-sub-trigger"
      data-inset={inset}
      {...(typeof children === "string" && props.textValue === undefined ? { textValue: children } : {})}
      className={composeRenderProps(className, (className) => cn(${c.subTrigger}, className))}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <ChevronRightIcon className=${c.subChevron} />
        </>
      ))}
    </MenuItem>
  );
}

function ${P}SubContent({ placement = "end top", crossOffset = -3, offset = 0, ...props }: ${C}Props) {
  return <${C} data-slot="${slot}-sub-content" placement={placement} crossOffset={crossOffset} offset={offset} {...props} />;
}`;
}

export const RAC_MENU_IMPORTS = `import {
  composeRenderProps,
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Separator,
  SubmenuTrigger,
  type MenuItemProps,
  type MenuProps,
  type MenuSectionProps,
  type PopoverProps,
  type SeparatorProps,
} from "react-aria-components";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";`;

export const MENU_ITEM_EXPORTS = ["Group", "Label", "Item", "CheckboxItem", "RadioGroup", "RadioItem", "Separator", "Shortcut", "Sub", "SubTrigger"];

// The floating panel of a menu or submenu. Base UI positions it with a Positioner; Radix positions
// Content itself.
export function menuContentSource(anatomy: Anatomy, flavor: MenuFlavor, ns: string, name: string, slot: string, popupClasses: string[], defaults: { side?: string; align: string; sideOffset: number }, classes = menuPopupList(anatomy, popupClasses)): string {
  const popup = classString(classes);
  if (flavor === "base-ui") {
    return `function ${name}({
  className,
  align = ${JSON.stringify(defaults.align)},
  alignOffset = 0,
  side${defaults.side === undefined ? "" : ` = ${JSON.stringify(defaults.side)}`},
  sideOffset = ${defaults.sideOffset},
  ...props
}: Omit<React.ComponentProps<typeof ${ns}.Popup>, "className"> & {
  className?: string;
  align?: React.ComponentProps<typeof ${ns}.Positioner>["align"];
  alignOffset?: number;
  side?: React.ComponentProps<typeof ${ns}.Positioner>["side"];
  sideOffset?: number;
}) {
  return (
    <${ns}.Portal>
      <${ns}.Positioner className="z-50 outline-none" align={align} alignOffset={alignOffset} {...(side === undefined ? {} : { side })} sideOffset={sideOffset}>
        <${ns}.Popup data-slot="${slot}" className={cn(${popup}, className)} {...props} />
      </${ns}.Positioner>
    </${ns}.Portal>
  );
}`;
  }
  return `function ${name}({ className, sideOffset = ${defaults.sideOffset}, ...props }: React.ComponentProps<typeof ${ns}.Content>) {
  return (
    <${ns}.Portal>
      <${ns}.Content data-slot="${slot}" sideOffset={sideOffset} className={cn(${popup}, className)} {...props} />
    </${ns}.Portal>
  );
}`;
}

export function menuPopupList(anatomy: Anatomy, motion: string[]): string[] {
  return flatClasses(anatomy, "popup", { states: mapStates(() => []) }, motion);
}

export function menuPopupClasses(anatomy: Anatomy, motion: string[]): string {
  return classString(menuPopupList(anatomy, motion));
}
