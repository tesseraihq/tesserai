import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { RAC_POPUP_MOTION } from "../popup-shared";
import { RAC_STATES } from "./states";

// shadcn's React Aria popover: PopoverTrigger (DialogTrigger) holds the open state and wraps the
// button; Popover is the floating panel.
export function renderPopover(anatomy: Anatomy): string {
  const opts = { states: RAC_STATES };
  const popup = flatClasses(anatomy, "popup", opts, ["flex", "flex-col", ...RAC_POPUP_MOTION]);
  const header = flatClasses(anatomy, "header", opts, ["flex", "flex-col"]);
  const title = flatClasses(anatomy, "title", opts);
  const description = flatClasses(anatomy, "description", opts);
  return `import * as React from "react";
import { DialogTrigger, Heading, Popover as PopoverPrimitive, type DialogTriggerProps, type HeadingProps, type PopoverProps } from "react-aria-components";
import { cn } from "@/lib/utils";

function PopoverTrigger(props: DialogTriggerProps) {
  return <DialogTrigger {...props} />;
}

function Popover({ className, placement = "bottom", offset = 4, crossOffset = 0, ...props }: Omit<PopoverProps, "className"> & { className?: string }) {
  return <PopoverPrimitive data-slot="popover-content" placement={placement} offset={offset} crossOffset={crossOffset} className={cn(${classString(popup)}, className)} {...props} />;
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn(${classString(header)}, className)} {...props} />;
}

function PopoverTitle({ className, ...props }: HeadingProps) {
  return <Heading data-slot="popover-title" className={cn(${classString(title)}, className)} {...props} />;
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-description" className={cn(${classString(description)}, className)} {...props} />;
}

export { Popover, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
`;
}
