import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES } from "../classes";
import { classString, cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";

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

export function renderCheckbox(anatomy: Anatomy): string {
  const root = factorClasses(anatomy, "root", { states: BASE_UI_STATES }, ROOT_BASE);
  const indicator = factorClasses(anatomy, "indicator", { states: BASE_UI_STATES }, INDICATOR_BASE);

  return `import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${cvaSource("checkboxVariants", root)}

const indicatorClassName = ${classString(indicator.base)};

export type CheckboxProps = Omit<React.ComponentProps<typeof BaseCheckbox.Root>, "className"> & {
  className?: string;
  size?: ${unionType(anatomy.axes.size?.enabled ?? [])};
};

function Checkbox({ className, size = ${JSON.stringify(anatomy.axes.size?.default ?? "md")}, ...props }: CheckboxProps) {
  return (
    <BaseCheckbox.Root
      data-slot="checkbox"
      data-size={size}
      className={cn(checkboxVariants({ size }), className)}
      {...props}
    >
      <BaseCheckbox.Indicator data-slot="checkbox-indicator" className={indicatorClassName}>
        {/* Indeterminate shows a dash rather than a check. */}
        <CheckIcon aria-hidden="true" className="in-data-indeterminate:hidden" />
        <MinusIcon aria-hidden="true" className="hidden in-data-indeterminate:block" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}

export { Checkbox, checkboxVariants };
export type CheckboxVariants = VariantProps<typeof checkboxVariants>;
`;
}
