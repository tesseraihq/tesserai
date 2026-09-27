import { type Anatomy } from "@tesserai/core";
import { SWITCH_ROOT_BASE, SWITCH_THUMB_BASE } from "../base-ui/switch";
import { type StatePrefixes } from "../classes";
import { cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";
import { addThumbTravel } from "../thumb-travel";
import { RADIX_STATES } from "./states";

// Switch's classes and sizes, which every framework's shell prints from. The thumb travels when the
// switch is on, marked by the states' selected prefix.
export function switchPieces(anatomy: Anatomy, states: StatePrefixes = RADIX_STATES) {
  const thumb = factorClasses(anatomy, "thumb", { states }, SWITCH_THUMB_BASE);
  addThumbTravel(anatomy, thumb, states.selected[0] ?? "data-[state=checked]:");
  return {
    slots: { switch: factorClasses(anatomy, "root", { states }, SWITCH_ROOT_BASE), "switch-thumb": thumb },
    sizes: [...(anatomy.axes.size?.enabled ?? [])],
    defaultSize: anatomy.axes.size?.default ?? "md",
  };
}

export function renderSwitch(anatomy: Anatomy): string {
  const { slots, sizes, defaultSize } = switchPieces(anatomy);
  const def = JSON.stringify(defaultSize);
  return `import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("switchVariants", slots.switch)}

${cvaSource("switchThumbVariants", slots["switch-thumb"])}

export type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: ${unionType(sizes)};
};

function Switch({ className, size = ${def}, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root data-slot="switch" data-size={size} className={cn(switchVariants({ size }), className)} {...props}>
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={switchThumbVariants({ size })} />
    </SwitchPrimitive.Root>
  );
}

export { Switch, switchVariants };
export type SwitchVariants = VariantProps<typeof switchVariants>;
`;
}
