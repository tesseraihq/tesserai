import { type Anatomy } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "../classes";
import { classString } from "../codegen";
import { flatClasses } from "../factor";

// A label dims with its control: the control before it (peer) or the group around it.
export const LABEL_STATES: StatePrefixes = { ...NATIVE_STATES, disabled: ["peer-disabled:", "group-data-[disabled=true]:"] };
export const LABEL_BASE = ["flex", "items-center", "select-none", "group-data-[disabled=true]:pointer-events-none", "peer-disabled:cursor-not-allowed"];

// Label's classes, the same on every library, which every framework's shell prints from.
export function labelPieces(anatomy: Anatomy, states: StatePrefixes = LABEL_STATES) {
  return { slots: { label: flatClasses(anatomy, "root", { states }, LABEL_BASE) } };
}

// Base UI has no label part of its own; shadcn's Base UI label is a plain <label>.
export function renderLabel(anatomy: Anatomy): string {
  const { slots } = labelPieces(anatomy);
  return `import * as React from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn(${classString(slots.label)}, className)} {...props} />;
}

export { Label };
`;
}
