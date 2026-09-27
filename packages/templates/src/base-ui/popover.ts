import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES } from "../classes";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { BASE_POPUP_MOTION } from "../popup-shared";

export function renderPopover(anatomy: Anatomy): string {
  const opts = { states: BASE_UI_STATES };
  const popup = flatClasses(anatomy, "popup", opts, ["flex", "flex-col", ...BASE_POPUP_MOTION]);
  const header = flatClasses(anatomy, "header", opts, ["flex", "flex-col"]);
  const title = flatClasses(anatomy, "title", opts);
  const description = flatClasses(anatomy, "description", opts);
  return `import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 4,
  ...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive.Popup>, "className"> & {
  className?: string;
  align?: React.ComponentProps<typeof PopoverPrimitive.Positioner>["align"];
  side?: React.ComponentProps<typeof PopoverPrimitive.Positioner>["side"];
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner align={align} side={side} sideOffset={sideOffset} className="z-50">
        <PopoverPrimitive.Popup data-slot="popover-content" className={cn(${classString(popup)}, className)} {...props} />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn(${classString(header)}, className)} {...props} />;
}

function PopoverTitle({ className, ...props }: Omit<React.ComponentProps<typeof PopoverPrimitive.Title>, "className"> & { className?: string }) {
  return <PopoverPrimitive.Title data-slot="popover-title" className={cn(${classString(title)}, className)} {...props} />;
}

function PopoverDescription({ className, ...props }: Omit<React.ComponentProps<typeof PopoverPrimitive.Description>, "className"> & { className?: string }) {
  return <PopoverPrimitive.Description data-slot="popover-description" className={cn(${classString(description)}, className)} {...props} />;
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
`;
}
