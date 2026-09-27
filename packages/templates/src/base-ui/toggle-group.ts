import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES } from "../classes";
import { GROUP_CONTEXT, groupClasses, joinedItemClasses } from "../toggle-shared";

// Items are Toggles: they take Toggle's variants, and a group's variant and size win over an
// item's own, as in shadcn.
export function renderToggleGroup(anatomy: Anatomy): string {
  return `import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { toggleVariant, toggleVariants, type ToggleSize, type ToggleVariant } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

${GROUP_CONTEXT}

export type ToggleGroupProps = Omit<React.ComponentProps<typeof ToggleGroupPrimitive>, "className" | "style"> &
  GroupSettings & { className?: string; style?: React.CSSProperties };

function ToggleGroup({ className, style, variant, size, spacing, orientation = "horizontal", children, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      orientation={orientation}
      style={spacingStyle(spacing, style)}
      className={cn(${groupClasses(anatomy, BASE_UI_STATES)}, className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

export type ToggleGroupItemProps = Omit<React.ComponentProps<typeof TogglePrimitive>, "className"> & {
  className?: string;
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
      className={cn(toggleVariants({ variant: v, size: s }), ${joinedItemClasses()}, className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
`;
}
