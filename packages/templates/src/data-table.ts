import type { Anatomy, Base } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

// DataTable's classes, which every framework's shell prints from: the space around the system's
// Table (a filter above, a footer with the count and pages below), the empty row's cell, and the
// parts' fixed classes. The Buttons, Input, Checkboxes and Table are the system's own.
export function dataTablePieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const c = (part: string, extra: string[] = []) => flatClasses(anatomy, part, { states }, extra);
  return {
    slots: {
      "data-table": c("root", ["flex", "flex-col"]),
      "data-table-toolbar": c("toolbar", ["flex", "items-center"]),
      "data-table-footer": c("footer", ["flex", "items-center", "justify-between"]),
      // The one cell of the row that says there's nothing to show.
      "data-table:empty": c("empty", ["text-center"]),
      "data-table:filter": ["max-w-sm"],
      "data-table:pages": ["flex", "gap-2"],
      // A column's header that sorts it: a small ghost Button, pulled in to line up with the cells.
      // The Button is never wider than its cell (max-w-full); pulled in, it has the cell plus the
      // pull, so a header is shortened only when the column is narrower than it.
      "data-table:sort": ["-ms-3", "max-w-[calc(100%_+_var(--spacing)*3)]", "h-8"],
    },
    // The Buttons and Checkboxes it draws.
    pageButton: { variant: "outline", size: "sm" },
    sortButton: { variant: "ghost", size: "sm" },
    checkboxSize: "sm",
    defaults: { filterPlaceholder: "Filter…", pageSize: 10, empty: "No results." },
  };
}

// DataTable, shadcn's data table guide as a component: TanStack Table (v8) rendered with the
// system's Table, Button, Input and Checkbox. Columns sort from their header, one column can be
// filtered, rows can be selected, and it pages.
export function dataTableTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots } = dataTablePieces(anatomy);
    const c = (part: string, extra: string[] = []) => classString(flatClasses(anatomy, part, { states: NATIVE_STATES }, extra));
    const s = (slot: keyof typeof slots) => classString(slots[slot]);
    const aria = base === "react-aria";
    const header = aria
      ? `<TableHeader>
          {table.getHeaderGroups()[0]?.headers.map((header, i) => (
            <TableHead key={header.id} id={header.id} {...(i === (selectable ? 1 : 0) ? { isRowHeader: true } : {})}>
              {header.column.id === "select" ? <Checkbox slot="selection" size="sm" /> : header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableHeader>`
      : `<TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>`;
    const body = aria
      ? `<TableBody renderEmptyState={() => <div className=${c("empty", ["flex", "items-center", "justify-center"])}>{empty}</div>}>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} id={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{cell.column.id === "select" ? <Checkbox slot="selection" size="sm" /> : flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>`
      : `<TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={table.getAllColumns().length} className=${s("data-table:empty")}>
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>`;
    // React Aria's table owns selection; the others use TanStack's, with a checkbox column.
    const selectColumn = aria
      ? `const selectColumn: ColumnDef<TData, TValue> = { id: "select", enableSorting: false, header: () => null, cell: () => null };`
      : `const selectColumn: ColumnDef<TData, TValue> = {
    id: "select",
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        size="sm"
        aria-label="Select all"
        ${base === "radix" ? `checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}` : `checked={table.getIsAllPageRowsSelected()}\n        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}`}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
      />
    ),
    cell: ({ row }) => <Checkbox size="sm" aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(value === true)} />,
  };`;
    const tableProps = aria
      ? ` aria-label={label} selectionMode={selectable ? "multiple" : "none"} selectedKeys={new Set(Object.keys(rowSelection).filter((k) => rowSelection[k]))} onSelectionChange={(keys) => setRowSelection(keys === "all" ? Object.fromEntries(table.getRowModel().rows.map((r) => [r.id, true])) : Object.fromEntries([...keys].map((k) => [String(k), true])))}`
      : ` aria-label={label}`;

    return `import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // Names the table for assistive technology.
  label: string;
  // A column to filter from a search field above the table.
  filterColumn?: string;
  filterPlaceholder?: string;
  selectable?: boolean;
  pageSize?: number;
  empty?: React.ReactNode;
  className?: string;
};

function DataTable<TData, TValue>({
  columns,
  data,
  label,
  filterColumn,
  filterPlaceholder = "Filter…",
  selectable = false,
  pageSize = 10,
  empty = "No results.",
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  ${selectColumn}
  const table = useReactTable({
    data,
    columns: selectable ? [selectColumn, ...columns] : columns,
    state: { sorting, columnFilters, rowSelection },
    initialState: { pagination: { pageSize } },
    enableRowSelection: selectable,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const filter = filterColumn === undefined ? undefined : table.getColumn(filterColumn);

  return (
    <div data-slot="data-table" className={cn(${s("data-table")}, className)}>
      {filter ? (
        <div data-slot="data-table-toolbar" className=${s("data-table-toolbar")}>
          <Input
            placeholder={filterPlaceholder}
            aria-label={filterPlaceholder}
            value={(filter.getFilterValue() as string | undefined) ?? ""}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => filter.setFilterValue(event.target.value)}
            className=${s("data-table:filter")}
          />
        </div>
      ) : null}
      <Table${tableProps}>
        ${header}
        ${body}
      </Table>
      <div data-slot="data-table-footer" className=${s("data-table-footer")}>
        <span>
          {selectable
            ? \`\${table.getFilteredSelectedRowModel().rows.length} of \${table.getFilteredRowModel().rows.length} selected\`
            : \`Page \${table.getState().pagination.pageIndex + 1} of \${Math.max(1, table.getPageCount())}\`}
        </span>
        <div className=${s("data-table:pages")}>
          <Button variant="outline" size="sm" ${aria ? "onPress" : "onClick"}={() => table.previousPage()} ${aria ? "isDisabled" : "disabled"}={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" ${aria ? "onPress" : "onClick"}={() => table.nextPage()} ${aria ? "isDisabled" : "disabled"}={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

// A header that sorts its column: ascending, descending, then back to unsorted.
function DataTableColumnHeader<TData, TValue>({ column, title, className }: { column: Column<TData, TValue>; title: string; className?: string }) {
  if (!column.getCanSort()) return <span className={className}>{title}</span>;
  const sorted = column.getIsSorted();
  return (
    <Button variant="ghost" size="sm" className={cn(${s("data-table:sort")}, className)} ${aria ? "onPress" : "onClick"}={() => column.toggleSorting(sorted === "asc")} aria-label={\`Sort by \${title}\`}>
      {title}
      {sorted === "desc" ? <ArrowDownIcon /> : sorted === "asc" ? <ArrowUpIcon /> : <ChevronsUpDownIcon />}
    </Button>
  );
}

export { DataTable, DataTableColumnHeader };
`;
  };
}
