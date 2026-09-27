import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES, type StatePrefixes } from "../classes";
import { classString, cvaSource, unionType } from "../codegen";
import { factorClasses, flatOnly } from "../factor";

const ITEM_STATES: StatePrefixes = { ...BASE_UI_STATES, invalid: ["data-invalid:", "aria-invalid:"] };

export const GROUP_BASE = ["grid", "w-full"];
export const ITEM_BASE = [
  "peer",
  "group/radio-group-item",
  "relative",
  "inline-flex",
  "aspect-square",
  "shrink-0",
  "items-center",
  "justify-center",
  "outline-none",
  "transition-[color,background-color,border-color,box-shadow]",
  "after:absolute",
  "after:-inset-x-3",
  "after:-inset-y-2",
];
// The indicator fills the item and centres the dot.
export const INDICATOR_WRAP = "flex size-full items-center justify-center";

export function radioParts(anatomy: Anatomy, itemStates: StatePrefixes, dotStates: StatePrefixes) {
  const group = flatOnly(factorClasses(anatomy, "group", { states: dotStates }, GROUP_BASE), anatomy.name, "group");
  const item = factorClasses(anatomy, "item", { states: itemStates }, ITEM_BASE);
  const dot = factorClasses(anatomy, "indicator", { states: dotStates }, ["block"]);
  return { group, item, dot };
}

export function renderRadioGroup(anatomy: Anatomy): string {
  const { group, item, dot } = radioParts(anatomy, ITEM_STATES, BASE_UI_STATES);
  const def = JSON.stringify(anatomy.axes.size?.default ?? "md");
  return `import * as React from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("radioGroupItemVariants", item)}

${cvaSource("radioGroupDotVariants", dot)}

function RadioGroup({ className, ...props }: Omit<React.ComponentProps<typeof RadioGroupPrimitive>, "className"> & { className?: string }) {
  return <RadioGroupPrimitive data-slot="radio-group" className={cn(${classString(group)}, className)} {...props} />;
}

export type RadioGroupItemProps = Omit<React.ComponentProps<typeof RadioPrimitive.Root>, "className"> & {
  className?: string;
  size?: ${unionType(anatomy.axes.size?.enabled ?? [])};
};

function RadioGroupItem({ className, size = ${def}, ...props }: RadioGroupItemProps) {
  return (
    <RadioPrimitive.Root data-slot="radio-group-item" data-size={size} className={cn(radioGroupItemVariants({ size }), className)} {...props}>
      <RadioPrimitive.Indicator data-slot="radio-group-indicator" className="${INDICATOR_WRAP}">
        <span className={radioGroupDotVariants({ size })} />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem, radioGroupItemVariants };
export type RadioGroupItemVariants = VariantProps<typeof radioGroupItemVariants>;
`;
}
