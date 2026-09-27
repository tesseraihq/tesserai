import { type Anatomy } from "@tesserai/core";
import { INDICATOR_WRAP, radioParts } from "../base-ui/radio-group";
import { classString, cvaSource, unionType } from "../codegen";
import { groupStates, RAC_STATES } from "./states";

// Like the Checkbox: React Aria's Radio is a <label>, so the visible circle is a span styled from
// the label's state and children become the label text.
export function renderRadioGroup(anatomy: Anatomy): string {
  const partStates = groupStates(RAC_STATES);
  const { group, item, dot } = radioParts(anatomy, partStates, partStates);
  const def = JSON.stringify(anatomy.axes.size?.default ?? "md");
  const itemClasses = item.base.filter((c) => c !== "peer" && c !== "group/radio-group-item");
  return `import * as React from "react";
import { composeRenderProps, Radio as RadioPrimitive, RadioGroup as RadioGroupPrimitive, type RadioGroupProps, type RadioProps } from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("radioGroupItemVariants", { ...item, base: itemClasses })}

${cvaSource("radioGroupDotVariants", dot)}

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <RadioGroupPrimitive data-slot="radio-group" className={composeRenderProps(className, (className) => cn(${classString(group)}, className))} {...props} />;
}

export type RadioGroupItemProps = RadioProps & {
  size?: ${unionType(anatomy.axes.size?.enabled ?? [])};
};

function RadioGroupItem({ className, children, size = ${def}, ...props }: RadioGroupItemProps) {
  return (
    <RadioPrimitive className={composeRenderProps(className, (className) => cn("group inline-flex items-center gap-2", className))} {...props}>
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span data-slot="radio-group-item" data-size={size} className={radioGroupItemVariants({ size })}>
            <span data-slot="radio-group-indicator" className="${INDICATOR_WRAP}">
              {isSelected ? <span className={radioGroupDotVariants({ size })} /> : null}
            </span>
          </span>
          {children}
        </>
      ))}
    </RadioPrimitive>
  );
}

export { RadioGroup, RadioGroupItem, radioGroupItemVariants };
export type RadioGroupItemVariants = VariantProps<typeof radioGroupItemVariants>;
`;
}
