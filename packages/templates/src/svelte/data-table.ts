import type { Anatomy } from "@tesserai/core";
import { q } from "../codegen";
import { dataTablePieces } from "../data-table";
import type { GeneratedFile } from "../render";
import { attributesOf } from "./elements";
import { lucideImport, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";

// DataTable on @tanstack/table-core 8 with shadcn-svelte's data-table helpers (createSvelteTable,
// FlexRender, renderComponent and renderSnippet, as its registry item ships them), drawn with the
// system's Table, Button, Input and Checkbox: the same parts, markup and classes as the React file.
// A column's header or cell is a string, or renderComponent / renderSnippet.
export function dataTableFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, pageButton, sortButton, checkboxSize, defaults } = dataTablePieces(anatomy);
  const div = attributesOf("div");

  const root = svelteFile("data-table/data-table-root.svelte", {
    script: `import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type ColumnDef } from "@tanstack/table-core";
import type { Snippet } from "svelte";
${div.import}
${uiImport("button", ["Button"])}
${uiImport("checkbox", ["Checkbox"])}
${uiImport("input", ["Input"])}
import * as Table from "$UI$/table/index.js";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { createSvelteTable } from "./data-table.svelte.js";
import FlexRender from "./flex-render.svelte";
import { renderComponent } from "./render-helpers.js";

const classes = ${quoted(slots["data-table"])};
const toolbarClasses = ${quoted(slots["data-table-toolbar"])};
const footerClasses = ${quoted(slots["data-table-footer"])};
const filterClasses = ${quoted(slots["data-table:filter"])};
const pagesClasses = ${quoted(slots["data-table:pages"])};
const emptyClasses = ${quoted(slots["data-table:empty"])};

let {
  ref = $bindable(null),
  class: className,
  columns,
  data,
  label,
  filterColumn,
  filterPlaceholder = ${q(defaults.filterPlaceholder)},
  selectable = false,
  pageSize = ${defaults.pageSize},
  empty = ${q(defaults.empty)},
  ...restProps
}: Omit<WithElementRef<${div.type}>, "children"> & {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // Names the table for assistive technology.
  label: string;
  // A column to filter from a search field above the table.
  filterColumn?: string;
  filterPlaceholder?: string;
  selectable?: boolean;
  pageSize?: number;
  // What an empty table says.
  empty?: string | Snippet;
} = $props();

const selectColumn: ColumnDef<TData, TValue> = {
  id: "select",
  enableSorting: false,
  header: ({ table }) =>
    renderComponent(Checkbox, {
      size: ${q(checkboxSize)},
      "aria-label": "Select all",
      checked: table.getIsAllPageRowsSelected(),
      indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
      onCheckedChange: (value: boolean) => table.toggleAllPageRowsSelected(value),
    }),
  cell: ({ row }) =>
    renderComponent(Checkbox, {
      size: ${q(checkboxSize)},
      "aria-label": "Select row",
      checked: row.getIsSelected(),
      onCheckedChange: (value: boolean) => row.toggleSelected(value),
    }),
};

// Getters: the table reads them again when the props change. The page size is where it starts.
// svelte-ignore state_referenced_locally
const table = createSvelteTable({
  get data() {
    return data;
  },
  get columns() {
    return selectable ? [selectColumn, ...columns] : columns;
  },
  initialState: { pagination: { pageIndex: 0, pageSize } },
  get enableRowSelection() {
    return selectable;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});
const filter = $derived(filterColumn === undefined ? undefined : table.getColumn(filterColumn));`,
    markup: `<div bind:this={ref} data-slot="data-table" class={cn(classes, className)} {...restProps}>
  {#if filter}
    <div data-slot="data-table-toolbar" class={toolbarClasses}>
      <Input
        placeholder={filterPlaceholder}
        aria-label={filterPlaceholder}
        value={(filter.getFilterValue() as string | undefined) ?? ""}
        oninput={(event) => filter?.setFilterValue(event.currentTarget.value)}
        class={filterClasses}
      />
    </div>
  {/if}
  <Table.Root aria-label={label}>
    <Table.Header>
      {#each table.getHeaderGroups() as group (group.id)}
        <Table.Row>
          {#each group.headers as header (header.id)}
            <Table.Head>
              {#if !header.isPlaceholder}
                <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
              {/if}
            </Table.Head>
          {/each}
        </Table.Row>
      {/each}
    </Table.Header>
    <Table.Body>
      {#each table.getRowModel().rows as row (row.id)}
        <Table.Row data-state={row.getIsSelected() ? "selected" : undefined}>
          {#each row.getVisibleCells() as cell (cell.id)}
            <Table.Cell>
              <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
            </Table.Cell>
          {/each}
        </Table.Row>
      {:else}
        <Table.Row>
          <Table.Cell colspan={table.getAllColumns().length} class={emptyClasses}>
            {#if typeof empty === "string"}{empty}{:else}{@render empty()}{/if}
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
  <div data-slot="data-table-footer" class={footerClasses}>
    <span>
      {selectable
        ? \`\${table.getFilteredSelectedRowModel().rows.length} of \${table.getFilteredRowModel().rows.length} selected\`
        : \`Page \${table.getState().pagination.pageIndex + 1} of \${Math.max(1, table.getPageCount())}\`}
    </span>
    <div class={pagesClasses}>
      <Button variant="${pageButton.variant}" size="${pageButton.size}" onclick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
      <Button variant="${pageButton.variant}" size="${pageButton.size}" onclick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
    </div>
  </div>
</div>`,
  });

  // A header that sorts its column: ascending, descending, then back to unsorted.
  const header = svelteFile("data-table/data-table-column-header.svelte", {
    script: `${lucideImport("ArrowDownIcon")}
${lucideImport("ArrowUpIcon")}
${lucideImport("ChevronsUpDownIcon")}
${uiImport("button", ["Button"])}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["data-table:sort"])};

// What the header needs of a column (any column of any table): whether and how it sorts, and a
// way to change it.
type SortableColumn = { getCanSort: () => boolean; getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void };

let { column, title, class: className }: { column: SortableColumn; title: string; class?: string | undefined } = $props();

const sorted = $derived(column.getIsSorted());`,
    markup: `{#if !column.getCanSort()}
  <span class={className}>{title}</span>
{:else}
  <Button variant="${sortButton.variant}" size="${sortButton.size}" class={cn(classes, className)} onclick={() => column.toggleSorting(sorted === "asc")} aria-label={\`Sort by \${title}\`}>
    {title}
    {#if sorted === "desc"}
      <ArrowDownIcon />
    {:else if sorted === "asc"}
      <ArrowUpIcon />
    {:else}
      <ChevronsUpDownIcon />
    {/if}
  </Button>
{/if}`,
  });

  const generic = (file: GeneratedFile, params: string): GeneratedFile => ({ ...file, source: file.source.replace(`<script lang="ts">`, `<script lang="ts" generics="${params}">`) });
  return [
    generic(root, "TData, TValue"),
    header,
    { path: "data-table/data-table.svelte.ts", source: CREATE_SVELTE_TABLE },
    { path: "data-table/flex-render.svelte", source: FLEX_RENDER },
    { path: "data-table/render-helpers.ts", source: RENDER_HELPERS },
    {
      path: "data-table/index.ts",
      source: `import Root from "./data-table-root.svelte";
import ColumnHeader from "./data-table-column-header.svelte";

export { default as FlexRender } from "./flex-render.svelte";
export { renderComponent, renderSnippet } from "./render-helpers.js";
export { createSvelteTable } from "./data-table.svelte.js";

export {
  Root,
  ColumnHeader,
  //
  Root as DataTable,
  ColumnHeader as DataTableColumnHeader,
};
`,
    },
  ];
}

