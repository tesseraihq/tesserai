import { type Anatomy } from "@tesserai/core";
import { type PopupFlavor } from "../popup-shared";
import { classString, cvaSource, q, unionType } from "../codegen";
import { factorClasses, flatClasses } from "../factor";
import { RADIX_STATES } from "./states";

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

export const SELECT_POPUP_MOTION = [
  "relative",
  "z-50",
  "max-h-(--radix-select-content-available-height)",
  "min-w-[8rem]",
  "origin-(--radix-select-content-transform-origin)",
  "overflow-x-hidden",
  "overflow-y-auto",
  "outline-none",
  "data-[state=open]:animate-enter",
  "data-[state=closed]:animate-exit",
  "data-[align-trigger=true]:animate-none",
];

const ITEM_BASE = ["relative", "grid", "w-full", "grid-cols-[1fr_auto]", "items-center", "gap-2", "outline-none", "select-none", "cursor-default", "[&_svg]:pointer-events-none", "[&_svg]:shrink-0"];

const SCROLL_BASE = ["z-10", "flex", "cursor-default", "items-center", "justify-center", "py-1", "[&_svg]:size-4"];

// Select's classes and sizes, which every framework's shell prints from. The popup's positioning
// reads Radix's --radix-select-* variables; the viewport is an unslotted element inside the content.
export function selectPieces(anatomy: Anatomy, flavor: PopupFlavor = { states: RADIX_STATES, motion: SELECT_POPUP_MOTION }) {
  const opts = { states: flavor.states };
  // The trigger is a native button (disabled:).
  const trigger = factorClasses(anatomy, "trigger", { states: { ...flavor.states, disabled: ["disabled:"] } }, TRIGGER_BASE);
  trigger.base.push(...flatClasses(anatomy, "placeholder", { ...opts, prefix: "data-[placeholder]:" }));
  const scroll = flatClasses(anatomy, "scroll-button", opts, SCROLL_BASE);
  const sizes = anatomy.axes.size?.enabled ?? [];
  return {
    slots: {
      "select-group": ["scroll-my-1"],
      "select-trigger": trigger,
      "select-icon": flatClasses(anatomy, "icon", opts, ["size-4", "shrink-0", "pointer-events-none"]),
      "select-content": flatClasses(anatomy, "popup", opts, flavor.motion),
      // With position="popper" the list is at least as wide as the trigger.
      "select-content:viewport": ["data-[position=popper]:w-full", "data-[position=popper]:min-w-(--radix-select-trigger-width)"],
      "select-label": flatClasses(anatomy, "label", opts, ["flex", "items-center", "py-1.5"]),
      "select-item": flatClasses(anatomy, "item", opts, ITEM_BASE),
      "select-item-indicator": flatClasses(anatomy, "item-indicator", opts, ["flex", "items-center", "[&_svg]:size-4"]),
      "select-separator": flatClasses(anatomy, "separator", opts, ["pointer-events-none", "-mx-1", "my-1"]),
      "select-scroll-up-button": scroll,
      "select-scroll-down-button": scroll,
    },
    sizes: [...sizes],
    defaultSize: anatomy.axes.size?.default ?? sizes[0] ?? "md",
  };
}

export function renderSelect(anatomy: Anatomy): string {
  const { slots, sizes, defaultSize } = selectPieces(anatomy);

  return `import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${cvaSource("selectTriggerVariants", slots["select-trigger"])}

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn(${classString(slots["select-group"])}, className)} {...props} />;
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

type Size = ${unionType(sizes)};

export type SelectTriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: Size | "default";
};

function SelectTrigger({ className, size = "default", children, ...props }: SelectTriggerProps) {
  const resolved: Size = size === "default" ? ${q(defaultSize)} : size;
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger" data-size={resolved} className={cn(selectTriggerVariants({ size: resolved }), className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon data-slot="select-icon" aria-hidden="true" className=${classString(slots["select-icon"])} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

// By default the list opens over the trigger with the chosen item lined up with it, as native
// menus do; position="popper" drops it below instead.
function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        position={position}
        align={align}
        {...(position === "popper" ? { sideOffset } : {})}
        className={cn(${classString(slots["select-content"])}, className)}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport data-position={position} className=${classString(slots["select-content:viewport"])}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn(${classString(slots["select-label"])}, className)} {...props} />;
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn(${classString(slots["select-item"])}, className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator data-slot="select-item-indicator" className=${classString(slots["select-item-indicator"])}>
        <CheckIcon aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn(${classString(slots["select-separator"])}, className)} {...props} />;
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton data-slot="select-scroll-up-button" className={cn(${classString(slots["select-scroll-up-button"])}, className)} {...props}>
      <ChevronUpIcon aria-hidden="true" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton data-slot="select-scroll-down-button" className={cn(${classString(slots["select-scroll-down-button"])}, className)} {...props}>
      <ChevronDownIcon aria-hidden="true" />
    </SelectPrimitive.ScrollDownButton>
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
