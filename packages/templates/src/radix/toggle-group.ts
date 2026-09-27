import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { GROUP_CONTEXT, toggleGroupPieces } from "../toggle-shared";
import { RADIX_STATES } from "./states";

export function renderToggleGroup(anatomy: Anatomy): string {
  const { slots } = toggleGroupPieces(anatomy, RADIX_STATES);
  return `import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { toggleVariant, toggleVariants, type ToggleSize, type ToggleVariant } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

${GROUP_CONTEXT}

export type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> & GroupSettings;

function ToggleGroup({ className, style, variant, size, spacing, orientation = "horizontal", children, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      orientation={orientation}
      style={spacingStyle(spacing, style)}
      className={cn(${classString(slots["toggle-group"])}, className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

export type ToggleGroupItemProps = React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: ToggleVariant | "default";
  size?: ToggleSize;
};

function ToggleGroupItem({ className, variant, size, ...props }: ToggleGroupItemProps) {
  const group = React.useContext(ToggleGroupContext);
  const v = toggleVariant(group.variant ?? variant);
  const s = group.size ?? size;
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={v}
      data-size={s}
      data-spacing={group.spacing}
      className={cn(toggleVariants({ variant: v, size: s }), ${classString(slots["toggle-group-item"])}, className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
`;
}
