import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES } from "../classes";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { BASE_POPUP_MOTION } from "../popup-shared";

// Base UI calls a hover card a preview card.
export function renderHoverCard(anatomy: Anatomy): string {
  const popup = flatClasses(anatomy, "popup", { states: BASE_UI_STATES }, BASE_POPUP_MOTION);
  return `import * as React from "react";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { cn } from "@/lib/utils";

const HoverCard = PreviewCardPrimitive.Root;
const HoverCardTrigger = PreviewCardPrimitive.Trigger;

function HoverCardContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 4,
  ...props
}: Omit<React.ComponentProps<typeof PreviewCardPrimitive.Popup>, "className"> & {
  className?: string;
  align?: React.ComponentProps<typeof PreviewCardPrimitive.Positioner>["align"];
  side?: React.ComponentProps<typeof PreviewCardPrimitive.Positioner>["side"];
  sideOffset?: number;
}) {
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner align={align} side={side} sideOffset={sideOffset} className="z-50">
        <PreviewCardPrimitive.Popup data-slot="hover-card-content" className={cn(${classString(popup)}, className)} {...props} />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
`;
}
