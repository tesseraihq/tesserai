import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { RADIX_POPUP_MOTION, type PopupFlavor } from "../popup-shared";
import { RADIX_STATES } from "./states";

// Radix's motion, scaling from the hover card's own transform origin.
export const HOVER_CARD_MOTION = RADIX_POPUP_MOTION.map((c) => c.replace("radix-popover", "radix-hover-card"));

// Hover Card's classes, which every framework's shell prints from: the popup's, with its motion.
export function hoverCardPieces(anatomy: Anatomy, flavor: PopupFlavor = { states: RADIX_STATES, motion: HOVER_CARD_MOTION }) {
  return { slots: { "hover-card-content": flatClasses(anatomy, "popup", { states: flavor.states }, flavor.motion) } };
}

export function renderHoverCard(anatomy: Anatomy): string {
  const { slots } = hoverCardPieces(anatomy);
  return `import * as React from "react";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function HoverCard(props: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger(props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent({ className, align = "center", sideOffset = 4, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content data-slot="hover-card-content" align={align} sideOffset={sideOffset} className={cn(${classString(slots["hover-card-content"])}, className)} {...props} />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
`;
}
