import { type Anatomy } from "@tesserai/core";
import { classString, cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";
import { groupStates, RAC_STATES } from "./states";

// React Aria's Checkbox is a <label> around a visually hidden input, so the visible box is a child
// styled from the label's state through group-data-* classes, and children become the label text.
const BOX_STATES = groupStates(RAC_STATES);

const BOX_BASE = ["inline-flex", "shrink-0", "items-center", "justify-center", "transition-[color,background-color,border-color,box-shadow]"];

const INDICATOR_BASE = ["flex", "items-center", "justify-center", "text-current", "[&_svg]:size-[80%]"];

export function renderCheckbox(anatomy: Anatomy): string {
  const root = factorClasses(anatomy, "root", { states: BOX_STATES }, BOX_BASE);
  const indicator = factorClasses(anatomy, "indicator", { states: BOX_STATES }, INDICATOR_BASE);

  return `import * as React from "react";
import { Checkbox as AriaCheckbox, composeRenderProps, type CheckboxProps as AriaCheckboxProps } from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${cvaSource("checkboxVariants", root)}

const indicatorClassName = ${classString(indicator.base)};

export type CheckboxProps = AriaCheckboxProps & {
  size?: ${unionType(anatomy.axes.size?.enabled ?? [])};
};

function Checkbox({ className, children, size = ${JSON.stringify(anatomy.axes.size?.default ?? "md")}, ...props }: CheckboxProps) {
  return (
    <AriaCheckbox
      className={composeRenderProps(className, (className) => cn("group inline-flex items-center gap-2", className))}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, isIndeterminate }) => (
        <>
          <span data-slot="checkbox" data-size={size} className={checkboxVariants({ size })}>
            {isSelected || isIndeterminate ? (
              <span data-slot="checkbox-indicator" className={indicatorClassName}>
                {isIndeterminate ? <MinusIcon aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}
              </span>
            ) : null}
          </span>
          {children}
        </>
      ))}
    </AriaCheckbox>
  );
}

export { Checkbox, checkboxVariants };
export type CheckboxVariants = VariantProps<typeof checkboxVariants>;
`;
}
