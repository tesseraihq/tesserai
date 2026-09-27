import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES, type StatePrefixes } from "../classes";
import { toggleSizeDefault, toggleSource } from "../toggle-shared";

// Base UI marks an on toggle with data-pressed; pressing it is :active.
export const BASE_TOGGLE_STATES: StatePrefixes = { ...BASE_UI_STATES, selected: ["data-pressed:"], invalid: ["aria-invalid:"] };

export function renderToggle(anatomy: Anatomy): string {
  return `import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${toggleSource(anatomy, BASE_TOGGLE_STATES)}

export type ToggleProps = Omit<React.ComponentProps<typeof TogglePrimitive>, "className"> & {
  className?: string;
  variant?: ToggleVariant | "default";
  size?: ToggleSize;
};

function Toggle({ className, variant, size = ${toggleSizeDefault(anatomy)}, children, ...props }: ToggleProps) {
  const v = toggleVariant(variant);
  return (
    <TogglePrimitive data-slot="toggle" data-variant={v} data-size={size} className={cn(toggleVariants({ variant: v, size }), className)} {...props}>
      {label(children)}
    </TogglePrimitive>
  );
}

export { Toggle, toggleVariant, toggleVariants };
export type ToggleVariants = VariantProps<typeof toggleVariants>;
`;
}
