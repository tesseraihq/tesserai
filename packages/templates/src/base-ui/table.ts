import { type Anatomy } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "../classes";
import { classString } from "../codegen";
import { flatClasses } from "../factor";

// A selected row is marked with data-selected (the selected prop) or data-state="selected", as in
// shadcn's data-table examples.
const ROW_STATES: StatePrefixes = { ...NATIVE_STATES, selected: ["data-selected:", "data-[state=selected]:"] };

// A checkbox column hugs its checkbox.
const CHECKBOX_CELL = "[&:has([role=checkbox])]:pe-0";

// Table's classes, the same on Base UI and Radix, which every framework's shell prints from. The
// table sits in a focusable scroll container.
export function tablePieces(anatomy: Anatomy, states: StatePrefixes = ROW_STATES) {
  const opts = { states };
  return {
    slots: {
      "table-container": ["relative", "w-full", "overflow-x-auto", "outline-none", "focus-visible:ring-(length:--focus-width)", "focus-visible:ring-primary-focus-ring"],
      table: flatClasses(anatomy, "root", opts, ["w-full", "caption-bottom", "border-collapse"]),
      // Header rows are not data rows: no hover highlight.
      "table-header": flatClasses(anatomy, "header", opts, ["[&_tr]:hover:bg-transparent"]),
      "table-body": ["[&_tr:last-child]:border-0"],
      // The footer's border runs along its top, under the last row.
      "table-footer": flatClasses(anatomy, "footer", opts, ["[&>tr]:last:border-b-0"]).map((c) => c.replace(/^border-\(length:/, "border-t-(length:")),
      "table-row": flatClasses(anatomy, "row", { ...opts, borderSides: "bottom" }, ["transition-colors"]),
      "table-head": flatClasses(anatomy, "head-cell", opts, ["text-start", "align-middle", "whitespace-nowrap", CHECKBOX_CELL]),
      "table-cell": flatClasses(anatomy, "cell", opts, ["align-middle", "whitespace-nowrap", CHECKBOX_CELL]),
      "table-caption": flatClasses(anatomy, "caption", opts, []),
    },
  };
}

export function renderTable(anatomy: Anatomy): string {
  const { slots } = tablePieces(anatomy);

  const part = (name: string, tag: string, slot: keyof typeof slots, extra = "") =>
    `function ${name}({ className, ${extra ? `${extra}, ` : ""}...props }: React.ComponentProps<"${tag}">${extra ? ` & { ${extra}?: boolean }` : ""}) {
  return <${tag} data-slot=${JSON.stringify(slot)}${extra ? ` data-${extra}={${extra} ? "" : undefined}` : ""} className={cn(${classString(slots[slot])}, className)} {...props} />;
}`;

  return `import * as React from "react";
import { cn } from "@/lib/utils";

// The scroll container is focusable so a wide table can be scrolled from the keyboard (axe: scrollable-region-focusable).
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" tabIndex={0} className=${classString(slots["table-container"])}>
      <table data-slot="table" className={cn(${classString(slots.table)}, className)} {...props} />
    </div>
  );
}

${part("TableHeader", "thead", "table-header")}

${part("TableBody", "tbody", "table-body")}

${part("TableFooter", "tfoot", "table-footer")}

${part("TableRow", "tr", "table-row", "selected")}

${part("TableHead", "th", "table-head")}

${part("TableCell", "td", "table-cell")}

${part("TableCaption", "caption", "table-caption")}

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption };
`;
}
