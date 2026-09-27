import { cssVarName, type Anatomy } from "@tesserai/core";
import { mapStates, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

const NONE = mapStates(() => []);

// A command palette's library: how it marks the highlighted and disabled rows, and the prefix that
// styles a group's heading from the group (cmdk renders the heading itself, marked
// cmdk-group-heading; undefined where the heading is ours, styled directly).
export type CommandFlavor = { item: StatePrefixes; heading: string | undefined };

export const CMDK_FLAVOR: CommandFlavor = { item: { ...NONE, highlighted: ["data-[selected=true]:"], disabled: ["data-[disabled=true]:"] }, heading: "**:[[cmdk-group-heading]]:" };

function commandLists(anatomy: Anatomy, flavor: CommandFlavor) {
  const part = (name: string, states: StatePrefixes, extra: string[] = [], prefix?: string) => flatClasses(anatomy, name, prefix === undefined ? { states } : { states, prefix }, extra);
  const width = cssVarName("border.width");
  return {
    root: part("root", NONE, ["flex", "h-full", "w-full", "flex-col", "overflow-hidden"]),
    // The search row is separated from the list by a hairline in the input's border colour.
    wrapper: [`border-b-(length:${width})`, ...flatClasses(anatomy, "input", { states: NONE }).filter((c) => c.startsWith("border-") && !c.startsWith("border-(")).map((c) => c.replace(/^border-/, "border-b-")), "flex", "items-center", "gap-2", "[&>svg]:size-4", "[&>svg]:shrink-0", "[&>svg]:opacity-50", "px-3"],
    input: part("input", NONE, ["flex", "w-full", "bg-transparent", "outline-none", "border-0", "disabled:cursor-not-allowed", "disabled:opacity-50"]),
    list: part("list", NONE, ["scroll-py-1", "overflow-x-hidden", "overflow-y-auto", "outline-none"]),
    empty: part("empty", NONE, ["text-center"]),
    group: flavor.heading === undefined ? ["overflow-hidden"] : part("group-heading", NONE, ["overflow-hidden"], flavor.heading),
    heading: part("group-heading", NONE),
    item: part("item", flavor.item, ["relative", "flex", "cursor-default", "items-center", "outline-none", "select-none", "[&_svg]:pointer-events-none", "[&_svg]:shrink-0", "[&_svg]:size-4"]),
    separator: part("separator", NONE, ["-mx-1"]),
    shortcut: part("shortcut", NONE, ["ms-auto"]),
  };
}

function commandParts(anatomy: Anatomy, flavor: CommandFlavor) {
  return Object.fromEntries(Object.entries(commandLists(anatomy, flavor)).map(([name, classes]) => [name, classString(classes)])) as Record<keyof ReturnType<typeof commandLists>, string>;
}

// Command's classes, which every framework's shell prints from (cmdk's, the Radix output's, by
// default): the search row (an unslotted search icon inside it), the list, and its rows.
export function commandPieces(anatomy: Anatomy, flavor: CommandFlavor = CMDK_FLAVOR) {
  const c = commandLists(anatomy, flavor);
  return {
    slots: {
      command: c.root,
      "command-input-wrapper": c.wrapper,
      "command-input": c.input,
      "command-list": c.list,
      "command-empty": c.empty,
      "command-group": c.group,
      "command-item": c.item,
      "command-separator": c.separator,
      "command-shortcut": c.shortcut,
    },
  };
}

// shadcn's Command on Base UI and Radix: cmdk, the same file for both (only CommandDialog differs,
// and it uses the system's own Dialog).
export function renderCmdkCommand(anatomy: Anatomy): string {
  const c = commandParts(anatomy, CMDK_FLAVOR);
  return `import * as React from "react";
import { Command as CommandPrimitive, useCommandState } from "cmdk";
import { SearchIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive data-slot="command" className={cn(${c.root}, className)} {...props} />;
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & { title?: string; description?: string; className?: string; showCloseButton?: boolean; children: React.ReactNode }) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cn("overflow-hidden p-0", className)} showCloseButton={showCloseButton}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className=${c.wrapper}>
      <SearchIcon />
      {/* A placeholder is not a label: the field is named after it unless given its own. */}
      <CommandPrimitive.Input data-slot="command-input" aria-label={props["aria-label"] ?? props.placeholder ?? "Search"} className={cn(${c.input}, className)} {...props} />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List data-slot="command-list" className={cn(${c.list}, className)} {...props} />;
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className={cn(${c.empty}, className)} {...props} />;
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return <CommandPrimitive.Group data-slot="command-group" className={cn(${c.group}, className)} {...props} />;
}

// cmdk's own separator is role="separator", which a listbox may not contain; this one is
// decorative, and like cmdk's it hides while searching unless alwaysRender is set.
function CommandSeparator({ className, alwaysRender = false, ...props }: React.ComponentProps<"div"> & { alwaysRender?: boolean }) {
  const searching = useCommandState((state) => state.search !== "");
  if (searching && !alwaysRender) return null;
  return <div data-slot="command-separator" aria-hidden="true" className={cn(${c.separator}, className)} {...props} />;
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return <CommandPrimitive.Item data-slot="command-item" className={cn(${c.item}, className)} {...props} />;
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cn(${c.shortcut}, className)} {...props} />;
}

export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut };
`;
}

// shadcn's React Aria Command: Autocomplete filters a Menu as you type in a SearchField; no cmdk.
export function renderAriaCommand(anatomy: Anatomy): string {
  const c = commandParts(anatomy, { item: { ...NONE, highlighted: ["data-focused:"], disabled: ["data-disabled:"] }, heading: undefined });
  return `import * as React from "react";
import { Autocomplete, Header, Input, Menu, MenuItem, MenuSection, SearchField, Separator, useFilter, type AutocompleteProps, type MenuItemProps, type MenuProps, type SearchFieldProps, type SeparatorProps } from "react-aria-components";
import { SearchIcon } from "lucide-react";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function Command({ className, filter, children, ...props }: Omit<AutocompleteProps<object>, "children"> & { className?: string; children?: React.ReactNode }) {
  const { contains } = useFilter({ sensitivity: "base" });
  return (
    <div data-slot="command" className={cn(${c.root}, className)}>
      <Autocomplete filter={filter ?? contains} {...props}>
        {children}
      </Autocomplete>
    </div>
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  open,
  onOpenChange,
  children,
  className,
  showCloseButton = false,
}: { title?: string; description?: string; open?: boolean; onOpenChange?: (open: boolean) => void; className?: string; showCloseButton?: boolean; children: React.ReactNode }) {
  return (
    <Dialog isDismissable showCloseButton={showCloseButton} className={cn("overflow-hidden p-0", className)} {...(open === undefined ? {} : { isOpen: open })} {...(onOpenChange === undefined ? {} : { onOpenChange })}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </Dialog>
  );
}

function CommandInput({ className, placeholder, ...props }: Omit<SearchFieldProps, "className"> & { className?: string; placeholder?: string }) {
  return (
    <SearchField data-slot="command-input-wrapper" aria-label={placeholder ?? "Search"} autoFocus className=${c.wrapper} {...props}>
      <SearchIcon />
      <Input data-slot="command-input" {...(placeholder === undefined ? {} : { placeholder })} className={cn(${c.input}, className)} />
    </SearchField>
  );
}

function CommandList<T extends object>({ className, ...props }: Omit<MenuProps<T>, "className"> & { className?: string }) {
  return <Menu data-slot="command-list" className={cn(${c.list}, className)} {...props} />;
}

// Not wired to an empty state: React Aria's Menu shows renderEmptyState instead.
function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-empty" className={cn(${c.empty}, className)} {...props} />;
}

function CommandGroup({ className, heading, children, ...props }: Omit<React.ComponentProps<typeof MenuSection>, "children"> & { heading?: string; children?: React.ReactNode }) {
  return (
    <MenuSection data-slot="command-group" className={cn(${c.group}, className)} {...props}>
      {heading === undefined ? null : <Header className=${c.heading}>{heading}</Header>}
      {children}
    </MenuSection>
  );
}

function CommandSeparator({ className, ...props }: SeparatorProps) {
  return <Separator data-slot="command-separator" className={cn(${c.separator}, className)} {...props} />;
}

function CommandItem({ className, children, ...props }: MenuItemProps<object>) {
  return (
    <MenuItem
      data-slot="command-item"
      {...(typeof children === "string" && props.textValue === undefined ? { textValue: children } : {})}
      className={cn(${c.item}, typeof className === "string" ? className : undefined)}
      {...props}
    >
      {children}
    </MenuItem>
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cn(${c.shortcut}, className)} {...props} />;
}

export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut };
`;
}
