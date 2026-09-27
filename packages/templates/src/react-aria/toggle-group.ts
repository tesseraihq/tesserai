import { type Anatomy } from "@tesserai/core";
import { GROUP_CONTEXT, groupClasses, joinedItemClasses } from "../toggle-shared";
import { RAC_STATES } from "./states";

export function renderToggleGroup(anatomy: Anatomy): string {
  return `import * as React from "react";
import { composeRenderProps, ToggleButton as TogglePrimitive, ToggleButtonGroup as ToggleGroupPrimitive, type ToggleButtonGroupProps, type ToggleButtonProps } from "react-aria-components";
import { toggleVariant, toggleVariants, type ToggleSize, type ToggleVariant } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

${GROUP_CONTEXT}

export type ToggleGroupProps = Omit<ToggleButtonGroupProps, "className" | "style" | "children"> &
  GroupSettings & { className?: string; style?: React.CSSProperties; children?: React.ReactNode };

function ToggleGroup({ className, style, variant, size, spacing, orientation = "horizontal", children, ...props }: ToggleGroupProps) {
  const gap = spacingStyle(spacing, style);
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      orientation={orientation}
      {...(gap === undefined ? {} : { style: gap })}
      className={cn(${groupClasses(anatomy, RAC_STATES)}, className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

export type ToggleGroupItemProps = ToggleButtonProps & {
  variant?: ToggleVariant | "default";
  size?: ToggleSize;
};

function ToggleGroupItem({ className, variant, size, ...props }: ToggleGroupItemProps) {
  const group = React.useContext(ToggleGroupContext);
  const v = toggleVariant(group.variant ?? variant);
  const s = group.size ?? size;
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={v}
      data-size={s}
      data-spacing={group.spacing}
      className={composeRenderProps(className, (className) => cn(toggleVariants({ variant: v, size: s }), ${joinedItemClasses()}, className))}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
`;
}
