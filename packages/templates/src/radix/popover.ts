import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { RADIX_POPUP_MOTION, type PopupFlavor } from "../popup-shared";
import { RADIX_STATES } from "./states";

// Popover's classes, which every framework's shell prints from. Radix's motion scales from
// --radix-popover-content-transform-origin.
export function popoverPieces(anatomy: Anatomy, flavor: PopupFlavor = { states: RADIX_STATES, motion: RADIX_POPUP_MOTION }) {
  const opts = { states: flavor.states };
  return {
    slots: {
      "popover-content": flatClasses(anatomy, "popup", opts, ["flex", "flex-col", ...flavor.motion]),
      "popover-header": flatClasses(anatomy, "header", opts, ["flex", "flex-col"]),
      "popover-title": flatClasses(anatomy, "title", opts),
      "popover-description": flatClasses(anatomy, "description", opts),
    },
  };
}

export function renderPopover(anatomy: Anatomy): string {
  const { slots } = popoverPieces(anatomy);
  return `import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor(props: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverContent({ className, align = "center", sideOffset = 4, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content data-slot="popover-content" align={align} sideOffset={sideOffset} className={cn(${classString(slots["popover-content"])}, className)} {...props} />
    </PopoverPrimitive.Portal>
  );
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn(${classString(slots["popover-header"])}, className)} {...props} />;
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="popover-title" className={cn(${classString(slots["popover-title"])}, className)} {...props} />;
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="popover-description" className={cn(${classString(slots["popover-description"])}, className)} {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
`;
}
