import { type Anatomy } from "@tesserai/core";
import { type StatePrefixes } from "../classes";
import { toggleSizeDefault, toggleSource } from "../toggle-shared";
import { RADIX_STATES } from "./states";

export const RADIX_TOGGLE_STATES: StatePrefixes = { ...RADIX_STATES, selected: ["data-[state=on]:"] };

export function renderToggle(anatomy: Anatomy): string {
  return `import * as React from "react";
import { Toggle as TogglePrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${toggleSource(anatomy, RADIX_TOGGLE_STATES)}

export type ToggleProps = Omit<React.ComponentProps<typeof TogglePrimitive.Root>, "size"> & {
  variant?: ToggleVariant | "default";
  size?: ToggleSize;
};

function Toggle({ className, variant, size = ${toggleSizeDefault(anatomy)}, children, ...props }: ToggleProps) {
  const v = toggleVariant(variant);
  return (
    <TogglePrimitive.Root data-slot="toggle" data-variant={v} data-size={size} className={cn(toggleVariants({ variant: v, size }), className)} {...props}>
      {label(children)}
    </TogglePrimitive.Root>
  );
}

export { Toggle, toggleVariant, toggleVariants };
export type ToggleVariants = VariantProps<typeof toggleVariants>;
`;
}
