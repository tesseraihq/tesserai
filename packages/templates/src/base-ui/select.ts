import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES, type StatePrefixes } from "../classes";
import { classString, cvaSource, q, unionType } from "../codegen";
import { factorClasses, flatClasses } from "../factor";

// Base UI marks the chosen option with data-selected, not data-checked.
const SELECT_STATES: StatePrefixes = { ...BASE_UI_STATES, selected: ["data-selected:"] };

const TRIGGER_BASE = [
  "inline-flex",
  "w-fit",
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
  "max-h-(--available-height)",
  "min-w-(--anchor-width)",
  "origin-(--transform-origin)",
  "overflow-x-hidden",
  "overflow-y-auto",
  "outline-none",
  "transition-[opacity,transform]",
  "data-starting-style:opacity-0",
  "data-starting-style:scale-95",
  "data-ending-style:opacity-0",
  "data-ending-style:scale-95",
];

const ITEM_BASE = ["relative", "grid", "w-full", "grid-cols-[1fr_auto]", "items-center", "gap-2", "outline-none", "select-none", "cursor-default", "[&_svg]:pointer-events-none", "[&_svg]:shrink-0"];

const SCROLL_BASE = ["z-10", "flex", "w-full", "cursor-default", "items-center", "justify-center", "py-1", "[&_svg]:size-4"];

export function renderSelect(anatomy: Anatomy): string {
  const opts = { states: SELECT_STATES };
  const trigger = factorClasses(anatomy, "trigger", opts, TRIGGER_BASE);
  const placeholder = flatClasses(anatomy, "placeholder", { ...opts, prefix: "data-placeholder:" });
  trigger.base.push(...placeholder);
  const icon = flatClasses(anatomy, "icon", opts, ["size-4", "shrink-0", "pointer-events-none"]);
  const popup = flatClasses(anatomy, "popup", opts, POPUP_BASE);
  const item = flatClasses(anatomy, "item", opts, ITEM_BASE);
  const indicator = flatClasses(anatomy, "item-indicator", opts, ["flex", "items-center", "[&_svg]:size-4"]);
  const label = flatClasses(anatomy, "label", opts, ["flex", "items-center", "py-1.5"]);
  const separator = flatClasses(anatomy, "separator", opts, ["pointer-events-none", "-mx-1", "my-1"]);
  const scroll = flatClasses(anatomy, "scroll-button", opts, SCROLL_BASE);
  const sizes = anatomy.axes.size?.enabled ?? [];
  const defaultSize = anatomy.axes.size?.default ?? sizes[0] ?? "md";

  return `import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${cvaSource("selectTriggerVariants", trigger)}

// Base UI's Select.Value shows the raw value unless Select knows each value's label: pass
// items={{ utc: "UTC", ... }} (or an array of { value, label }) to Select.
const Select = SelectPrimitive.Root;

function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("scroll-my-1", className)} {...props} />;
}

function SelectValue({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" className={cn("flex flex-1 text-start", className)} {...props} />;
}

type Size = ${unionType(sizes)};

export type SelectTriggerProps = Omit<React.ComponentProps<typeof SelectPrimitive.Trigger>, "className"> & {
  className?: string;
  size?: Size | "default";
};

function SelectTrigger({ className, size = "default", children, ...props }: SelectTriggerProps) {
  const resolved: Size = size === "default" ? ${q(defaultSize)} : size;
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={resolved}
      className={cn(selectTriggerVariants({ size: resolved }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon data-slot="select-icon" className="flex">
        <ChevronDownIcon aria-hidden="true" className=${classString(icon)} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

// By default the list opens over the trigger with the chosen item lined up with it, as native
// menus do; alignItemWithTrigger={false} drops it below instead.
function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> &
  Pick<React.ComponentProps<typeof SelectPrimitive.Positioner>, "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50 outline-none"
      >
        <SelectPrimitive.Popup data-slot="select-content" data-align-trigger={alignItemWithTrigger} className={cn(${classString(popup)}, className)} {...props}>
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

// Must sit inside SelectGroup: Base UI wires the group's aria-labelledby to it.
function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return <SelectPrimitive.GroupLabel data-slot="select-label" className={cn(${classString(label)}, className)} {...props} />;
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn(${classString(item)}, className)} {...props}>
      <SelectPrimitive.ItemText className="flex flex-1 items-center gap-2 whitespace-nowrap">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator data-slot="select-item-indicator" className=${classString(indicator)}>
        <CheckIcon aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn(${classString(separator)}, className)} {...props} />;
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow data-slot="select-scroll-up-button" className={cn(${classString(["top-0", ...scroll])}, className)} {...props}>
      <ChevronUpIcon aria-hidden="true" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow data-slot="select-scroll-down-button" className={cn(${classString(["bottom-0", ...scroll])}, className)} {...props}>
      <ChevronDownIcon aria-hidden="true" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  selectTriggerVariants,
};
export type SelectTriggerVariants = VariantProps<typeof selectTriggerVariants>;
`;
}
