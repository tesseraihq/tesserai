import { type Anatomy } from "@tesserai/core";
import { toggleSizeDefault, toggleSource } from "../toggle-shared";
import { RAC_STATES } from "./states";

export function renderToggle(anatomy: Anatomy): string {
  return `import * as React from "react";
import { composeRenderProps, ToggleButton as TogglePrimitive, type ToggleButtonProps } from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${toggleSource(anatomy, RAC_STATES)}

export type ToggleProps = ToggleButtonProps & {
  variant?: ToggleVariant | "default";
  size?: ToggleSize;
};

function Toggle({ className, variant, size = ${toggleSizeDefault(anatomy)}, children, ...props }: ToggleProps) {
  const v = toggleVariant(variant);
  return (
    <TogglePrimitive
      data-slot="toggle"
      data-variant={v}
      data-size={size}
      className={composeRenderProps(className, (className) => cn(toggleVariants({ variant: v, size }), className))}
      {...props}
    >
      {label(children)}
    </TogglePrimitive>
  );
}

export { Toggle, toggleVariant, toggleVariants };
export type ToggleVariants = VariantProps<typeof toggleVariants>;
`;
}
