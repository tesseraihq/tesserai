import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { type PopupFlavor } from "../popup-shared";
import { arrowClasses, RADIX_ARROW } from "../tooltip-arrow";
import { RADIX_STATES } from "./states";

const POPUP_BASE = ["z-50", "data-[state=delayed-open]:animate-enter", "data-[state=closed]:animate-exit"];

// A tooltip's library also decides where its arrow sits along the popup's edge.
export type TooltipFlavor = PopupFlavor & { arrow: string[] };

// Tooltip's classes, which every framework's shell prints from. Radix opens a tooltip with
// data-state=delayed-open (or instant-open, which runs no animation) and turns the arrow's wrapper
// to face each side, so one offset places it.
export function tooltipPieces(anatomy: Anatomy, flavor: TooltipFlavor = { states: RADIX_STATES, motion: POPUP_BASE, arrow: RADIX_ARROW }) {
  return {
    slots: {
      "tooltip-content": flatClasses(anatomy, "popup", { states: flavor.states }, flavor.motion),
      "tooltip-arrow": arrowClasses(anatomy, flavor.states, flavor.arrow),
    },
  };
}

export function renderTooltip(anatomy: Anatomy): string {
  const { slots } = tooltipPieces(anatomy);

  return `import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Tooltips open at once by default, as in shadcn; pass delayDuration to wait.
function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

// Brings its own provider, so a tooltip works without one at the app's root (as shadcn's once did).
function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content data-slot="tooltip-content" sideOffset={sideOffset} className={cn(${classString(slots["tooltip-content"])}, className)} {...props}>
        {children}
        <TooltipPrimitive.Arrow data-slot="tooltip-arrow" className=${classString(slots["tooltip-arrow"])} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
`;
}
