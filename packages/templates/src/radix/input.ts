import { type Anatomy } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "../classes";
import { cvaSource, unionType } from "../codegen";
import { factorClasses } from "../factor";

// type="file" shows its button as plain text in the field, as in shadcn.
const ROOT_BASE = ["flex", "w-full", "min-w-0", "outline-none", "transition-[color,background-color,border-color,box-shadow]", "file:inline-flex", "file:h-full", "file:border-0", "file:bg-transparent", "file:font-medium", "file:text-current"];

// Input's classes (the placeholder's ride on the input) and sizes, which every framework's shell prints from.
export function inputPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const root = factorClasses(anatomy, "root", { states }, ROOT_BASE);
  const placeholder = factorClasses(anatomy, "placeholder", { states, prefix: "placeholder:" });
  root.base.push(...placeholder.base);
  return { slots: { input: root }, sizes: [...(anatomy.axes.size?.enabled ?? [])], defaultSize: anatomy.axes.size?.default ?? "md" };
}

// A native input; states are the native pseudo-classes and aria-invalid.
export function renderInput(anatomy: Anatomy): string {
  const { slots, sizes, defaultSize } = inputPieces(anatomy);

  return `import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("inputVariants", slots.input)}

// The native size attribute (a character count) is replaced by the design system's size axis.
export type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: ${unionType(sizes)};
};

function Input({ className, size = ${JSON.stringify(defaultSize)}, ...props }: InputProps) {
  return <input data-slot="input" data-size={size} className={cn(inputVariants({ size }), className)} {...props} />;
}

export { Input, inputVariants };
export type InputVariants = VariantProps<typeof inputVariants>;
`;
}
