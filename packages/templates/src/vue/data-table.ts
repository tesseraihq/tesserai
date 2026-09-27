import type { Anatomy } from "@tesserai/core";
import { q } from "../codegen";
import { dataTablePieces } from "../data-table";
import { LUCIDE_PACKAGES } from "../icons";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, staticClasses } from "./sfc";

// DataTable on TanStack Table 9's Vue adapter (@tanstack/vue-table, as shadcn-vue uses), drawn with
// the system's Table, Button, Input and Checkbox: the same parts, markup and classes as the React
// file. A column's header and cell render through FlexRender: a string, or a function returning
// h(…). Columns are typed with the table's features: ColumnDef<DataTableFeatures, Payment>.
export function renderDataTable(anatomy: Anatomy): GeneratedFile[] {
  const { slots, pageButton, sortButton, checkboxSize, defaults } = dataTablePieces(anatomy);
  const f = folder("data-table");

  const index = `import type { ColumnDef, RowData } from "@tanstack/vue-table";
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_equals,
  filterFn_includesString,
  filterFn_inNumberRange,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/vue-table";

// What DataTable's table does: sort, filter a column, select rows and page. TanStack Table 9 leaves
// out what isn't named here, and a column's "auto" sort and filter use the functions named here.
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString, inNumberRange: filterFn_inNumberRange, equals: filterFn_equals, arrIncludes: filterFn_arrIncludes },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime, basic: sortFn_basic },
});
export type DataTableFeatures = typeof dataTableFeatures;
// A column of a DataTable of TData rows. Its value type defaults to any, so a column of numbers and
// one of strings share a list (a column is invariant in it; unknown refuses both). Spelled through
// JSON.parse, so no lint directive has to name a typescript-eslint rule the project may not load
// (ESLint fails a file on that).
type AnyValue = ReturnType<typeof JSON.parse>;
export type DataTableColumn<TData extends RowData, TValue = AnyValue> = ColumnDef<DataTableFeatures, TData, TValue>;`;

  const table = f.file(
    "DataTable",
    `import type { RowData } from "@tanstack/vue-table";
import type { HTMLAttributes } from "vue";
import type { DataTableColumn } from ".";
import { FlexRender, useTable } from "@tanstack/vue-table";
import { computed, h } from "vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dataTableFeatures } from ".";

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn<TData>[];
    data: TData[];
    // Names the table for assistive technology.
    label: string;
    // A column to filter from a search field above the table.
    filterColumn?: string;
    filterPlaceholder?: string;
    selectable?: boolean;
    pageSize?: number;
    // What an empty table says (or the #empty slot).
    empty?: string;
    class?: HTMLAttributes["class"];
  }>(),
  { filterColumn: undefined, filterPlaceholder: ${q(defaults.filterPlaceholder)}, selectable: false, pageSize: ${defaults.pageSize}, empty: ${q(defaults.empty)} },
);

const selectColumn: DataTableColumn<TData> = {
  id: "select",
  enableSorting: false,
  header: ({ table }) =>
    h(Checkbox, {
      size: ${q(checkboxSize)},
      "aria-label": "Select all",
      modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate"),
      "onUpdate:modelValue": (value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(value === true),
    }),
  cell: ({ row }) =>
    h(Checkbox, {
      size: ${q(checkboxSize)},
      "aria-label": "Select row",
      modelValue: row.getIsSelected(),
      "onUpdate:modelValue": (value: boolean | "indeterminate") => row.toggleSelected(value === true),
    }),
};

const table = useTable({
  features: dataTableFeatures,
  // Getters: the table reads them again when the props change.
  get data() {
    return props.data;
  },
  get columns() {
    return props.selectable ? [selectColumn, ...props.columns] : props.columns;
  },
  initialState: { pagination: { pageIndex: 0, pageSize: props.pageSize } },
  get enableRowSelection() {
    return props.selectable;
  },
});
const filter = computed(() => (props.filterColumn === undefined ? undefined : table.getColumn(props.filterColumn)));`,
    `<div data-slot="data-table" :class="cn(${classList(slots["data-table"])}, props.class)">
  <div v-if="filter" data-slot="data-table-toolbar" ${staticClasses(slots["data-table-toolbar"])}>
    <Input
      :placeholder="filterPlaceholder"
      :aria-label="filterPlaceholder"
      :model-value="(filter.getFilterValue() as string | undefined) ?? ''"
      ${staticClasses(slots["data-table:filter"])}
      @update:model-value="(value) => filter?.setFilterValue(value)"
    />
  </div>
  <Table :aria-label="label">
    <TableHeader>
      <TableRow v-for="group in table.getHeaderGroups()" :key="group.id">
        <TableHead v-for="header in group.headers" :key="header.id">
          <FlexRender v-if="!header.isPlaceholder" :header="header" />
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <template v-if="table.getRowModel().rows.length">
        <TableRow v-for="row in table.getRowModel().rows" :key="row.id" :data-state="row.getIsSelected() ? 'selected' : undefined">
          <TableCell v-for="cell in row.getAllCells()" :key="cell.id">
            <FlexRender :cell="cell" />
          </TableCell>
        </TableRow>
      </template>
      <TableRow v-else>
        <TableCell :colspan="table.getAllColumns().length" ${staticClasses(slots["data-table:empty"])}>
          <slot name="empty">{{ empty }}</slot>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
  <div data-slot="data-table-footer" ${staticClasses(slots["data-table-footer"])}>
    <span>
      {{
        selectable
          ? \`\${table.getFilteredSelectedRowModel().rows.length} of \${table.getFilteredRowModel().rows.length} selected\`
          : \`Page \${table.atoms.pagination.get().pageIndex + 1} of \${Math.max(1, table.getPageCount())}\`
      }}
    </span>
    <div ${staticClasses(slots["data-table:pages"])}>
      <Button variant="${pageButton.variant}" size="${pageButton.size}" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">Previous</Button>
      <Button variant="${pageButton.variant}" size="${pageButton.size}" :disabled="!table.getCanNextPage()" @click="table.nextPage()">Next</Button>
    </div>
  </div>
</div>`,
  );

  // A header that sorts its column: ascending, descending, then back to unsorted.
  const header = f.file(
    "DataTableColumnHeader",
    `import type { HTMLAttributes } from "vue";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "${LUCIDE_PACKAGES.vue}";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// What the header needs of a column (any column of any table): whether and how it sorts, and a
// way to change it.
type SortableColumn = { getCanSort: () => boolean; getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void };

const props = defineProps<{ column: SortableColumn; title: string; class?: HTMLAttributes["class"] }>();`,
    `<span v-if="!column.getCanSort()" :class="props.class">{{ title }}</span>
<Button
  v-else
  variant="${sortButton.variant}"
  size="${sortButton.size}"
  :class="cn(${classList(slots["data-table:sort"])}, props.class)"
  :aria-label="\`Sort by \${title}\`"
  @click="column.toggleSorting(column.getIsSorted() === 'asc')"
>
  {{ title }}
  <ArrowDownIcon v-if="column.getIsSorted() === 'desc'" />
  <ArrowUpIcon v-else-if="column.getIsSorted() === 'asc'" />
  <ChevronsUpDownIcon v-else />
</Button>`,
  );
  // Generic over its rows, as the React component is.
  const generic = (file: GeneratedFile, params: string): GeneratedFile => ({ ...file, source: file.source.replace(`<script setup lang="ts">`, `<script setup lang="ts" generic="${params}">`) });
  return [generic(table, "TData extends RowData"), header, barrel("data-table", ["DataTable", "DataTableColumnHeader"], index)];
}
