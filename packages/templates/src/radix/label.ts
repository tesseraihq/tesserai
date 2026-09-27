import { type Anatomy } from "@tesserai/core";
import { labelPieces } from "../base-ui/label";
import { classString } from "../codegen";

export function renderLabel(anatomy: Anatomy): string {
  const { slots } = labelPieces(anatomy);
  return `import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root data-slot="label" className={cn(${classString(slots.label)}, className)} {...props} />;
}

export { Label };
`;
}
