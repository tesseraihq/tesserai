import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES, NATIVE_STATES, type StatePrefixes } from "../classes";
import { classString } from "../codegen";
import { flatClasses } from "../factor";

// A plain <textarea> on Base UI and Radix, as in shadcn; inside a Base UI Field the data
// attributes appear too, so both ways of marking state are emitted.
export const TEXTAREA_STATES: StatePrefixes = {
  ...NATIVE_STATES,
  invalid: ["aria-invalid:", "data-invalid:"],
  disabled: ["disabled:", "data-disabled:"],
  "read-only": ["read-only:", "data-readonly:"],
};

export const TEXTAREA_BASE = ["flex", "field-sizing-content", "w-full", "min-w-0", "outline-none", "transition-[color,background-color,border-color,box-shadow]"];

export function textareaClasses(anatomy: Anatomy, states: StatePrefixes = TEXTAREA_STATES): string[] {
  return [...flatClasses(anatomy, "root", { states }, TEXTAREA_BASE), ...flatClasses(anatomy, "placeholder", { states: BASE_UI_STATES, prefix: "placeholder:" })];
}

// Textarea's classes, which every framework's shell prints from.
export function textareaPieces(anatomy: Anatomy, states: StatePrefixes = TEXTAREA_STATES) {
  return { slots: { textarea: textareaClasses(anatomy, states) } };
}

export function renderTextarea(anatomy: Anatomy): string {
  const { slots } = textareaPieces(anatomy);
  return `import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(${classString(slots.textarea)}, className)} {...props} />;
}

export { Textarea };
`;
}
