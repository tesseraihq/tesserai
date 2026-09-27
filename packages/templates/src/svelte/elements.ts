import type { GeneratedFile } from "../render";
import { partFile, type PartFile } from "./emit";

// The svelte/elements attributes type for each tag the templates render.
const ATTRIBUTES: Record<string, string> = {
  div: "HTMLAttributes<HTMLDivElement>",
  span: "HTMLAttributes<HTMLSpanElement>",
  p: "HTMLAttributes<HTMLParagraphElement>",
  h1: "HTMLAttributes<HTMLHeadingElement>",
  h2: "HTMLAttributes<HTMLHeadingElement>",
  h3: "HTMLAttributes<HTMLHeadingElement>",
  h4: "HTMLAttributes<HTMLHeadingElement>",
  small: "HTMLAttributes<HTMLElement>",
  code: "HTMLAttributes<HTMLElement>",
  kbd: "HTMLAttributes<HTMLElement>",
  blockquote: "HTMLBlockquoteAttributes",
  ul: "HTMLAttributes<HTMLUListElement>",
  ol: "HTMLOlAttributes",
  li: "HTMLLiAttributes",
  nav: "HTMLAttributes<HTMLElement>",
  a: "HTMLAnchorAttributes",
  fieldset: "HTMLFieldsetAttributes",
  legend: "HTMLAttributes<HTMLLegendElement>",
  label: "HTMLLabelAttributes",
  table: "HTMLTableAttributes",
  thead: "HTMLAttributes<HTMLTableSectionElement>",
  tbody: "HTMLAttributes<HTMLTableSectionElement>",
  tfoot: "HTMLAttributes<HTMLTableSectionElement>",
  tr: "HTMLAttributes<HTMLTableRowElement>",
  th: "HTMLThAttributes",
  td: "HTMLTdAttributes",
  caption: "HTMLAttributes<HTMLElement>",
  select: "HTMLSelectAttributes",
  textarea: "HTMLTextareaAttributes",
  input: "HTMLInputAttributes",
  option: "HTMLOptionAttributes",
  optgroup: "HTMLOptgroupAttributes",
  main: "HTMLAttributes<HTMLElement>",
};

// The element's attributes type, and the import it needs.
export function attributesOf(tag: string): { type: string; import: string } {
  const type = ATTRIBUTES[tag];
  if (type === undefined) throw new Error(`no attributes type for <${tag}>`);
  const name = type.replace(/<.*$/, "");
  return { type, import: `import type { ${name} } from "svelte/elements";` };
}

// A styled element that renders its children: shadcn-svelte's thinnest part.
export function elementPart(
  path: string,
  tag: string,
  slot: string,
  classes: string,
  extra: Partial<PartFile> & { propsExtra?: string } = {},
): GeneratedFile {
  const { propsExtra, ...rest } = extra;
  const attributes = attributesOf(tag);
  return partFile({
    path,
    imports: [attributes.import],
    utils: ["type WithElementRef"],
    props: `WithElementRef<${attributes.type}>${propsExtra === undefined ? "" : ` & ${propsExtra}`}`,
    tag,
    element: true,
    slot,
    classes,
    ...rest,
  });
}
