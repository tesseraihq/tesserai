import type { Anatomy } from "@tesserai/core";
import { breadcrumbPieces } from "../breadcrumb";
import { q, unionType } from "../codegen";
import { accordionPieces, collapsiblePieces } from "../disclosure";
import { paginationPieces } from "../pagination";
import type { GeneratedFile } from "../render";
import { tabsPieces } from "../tabs-shared";
import { attributesOf, elementPart } from "./elements";
import { bitsImport, cva, indexFile, indexParts, lucideImport, partFile, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";
import { BITS_STATES, bitsVars } from "./states";

// Tabs on Bits, which marks the selected tab data-state=active as Radix does. The list takes a
// variant (shadcn's "default" is the segmented look) and the root an orientation; a tab reads both
// from data attributes.
export function tabsFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, defaultVariant, aliases } = tabsPieces(anatomy, { states: { ...BITS_STATES, selected: ["data-[state=active]:"] }, selected: "data-[state=active]:" });
  const primitive = (file: string, part: string, slot: string, classes: string[], extra: Partial<Parameters<typeof partFile>[0]> = {}) =>
    partFile({ path: `tabs/${file}`, imports: [bitsImport("Tabs")], props: `TabsPrimitive.${part}Props`, tag: `TabsPrimitive.${part}`, slot, classes: quoted(classes), ...extra });
  const aliasEntries = Object.entries(aliases).map(([name, v]) => `${q(name)}: ${q(v)}`).join(", ");
  return [
    primitive("tabs.svelte", "Root", "tabs", slots.tabs, { bindable: { value: `""` }, destructure: [`orientation = "horizontal"`], attrs: ["{orientation}"] }),
    svelteFile("tabs/tabs-list.svelte", {
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("tabsListVariants", slots["tabs-list"])}

type Variant = ${unionType(variants)};
${aliasEntries === "" ? "" : "// shadcn's name for the segmented look.\n"}const aliases = { ${aliasEntries} } as const;
type Alias = keyof typeof aliases;

export type TabsListVariant = Variant | Alias;
export type TabsListVariants = VariantProps<typeof tabsListVariants>;

function resolveVariant(variant: TabsListVariant | undefined): Variant {
  if (variant === undefined) return ${q(defaultVariant)};
  return variant in aliases ? aliases[variant as Alias] : (variant as Variant);
}`,
      script: `${bitsImport("Tabs")}
${UTILS_IMPORT(["cn"])}

let { ref = $bindable(null), class: className, variant, ...restProps }: TabsPrimitive.ListProps & { variant?: TabsListVariant | undefined } = $props();

const resolved = $derived(resolveVariant(variant));`,
      markup: `<TabsPrimitive.List bind:ref data-slot="tabs-list" data-variant={resolved} class={cn(tabsListVariants({ variant: resolved }), className)} {...restProps} />`,
    }),
    primitive("tabs-trigger.svelte", "Trigger", "tabs-trigger", slots["tabs-trigger"]),
    primitive("tabs-content.svelte", "Content", "tabs-content", slots["tabs-content"]),
    indexFile(
      "tabs/index.ts",
      indexParts([
        ["tabs.svelte", "Root", "Tabs"],
        ["tabs-list.svelte", "List", "TabsList"],
        ["tabs-trigger.svelte", "Trigger", "TabsTrigger"],
        ["tabs-content.svelte", "Content", "TabsContent"],
      ]),
      [{ file: "tabs-list.svelte", names: ["tabsListVariants", "type TabsListVariant", "type TabsListVariants"] }],
    ),
  ];
}

// Accordion on Bits (type="single" or "multiple", as in Radix). The trigger sits in a header; the
// content opens to Bits' --bits-accordion-content-height, and its padding and type are on an inner
// div, which is where `class` goes, so the animated element has none.
export function accordionFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = bitsVars(accordionPieces(anatomy, "radix"));
  const primitive = (file: string, part: string, slot: string, classes: string[]) =>
    partFile({ path: `accordion/${file}`, imports: [bitsImport("Accordion")], props: `AccordionPrimitive.${part}Props`, tag: `AccordionPrimitive.${part}`, slot, classes: quoted(classes) });
  return [
    partFile({
      path: "accordion/accordion.svelte",
      imports: [bitsImport("Accordion")],
      props: "AccordionPrimitive.RootProps",
      tag: "AccordionPrimitive.Root",
      slot: "accordion",
      classes: quoted(slots.accordion),
      // value is a string or an array by type, which destructuring can't narrow: hence the cast.
      destructure: ["value = $bindable()"],
      attrs: ["bind:value={value as never}"],
    }),
    primitive("accordion-item.svelte", "Item", "accordion-item", slots["accordion-item"]),
    svelteFile("accordion/accordion-trigger.svelte", {
      script: `${bitsImport("Accordion")}
${lucideImport("ChevronDownIcon")}
${UTILS_IMPORT(["cn", "type WithoutChild"])}

const headerClasses = ${quoted(slots["accordion-trigger:header"])};
const classes = ${quoted(slots["accordion-trigger"])};
const iconClasses = ${quoted(slots["accordion-trigger-icon"])};

let {
  ref = $bindable(null),
  class: className,
  level = 3,
  children,
  ...restProps
}: WithoutChild<AccordionPrimitive.TriggerProps> & { level?: AccordionPrimitive.HeaderProps["level"] } = $props();`,
      markup: `<AccordionPrimitive.Header {level} class={headerClasses}>
  <AccordionPrimitive.Trigger bind:ref data-slot="accordion-trigger" class={cn(classes, className)} {...restProps}>
    {@render children?.()}
    <ChevronDownIcon data-slot="accordion-trigger-icon" aria-hidden="true" class={iconClasses} />
  </AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>`,
    }),
    svelteFile("accordion/accordion-content.svelte", {
      script: `${bitsImport("Accordion")}
${UTILS_IMPORT(["cn", "type WithoutChild"])}

const classes = ${quoted(slots["accordion-content"])};
const innerClasses = ${quoted(slots["accordion-content:inner"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithoutChild<AccordionPrimitive.ContentProps> = $props();`,
      markup: `<AccordionPrimitive.Content bind:ref data-slot="accordion-content" class={classes} {...restProps}>
  <div class={cn(innerClasses, className)}>
    {@render children?.()}
  </div>
</AccordionPrimitive.Content>`,
    }),
    indexFile(
      "accordion/index.ts",
      indexParts([
        ["accordion.svelte", "Root", "Accordion"],
        ["accordion-item.svelte", "Item", "AccordionItem"],
        ["accordion-trigger.svelte", "Trigger", "AccordionTrigger"],
        ["accordion-content.svelte", "Content", "AccordionContent"],
      ]),
    ),
  ];
}

// Collapsible on Bits: only the content is styled, opening to --bits-collapsible-content-height.
export function collapsibleFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = bitsVars(collapsiblePieces(anatomy, "radix"));
  const primitive = (file: string, part: string, extra: Partial<Parameters<typeof partFile>[0]>) =>
    partFile({ path: `collapsible/${file}`, imports: [bitsImport("Collapsible")], props: `CollapsiblePrimitive.${part}Props`, tag: `CollapsiblePrimitive.${part}`, ...extra });
  return [
    primitive("collapsible.svelte", "Root", { slot: "collapsible", bindable: { open: "false" } }),
    primitive("collapsible-trigger.svelte", "Trigger", { slot: "collapsible-trigger" }),
    primitive("collapsible-content.svelte", "Content", { slot: "collapsible-content", classes: quoted(slots["collapsible-content"]) }),
    indexFile(
      "collapsible/index.ts",
      indexParts([
        ["collapsible.svelte", "Root", "Collapsible"],
        ["collapsible-trigger.svelte", "Trigger", "CollapsibleTrigger"],
        ["collapsible-content.svelte", "Content", "CollapsibleContent"],
      ]),
    ),
  ];
}

// Breadcrumb: a nav with an ordered list, plain elements as in React. A link renders as something
// else through a `child` snippet (shadcn-svelte's asChild).
export function breadcrumbFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = breadcrumbPieces(anatomy);
  const nav = attributesOf("nav");
  const anchor = attributesOf("a");
  const li = attributesOf("li");
  const span = attributesOf("span");
  return [
    partFile({
      path: "breadcrumb/breadcrumb.svelte",
      imports: [nav.import],
      utils: ["type WithElementRef"],
      props: `WithElementRef<${nav.type}>`,
      tag: "nav",
      element: true,
      slot: "breadcrumb",
      attrs: [`aria-label="breadcrumb"`],
    }),
    elementPart("breadcrumb/breadcrumb-list.svelte", "ol", "breadcrumb-list", quoted(slots["breadcrumb-list"])),
    elementPart("breadcrumb/breadcrumb-item.svelte", "li", "breadcrumb-item", quoted(slots["breadcrumb-item"])),
    svelteFile("breadcrumb/breadcrumb-link.svelte", {
      script: `${anchor.import}
import type { Snippet } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${quoted(slots["breadcrumb-link"])};

let {
  ref = $bindable(null),
  class: className,
  href = undefined,
  child,
  children,
  ...restProps
}: WithElementRef<${anchor.type}> & { child?: Snippet<[{ props: ${anchor.type} }]> } = $props();

const attrs = $derived({ "data-slot": "breadcrumb-link", class: cn(classes, className), href, ...restProps });`,
      markup: `{#if child}
  {@render child({ props: attrs })}
{:else}
  <a bind:this={ref} {...attrs}>
    {@render children?.()}
  </a>
{/if}`,
    }),
    elementPart("breadcrumb/breadcrumb-page.svelte", "span", "breadcrumb-page", quoted(slots["breadcrumb-page"]), {
      attrs: [`role="link"`, `aria-disabled="true"`, `aria-current="page"`],
    }),
    svelteFile("breadcrumb/breadcrumb-separator.svelte", {
      script: `${li.import}
${lucideImport("ChevronRightIcon")}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${quoted(slots["breadcrumb-separator"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<${li.type}> = $props();`,
      markup: `<li bind:this={ref} data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" class={cn(classes, className)} {...restProps}>
  {#if children}
    {@render children()}
  {:else}
    <ChevronRightIcon />
  {/if}
</li>`,
    }),
    svelteFile("breadcrumb/breadcrumb-ellipsis.svelte", {
      script: `${span.import}
${lucideImport("MoreHorizontalIcon")}
${UTILS_IMPORT(["cn", "type WithElementRef", "type WithoutChildren"])}

const classes = ${quoted(slots["breadcrumb-ellipsis"])};
const labelClasses = "sr-only";

let { ref = $bindable(null), class: className, ...restProps }: WithoutChildren<WithElementRef<${span.type}>> = $props();`,
      markup: `<span bind:this={ref} data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" class={cn(classes, className)} {...restProps}>
  <MoreHorizontalIcon />
  <span class={labelClasses}>More</span>
</span>`,
    }),
    indexFile(
      "breadcrumb/index.ts",
      indexParts([
        ["breadcrumb.svelte", "Root", "Breadcrumb"],
        ["breadcrumb-list.svelte", "List", "BreadcrumbList"],
        ["breadcrumb-item.svelte", "Item", "BreadcrumbItem"],
        ["breadcrumb-link.svelte", "Link", "BreadcrumbLink"],
        ["breadcrumb-page.svelte", "Page", "BreadcrumbPage"],
        ["breadcrumb-separator.svelte", "Separator", "BreadcrumbSeparator"],
        ["breadcrumb-ellipsis.svelte", "Ellipsis", "BreadcrumbEllipsis"],
      ]),
    ),
  ];
}

// Pagination as in React: plain links (Bits' Pagination would change the DOM), each page link the
// system's Button given an href, ghost, or outline for the current page.
export function paginationFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, link } = paginationPieces(anatomy);
  const nav = attributesOf("nav");
  const span = attributesOf("span");
  // A page link takes Button's props, less the look it picks itself.
  const linkProps = `{ isActive?: boolean | undefined } & Omit<ButtonProps, "variant" | "intent">`;
  const edge = (file: string, text: string, label: string, icon: string, classes: string[], iconFirst: boolean) => {
    const iconTag = `<${icon} data-icon="inline-${iconFirst ? "start" : "end"}" class={iconClasses} />`;
    const labelTag = `<span class={labelClasses}>{text}</span>`;
    return svelteFile(`pagination/${file}`, {
      script: `import type { ComponentProps } from "svelte";
${lucideImport(icon)}
${UTILS_IMPORT(["cn"])}
import PaginationLink from "./pagination-link.svelte";

const classes = ${quoted(classes)};
const iconClasses = ${quoted(slots["pagination-link:icon"])};
const labelClasses = ${quoted(slots["pagination-link:label"])};

let { class: className, text = ${q(text)}, ...restProps }: ComponentProps<typeof PaginationLink> & { text?: string } = $props();`,
      markup: `<PaginationLink aria-label=${q(label)} size=${q(link.edgeSize)} class={cn(classes, className)} {...restProps}>
  ${iconFirst ? `${iconTag}\n  ${labelTag}` : `${labelTag}\n  ${iconTag}`}
</PaginationLink>`,
    });
  };
  return [
    partFile({
      path: "pagination/pagination.svelte",
      imports: [nav.import],
      utils: ["type WithElementRef"],
      props: `WithElementRef<${nav.type}>`,
      tag: "nav",
      element: true,
      slot: "pagination",
      classes: quoted(slots.pagination),
      attrs: [`aria-label="pagination"`],
    }),
    elementPart("pagination/pagination-content.svelte", "ul", "pagination-content", quoted(slots["pagination-content"])),
    partFile({
      path: "pagination/pagination-item.svelte",
      imports: [attributesOf("li").import],
      utils: ["type WithElementRef"],
      props: `WithElementRef<${attributesOf("li").type}>`,
      tag: "li",
      element: true,
      slot: "pagination-item",
      classes: quoted(slots["pagination-item"]),
    }),
    svelteFile("pagination/pagination-link.svelte", {
      script: `${uiImport("button", ["Button", "type ButtonProps"])}

let { ref = $bindable(null), class: className, isActive, size = ${q(link.size)}, children, ...restProps }: ${linkProps} = $props();`,
      markup: `<Button
  bind:ref
  variant={isActive ? ${q(link.activeVariant)} : ${q(link.variant)}}
  {size}
  class={className}
  aria-current={isActive ? "page" : undefined}
  data-slot="pagination-link"
  data-active={isActive}
  {...restProps}
>
  {@render children?.()}
</Button>`,
    }),
    edge("pagination-previous.svelte", "Previous", "Go to previous page", "ChevronLeftIcon", slots["pagination-link:previous"], true),
    edge("pagination-next.svelte", "Next", "Go to next page", "ChevronRightIcon", slots["pagination-link:next"], false),
    svelteFile("pagination/pagination-ellipsis.svelte", {
      script: `${span.import}
${lucideImport("MoreHorizontalIcon")}
${UTILS_IMPORT(["cn", "type WithElementRef", "type WithoutChildren"])}

const classes = ${quoted(slots["pagination-ellipsis"])};
const labelClasses = "sr-only";

let { ref = $bindable(null), class: className, ...restProps }: WithoutChildren<WithElementRef<${span.type}>> = $props();`,
      markup: `<span bind:this={ref} aria-hidden="true" data-slot="pagination-ellipsis" class={cn(classes, className)} {...restProps}>
  <MoreHorizontalIcon />
  <span class={labelClasses}>More pages</span>
</span>`,
    }),
    indexFile(
      "pagination/index.ts",
      indexParts([
        ["pagination.svelte", "Root", "Pagination"],
        ["pagination-content.svelte", "Content", "PaginationContent"],
        ["pagination-item.svelte", "Item", "PaginationItem"],
        ["pagination-link.svelte", "Link", "PaginationLink"],
        ["pagination-previous.svelte", "Previous", "PaginationPrevious"],
        ["pagination-next.svelte", "Next", "PaginationNext"],
        ["pagination-ellipsis.svelte", "Ellipsis", "PaginationEllipsis"],
      ]),
    ),
  ];
}