// shadcn-svelte's data-table helpers (MIT): TanStack Table's core made reactive with runes, and a
// component that renders a header or cell's content. Two changes from its registry item: the table's
// own state is read through a thunk (theirs only redraws for state the caller passes in, so the
// DataTable's filter, sorting, pages and selection never showed), and no `any`, so no eslint-disable
// comment names a rule the project may not have (typescript-eslint's).
const CREATE_SVELTE_TABLE = `import { type RowData, type TableOptions, type TableOptionsResolved, type TableState, type Updater, createTable } from "@tanstack/table-core";

// A reactive TanStack table for Svelte: its state is $state, and its options are read again when
// what they read changes.
export function createSvelteTable<TData extends RowData>(options: TableOptions<TData>) {
  const resolvedOptions: TableOptionsResolved<TData> = mergeObjects(
    {
      state: {},
      onStateChange() {},
      renderFallbackValue: null,
      mergeOptions: (defaultOptions: TableOptions<TData>, options: Partial<TableOptions<TData>>) => {
        return mergeObjects(defaultOptions, options);
      },
    },
    options,
  );

  const table = createTable(resolvedOptions);
  let state = $state<TableState>(table.initialState);

  // The state is read through a thunk: what reads the table (the markup, a $derived) then depends
  // on it, and updates when a filter, a sort, a page or a selection changes it.
  function updateOptions() {
    table.setOptions(() => {
      return mergeObjects(resolvedOptions, options, {
        state: mergeObjects(() => state, options.state || {}),

        onStateChange: (updater: Updater<TableState>) => {
          if (updater instanceof Function) state = updater(state);
          else state = mergeObjects(state, updater);

          options.onStateChange?.(updater);
        },
      });
    });
  }

  updateOptions();

  $effect.pre(() => {
    updateOptions();
  });

  return table;
}

type MaybeThunk<T extends object> = T | (() => T | null | undefined);
type Intersection<T extends readonly unknown[]> = (T extends [infer H, ...infer R] ? H & Intersection<R> : unknown) & {};

// Lazily merges several objects (or thunks), keeping every source's getters. A Proxy, to avoid a
// WebKit recursion issue.
export function mergeObjects<Sources extends readonly MaybeThunk<object>[]>(...sources: Sources): Intersection<{ [K in keyof Sources]: Sources[K] }> {
  const resolve = <T extends object>(src: MaybeThunk<T> | undefined): T | undefined => (typeof src === "function" ? (src() ?? undefined) : src);

  const findSourceWithKey = (key: PropertyKey) => {
    for (let i = sources.length - 1; i >= 0; i--) {
      const obj = resolve(sources[i]);
      if (obj && key in obj) return obj;
    }
    return undefined;
  };

  return new Proxy(Object.create(null), {
    get(_, key) {
      const src = findSourceWithKey(key);
      return src?.[key as never];
    },

    has(_, key) {
      return !!findSourceWithKey(key);
    },

    ownKeys(): (string | symbol)[] {
      const all = new Set<string | symbol>();
      for (const s of sources) {
        const obj = resolve(s);
        if (obj) {
          for (const k of Reflect.ownKeys(obj) as (string | symbol)[]) all.add(k);
        }
      }
      return [...all];
    },

    getOwnPropertyDescriptor(_, key) {
      const src = findSourceWithKey(key);
      if (!src) return undefined;
      return {
        configurable: true,
        enumerable: true,
        value: Reflect.get(src, key),
        writable: true,
      };
    },
  }) as Intersection<{ [K in keyof Sources]: Sources[K] }>;
}
`;

