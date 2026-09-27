import { type Anatomy } from "@tesserai/core";
import { LABEL_BASE, LABEL_STATES } from "../base-ui/label";
import { classString } from "../codegen";
import { flatClasses } from "../factor";

// A label given htmlFor outside a React Aria field must not be claimed by an enclosing field's
// context, so it is rendered with the label context cleared (as shadcn's React Aria label does).
export function renderLabel(anatomy: Anatomy): string {
  const root = flatClasses(anatomy, "root", { states: LABEL_STATES }, LABEL_BASE);
  return `import * as React from "react";
import { LabelContext, Label as LabelPrimitive, type LabelProps } from "react-aria-components";
import { cn } from "@/lib/utils";

function Label({ className, htmlFor, slot, ...props }: LabelProps) {
  const label = <LabelPrimitive data-slot="label" className={cn(${classString(root)}, className)} {...props} htmlFor={htmlFor} slot={slot} />;
  if (htmlFor !== undefined && slot === undefined) return <LabelContext.Provider value={null}>{label}</LabelContext.Provider>;
  return label;
}

export { Label };
`;
}
