import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES } from "../classes";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { arrowClasses, BASE_UI_ARROW } from "../tooltip-arrow";

const POPUP_BASE = [
  "z-50",
  "transition-[opacity,transform]",
  "data-starting-style:opacity-0",
  "data-starting-style:scale-95",
  "data-ending-style:opacity-0",
  "data-instant:transition-none",
];

export function renderTooltip(anatomy: Anatomy): string {
  const popup = flatClasses(anatomy, "popup", { states: BASE_UI_STATES }, POPUP_BASE);

  const arrow = arrowClasses(anatomy, BASE_UI_STATES, BASE_UI_ARROW);
  return `import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

// Tooltips open at once by default, as in shadcn; pass delay to wait.
function TooltipProvider({ delay = 0, ...props }: React.ComponentProps<typeof BaseTooltip.Provider>) {
  return <BaseTooltip.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

const Tooltip = BaseTooltip.Root;
const TooltipTrigger = BaseTooltip.Trigger;

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Popup> &
  Pick<React.ComponentProps<typeof BaseTooltip.Positioner>, "side" | "sideOffset" | "align" | "alignOffset">) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset} className="isolate z-50">
        <BaseTooltip.Popup data-slot="tooltip-content" className={cn(${classString(popup)}, className)} {...props}>
          {children}
          <BaseTooltip.Arrow data-slot="tooltip-arrow" className=${classString(arrow)} />
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
`;
}
