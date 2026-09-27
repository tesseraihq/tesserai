import { type Anatomy } from "@tesserai/core";
import { type StatePrefixes } from "../classes";
import { classString, cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";
import { RADIX_STATES } from "./states";

const ROOT_BASE = [
  "peer",
  "inline-flex",
  "shrink-0",
  "items-center",
  "justify-center",
  "outline-none",
  "transition-[color,background-color,border-color,box-shadow]",
  // A larger, invisible hit area around the box, as in shadcn.
  "relative",
  "after:absolute",
  "after:-inset-x-3",
  "after:-inset-y-2",
];

const INDICATOR_BASE = ["flex", "items-center", "justify-center", "text-current", "[&_svg]:size-[80%]"];

// Checkbox's classes and sizes, which every framework's shell prints from. The indicator holds a
// check and a dash; the one showing depends on the indeterminate state.
export function checkboxPieces(anatomy: Anatomy, states: StatePrefixes = RADIX_STATES) {
  const indicator = factorClasses(anatomy, "indicator", { states }, INDICATOR_BASE);
  return {
    slots: {
      checkbox: factorClasses(anatomy, "root", { states }, ROOT_BASE),
      // The indicator is one class string: only what every size shares.
      "checkbox-indicator": indicator.base,
      "checkbox-indicator:check": ["in-data-[state=indeterminate]:hidden"],
      "checkbox-indicator:dash": ["hidden", "in-data-[state=indeterminate]:block"],
    },
    sizes: [...(anatomy.axes.size?.enabled ?? [])],
    defaultSize: anatomy.axes.size?.default ?? "md",
  };
}

export function renderCheckbox(anatomy: Anatomy): string {
  const { slots, sizes, defaultSize } = checkboxPieces(anatomy);

  return `import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${cvaSource("checkboxVariants", slots.checkbox)}

const indicatorClassName = ${classString(slots["checkbox-indicator"])};

export type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  size?: ${unionType(sizes)};
};

function Checkbox({ className, size = ${JSON.stringify(defaultSize)}, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" data-size={size} className={cn(checkboxVariants({ size }), className)} {...props}>
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className={indicatorClassName}>
        {/* Indeterminate shows a dash rather than a check. */}
        <CheckIcon aria-hidden="true" className=${classString(slots["checkbox-indicator:check"])} />
        <MinusIcon aria-hidden="true" className=${classString(slots["checkbox-indicator:dash"])} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox, checkboxVariants };
export type CheckboxVariants = VariantProps<typeof checkboxVariants>;
`;
}
