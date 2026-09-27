import { type Anatomy } from "@tesserai/core";
import { SWITCH_THUMB_BASE } from "../base-ui/switch";
import { cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";
import { addThumbTravel } from "../thumb-travel";
import { groupStates, RAC_STATES } from "./states";

// React Aria's Switch is a <label> around a hidden input, like its Checkbox: the visible track and
// thumb are spans styled from the label's state, and children become the label text beside them.
const PART_STATES = groupStates(RAC_STATES);
const TRACK_BASE = ["relative", "inline-flex", "shrink-0", "items-center", "transition-[color,background-color,box-shadow,opacity]"];

export function renderSwitch(anatomy: Anatomy): string {
  const root = factorClasses(anatomy, "root", { states: PART_STATES }, TRACK_BASE);
  const thumb = factorClasses(anatomy, "thumb", { states: PART_STATES }, SWITCH_THUMB_BASE);
  addThumbTravel(anatomy, thumb, "group-data-selected:");
  const def = JSON.stringify(anatomy.axes.size?.default ?? "md");
  return `import * as React from "react";
import { composeRenderProps, Switch as SwitchPrimitive, type SwitchProps as SwitchPrimitiveProps } from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("switchVariants", root)}

${cvaSource("switchThumbVariants", thumb)}

export type SwitchProps = SwitchPrimitiveProps & {
  size?: ${unionType(anatomy.axes.size?.enabled ?? [])};
};

function Switch({ className, children, size = ${def}, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive
      className={composeRenderProps(className, (className) => cn("group inline-flex items-center gap-2", className))}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          <span data-slot="switch" data-size={size} className={switchVariants({ size })}>
            <span data-slot="switch-thumb" className={switchThumbVariants({ size })} />
          </span>
          {children}
        </>
      ))}
    </SwitchPrimitive>
  );
}

export { Switch, switchVariants };
export type SwitchVariants = VariantProps<typeof switchVariants>;
`;
}
