import { type Anatomy } from "@tesserai/core";
import { INDICATOR_WRAP, radioParts } from "../base-ui/radio-group";
import { type StatePrefixes } from "../classes";
import { classString, cvaSource, unionType } from "../codegen";
import { RADIX_STATES } from "./states";

// Radio Group's classes and sizes, which every framework's shell prints from. The dot is a plain
// span inside the indicator, sized with the item.
export function radioGroupPieces(anatomy: Anatomy, states: StatePrefixes = RADIX_STATES) {
  const { group, item, dot } = radioParts(anatomy, states, states);
  return {
    slots: {
      "radio-group": group,
      "radio-group-item": item,
      "radio-group-indicator": INDICATOR_WRAP.split(" "),
      "radio-group-indicator:dot": dot,
    },
    sizes: [...(anatomy.axes.size?.enabled ?? [])],
    defaultSize: anatomy.axes.size?.default ?? "md",
  };
}

export function renderRadioGroup(anatomy: Anatomy): string {
  const { slots, sizes, defaultSize } = radioGroupPieces(anatomy);
  const def = JSON.stringify(defaultSize);
  return `import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("radioGroupItemVariants", slots["radio-group-item"])}

${cvaSource("radioGroupDotVariants", slots["radio-group-indicator:dot"])}

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn(${classString(slots["radio-group"])}, className)} {...props} />;
}

export type RadioGroupItemProps = React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  size?: ${unionType(sizes)};
};

function RadioGroupItem({ className, size = ${def}, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item data-slot="radio-group-item" data-size={size} className={cn(radioGroupItemVariants({ size }), className)} {...props}>
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className=${classString(slots["radio-group-indicator"])}>
        <span className={radioGroupDotVariants({ size })} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem, radioGroupItemVariants };
export type RadioGroupItemVariants = VariantProps<typeof radioGroupItemVariants>;
`;
}
