import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES, type StatePrefixes } from "../classes";
import { cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";
import { addThumbTravel } from "../thumb-travel";

const SWITCH_STATES: StatePrefixes = { ...BASE_UI_STATES, invalid: ["data-invalid:", "aria-invalid:"] };

// The ::after extends the hit area beyond the small track, as shadcn's does.
export const SWITCH_ROOT_BASE = [
  "peer",
  "group/switch",
  "relative",
  "inline-flex",
  "shrink-0",
  "items-center",
  "outline-none",
  "transition-[color,background-color,box-shadow,opacity]",
  "after:absolute",
  "after:-inset-x-3",
  "after:-inset-y-2",
];
export const SWITCH_THUMB_BASE = ["pointer-events-none", "block", "ring-0", "transition-transform"];

export function renderSwitch(anatomy: Anatomy): string {
  const root = factorClasses(anatomy, "root", { states: SWITCH_STATES }, SWITCH_ROOT_BASE);
  const thumb = factorClasses(anatomy, "thumb", { states: BASE_UI_STATES }, SWITCH_THUMB_BASE);
  addThumbTravel(anatomy, thumb, "data-checked:");
  const def = JSON.stringify(anatomy.axes.size?.default ?? "md");
  return `import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("switchVariants", root)}

${cvaSource("switchThumbVariants", thumb)}

export type SwitchProps = Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, "className"> & {
  className?: string;
  size?: ${unionType(anatomy.axes.size?.enabled ?? [])};
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
