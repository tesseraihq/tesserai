import type { Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { flatClasses } from "../factor";
import { RAC_STATES } from "./states";

// React Aria's Table, as in shadcn: rows are keyboard-navigable and can be selected
// (selectionMode, with <Checkbox slot="selection" /> in a cell) and sorted. Every table needs one
// column marked isRowHeader and an aria-label.
export function renderAriaTable(anatomy: Anatomy): string {
  const opts = { states: RAC_STATES };
  const root = flatClasses(anatomy, "root", opts, ["w-full", "caption-bottom", "border-collapse", "outline-none"]);
  const rowBorder = flatClasses(anatomy, "row", { states: RAC_STATES, borderSides: "bottom" }).filter((c) => c.startsWith("border-"));
  // React Aria draws the header's row itself, so the header gives it the rows' bottom border.
  const header = flatClasses(anatomy, "header", opts, rowBorder.map((c) => `[&>tr]:${c}`));
  const row = flatClasses(anatomy, "row", { ...opts, borderSides: "bottom" }, ["transition-colors", "outline-none", "data-focus-visible:ring-(length:--focus-width)", "data-focus-visible:ring-inset", "data-focus-visible:ring-primary-focus-ring"]);
  const head = flatClasses(anatomy, "head-cell", opts, ["text-start", "align-middle", "whitespace-nowrap", "outline-none", "[&:has([data-slot=checkbox])]:pe-0"]);
  const cell = flatClasses(anatomy, "cell", opts, ["align-middle", "whitespace-nowrap", "outline-none", "[&:has([data-slot=checkbox])]:pe-0"]);
  const footer = flatClasses(anatomy, "footer", opts, ["[&>tr]:last:border-b-0"]).map((c) => c.replace(/^border-\(length:/, "border-t-(length:"));
  const caption = flatClasses(anatomy, "caption", opts, ["text-center"]);

  return `import * as React from "react";
import {
  Cell as CellPrimitive,
  Column as ColumnPrimitive,
  Row as RowPrimitive,
  Table as TablePrimitive,
  TableBody as TableBodyPrimitive,
  TableFooter as TableFooterPrimitive,
  TableHeader as TableHeaderPrimitive,
  composeRenderProps,
  type CellProps,
  type ColumnProps,
  type RowProps,
  type TableBodyProps,
  type TableFooterProps,
  type TableHeaderProps,
  type TableProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: TableProps) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <TablePrimitive data-slot="table" className={composeRenderProps(className, (className) => cn(${classString(root)}, className))} {...props} />
    </div>
  );
}

function TableHeader<T extends object>({ className, ...props }: TableHeaderProps<T>) {
  return <TableHeaderPrimitive data-slot="table-header" className={composeRenderProps(className, (className) => cn(${classString(header)}, className))} {...props} />;
}

function TableBody<T extends object>({ className, ...props }: TableBodyProps<T>) {
  return (
    <TableBodyPrimitive data-slot="table-body" className={composeRenderProps(className, (className) => cn("[&_tr:last-child]:border-0 data-empty:h-24 data-empty:text-center", className))} {...props} />
  );
}

function TableFooter<T extends object>({ className, ...props }: TableFooterProps<T>) {
  return <TableFooterPrimitive data-slot="table-footer" className={cn(${classString(footer)}, className)} {...props} />;
}

function TableRow<T extends object>({ className, ...props }: RowProps<T>) {
  return <RowPrimitive data-slot="table-row" className={composeRenderProps(className, (className) => cn(${classString(row)}, className))} {...props} />;
}

function TableHead({ className, ...props }: ColumnProps) {
  return <ColumnPrimitive data-slot="table-head" className={composeRenderProps(className, (className) => cn(${classString(head)}, className))} {...props} />;
}

function TableCell({ className, ...props }: CellProps) {
  return <CellPrimitive data-slot="table-cell" className={composeRenderProps(className, (className) => cn(${classString(cell)}, className))} {...props} />;
}

function TableCaption({ className, ...props }: React.ComponentProps<"figcaption">) {
  return <figcaption data-slot="table-caption" className={cn(${classString(caption)}, className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
`;
}