const FLEX_RENDER = `<script lang="ts" generics="TData, TValue, TContext extends HeaderContext<TData, TValue> | CellContext<TData, TValue>">
  import type { CellContext, ColumnDefTemplate, HeaderContext } from "@tanstack/table-core";
  import type { Attachment } from "svelte/attachments";
  import { RenderComponentConfig, RenderSnippetConfig } from "./render-helpers.js";

  type Props = {
    // The cell or header field of the column's definition.
    content?:
      | (TContext extends HeaderContext<TData, TValue>
          ? ColumnDefTemplate<HeaderContext<TData, TValue>>
          : TContext extends CellContext<TData, TValue>
            ? ColumnDefTemplate<CellContext<TData, TValue>>
            : never)
      | undefined;
    // What the header's or cell's getContext() returns.
    context: TContext;
    // Attachments that can't come through context.
    attach?: Attachment | undefined;
  };

  let { content, context, attach }: Props = $props();
</script>

{#if typeof content === "string"}
  {content}
{:else if content instanceof Function}
  {@const result = content(context as never)}
  {#if result instanceof RenderComponentConfig}
    {@const { component: Component, props } = result}
    <Component {...props} {attach} />
  {:else if result instanceof RenderSnippetConfig}
    {@const { snippet, params } = result}
    {@render snippet({ ...params, attach })}
  {:else}
    {result}
  {/if}
{/if}
`;

const RENDER_HELPERS = `import type { Component, Snippet } from "svelte";

// A Svelte component in a column's cell or header, as renderComponent makes it; FlexRender draws it.
export class RenderComponentConfig<TProps extends object> {
  component: Component<TProps>;
  props: TProps;
  constructor(component: Component<TProps>, props: TProps) {
    this.component = component;
    this.props = props;
  }
}

// A snippet in a column's cell or header, as renderSnippet makes it.
export class RenderSnippetConfig<TProps> {
  snippet: Snippet<[TProps]>;
  params: TProps;
  constructor(snippet: Snippet<[TProps]>, params: TProps) {
    this.snippet = snippet;
    this.params = params;
  }
}

// A column's cell or header as a Svelte component with its props, which are checked against the
// component's own: header: ({ column }) => renderComponent(DataTableColumnHeader, { column, title: "Email" }).
export function renderComponent<TProps extends object>(component: Component<TProps>, props: NoInfer<TProps> = {} as TProps) {
  return new RenderComponentConfig(component, props);
}

// A column's cell or header as a snippet taking one parameter.
export function renderSnippet<TProps>(snippet: Snippet<[TProps]>, params: TProps = {} as TProps) {
  return new RenderSnippetConfig(snippet, params);
}
`;
