import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES, NATIVE_STATES, type StatePrefixes } from "../classes";
import { cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";

// Base UI's Input renders a native <input>: native pseudo-classes work and, inside a Field, the
// data attributes appear too. Both are emitted so either way of marking invalid styles the same.
const INPUT_STATES: StatePrefixes = {
  ...NATIVE_STATES,
  invalid: ["aria-invalid:", "data-invalid:"],
  disabled: ["disabled:", "data-disabled:"],
  "read-only": ["read-only:", "data-readonly:"],
};

// type="file" shows its button as plain text in the field, as in shadcn.
const ROOT_BASE = ["flex", "w-full", "min-w-0", "outline-none", "transition-[color,background-color,border-color,box-shadow]", "file:inline-flex", "file:h-full", "file:border-0", "file:bg-transparent", "file:font-medium", "file:text-current"];

export function renderInput(anatomy: Anatomy): string {
  const root = factorClasses(anatomy, "root", { states: INPUT_STATES }, ROOT_BASE);
  const placeholder = factorClasses(anatomy, "placeholder", { states: BASE_UI_STATES, prefix: "placeholder:" });
  root.base.push(...placeholder.base);

  return `import * as React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("inputVariants", root)}

// The native size attribute (a character count) is replaced by the design system's size axis.
export type InputProps = Omit<React.ComponentProps<typeof BaseInput>, "className" | "size"> & {
  className?: string;
  size?: ${unionType(anatomy.axes.size?.enabled ?? [])};
};

function Input({ className, size = ${JSON.stringify(anatomy.axes.size?.default ?? "md")}, ...props }: InputProps) {
  return (
    <BaseInput
      data-slot="input"
      data-size={size}
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
export type InputVariants = VariantProps<typeof inputVariants>;
`;
}
