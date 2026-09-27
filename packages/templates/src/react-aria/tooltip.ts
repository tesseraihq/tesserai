import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { arrowClasses } from "../tooltip-arrow";
import { RAC_STATES } from "./states";

const POPUP_BASE = ["z-50", "data-entering:animate-enter", "data-exiting:animate-exit"];

// shadcn's React Aria tooltip shape: TooltipTrigger takes the trigger and the Tooltip as children;
// Tooltip is the bubble. The trigger must be a React Aria focusable (the system's Button or a
// Link); wrap anything else in React Aria's Focusable.
export function renderTooltip(anatomy: Anatomy): string {
  const popup = flatClasses(anatomy, "popup", { states: RAC_STATES }, POPUP_BASE);
  const arrow = arrowClasses(anatomy, RAC_STATES, []).filter((c) => c !== "rotate-45");

  return `import * as React from "react";
import { Focusable, OverlayArrow, Tooltip as TooltipPrimitive, TooltipTrigger as TooltipTriggerPrimitive, composeRenderProps, type TooltipProps, type TooltipTriggerComponentProps } from "react-aria-components";
import { cn } from "@/lib/utils";

// The first child is the trigger (any focusable element), the second the Tooltip.
function TooltipTrigger({ delay = 0, children, ...props }: TooltipTriggerComponentProps) {
  const [trigger, tooltip] = React.Children.toArray(children);
  return (
    <TooltipTriggerPrimitive data-slot="tooltip-trigger" delay={delay} {...props}>
      <Focusable>{trigger as React.ComponentProps<typeof Focusable>["children"]}</Focusable>
      {tooltip}
    </TooltipTriggerPrimitive>
  );
}

// The arrow is turned to face the trigger on each side.
const ARROW_TRANSFORM: Record<string, string> = {
  bottom: "translate(-50%, calc(50% + 2px)) rotate(45deg)",
  top: "translate(-50%, calc(-50% - 2px)) rotate(45deg)",
  left: "translate(calc(-50% - 2px), -50%) rotate(45deg)",
  right: "translate(calc(50% + 2px), -50%) rotate(45deg)",
};

function Tooltip({ className, placement = "top", offset = 6, crossOffset = 0, children, ...props }: TooltipProps) {
  return (
    <TooltipPrimitive
      data-slot="tooltip-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={composeRenderProps(className, (className) => cn(${classString(popup)}, className))}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <OverlayArrow
            data-slot="tooltip-arrow"
            className=${classString(arrow)}
            style={({ placement, defaultStyle }) => ({ ...defaultStyle, transform: ARROW_TRANSFORM[placement ?? "top"] ?? ARROW_TRANSFORM["top"] })}
          />
        </>
      ))}
    </TooltipPrimitive>
  );
}

export { Tooltip, TooltipTrigger };
`;
}
