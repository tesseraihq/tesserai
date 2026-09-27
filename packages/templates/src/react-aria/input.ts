import { type Anatomy } from "@tesserai/core";
import { type StatePrefixes } from "../classes";
import { cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";
import { RAC_STATES } from "./states";

// React Aria's Input sets data-invalid from aria-invalid (or its TextField) and data-disabled from
// disabled; read-only stays the native pseudo-class.
const INPUT_STATES: StatePrefixes = { ...RAC_STATES, "read-only": ["read-only:"] };

// type="file" shows its button as plain text in the field, as in shadcn.
const ROOT_BASE = ["flex", "w-full", "min-w-0", "outline-none", "transition-[color,background-color,border-color,box-shadow]", "file:inline-flex", "file:h-full", "file:border-0", "file:bg-transparent", "file:font-medium", "file:text-current"];

export function renderInput(anatomy: Anatomy): string {
  const root = factorClasses(anatomy, "root", { states: INPUT_STATES }, ROOT_BASE);
  const placeholder = factorClasses(anatomy, "placeholder", { states: INPUT_STATES, prefix: "placeholder:" });
  root.base.push(...placeholder.base);

  return `import * as React from "react";
import { Input as AriaInput, composeRenderProps, type InputProps as AriaInputProps } from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("inputVariants", root)}

// The native size attribute (a character count) is replaced by the design system's size axis.
// Use inside a React Aria TextField for labels, descriptions and validation.
export type InputProps = Omit<AriaInputProps, "size"> & {
  size?: ${unionType(anatomy.axes.size?.enabled ?? [])};
};

function Input({ className, size = ${JSON.stringify(anatomy.axes.size?.default ?? "md")}, ...props }: InputProps) {
  return (
    <AriaInput
      data-slot="input"
      data-size={size}
      className={composeRenderProps(className, (className) => cn(inputVariants({ size }), className))}
      {...props}
    />
  );
}

export { Input, inputVariants };
export type InputVariants = VariantProps<typeof inputVariants>;
`;
}
