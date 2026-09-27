import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { RAC_POPUP_MOTION } from "../popup-shared";
import { RAC_STATES } from "./states";

// React Aria's PreviewTrigger opens a popover on hover or focus; HoverCard is that popover.
export function renderHoverCard(anatomy: Anatomy): string {
  const popup = flatClasses(anatomy, "popup", { states: RAC_STATES }, RAC_POPUP_MOTION);
  return `import * as React from "react";
import { Popover, PreviewTrigger, type PopoverProps } from "react-aria-components";
import { cn } from "@/lib/utils";

function HoverCardTrigger(props: React.ComponentProps<typeof PreviewTrigger>) {
  return <PreviewTrigger {...props} />;
}

function HoverCard({ className, placement = "bottom", offset = 4, crossOffset = 0, ...props }: Omit<PopoverProps, "className"> & { className?: string }) {
  return <Popover data-slot="hover-card-content" placement={placement} offset={offset} crossOffset={crossOffset} className={cn(${classString(popup)}, className)} {...props} />;
}

export { HoverCard, HoverCardTrigger };
`;
}
