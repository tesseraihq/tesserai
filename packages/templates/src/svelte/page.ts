import { LUCIDE_PACKAGES, meaningOf } from "../icons";
import { applySvelteIcons } from "./icons";
import type { Element, Node, Prop } from "../pages/jsx";
import type { PagePrinter, PageState } from "../pages/print";
import { pageChartOf, type PageChart } from "../chart-page";

// Pages and examples as Svelte 5 components, printed from the page tree the catalog builds the Radix
// way (Bits UI is shaped like Radix): the same parts by the same full names (Dialog, DialogTrigger),
// imported from each component's barrel through shadcn-svelte's placeholders; React's props in
// Svelte's words (class, for, onclick; an unbound prop is the initial value, so defaultValue is
// value); a trigger's asChild as a `child` snippet; React state as $state, with the setter the
// tree's expressions call.

const pascal = (id: string) => id.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");

// React's prop names for DOM attributes and events, as Svelte writes them.
const RENAMES: Record<string, string> = { className: "class", htmlFor: "for", tabIndex: "tabindex", readOnly: "readonly", autoFocus: "autofocus", autoComplete: "autocomplete" };
// An uncontrolled initial value: Svelte has none of React's default* props; a prop given and not
// bound is where the component starts.
const INITIAL: Record<string, string> = { defaultValue: "value", defaultChecked: "checked", defaultOpen: "open", defaultPressed: "pressed" };
// The props Bits UI components and ours let a caller bind, with the callback that reports a change.
const BINDABLE: Record<string, string> = { checked: "onCheckedChange", open: "onOpenChange", value: "onValueChange", pressed: "onPressedChange" };

// Radix's three-state checkbox (`a ? true : b ? "indeterminate" : false`) is Bits' checked and
// indeterminate, two props.
const INDETERMINATE = /^(.+?) \? true : (.+?) \? "indeterminate" : false$/;

type Printing = {
  // Module -> imported names (or, for Lucide, local name -> path).
  imports: Map<string, Set<string>>;
  icons: Map<string, string>;
  states: readonly PageState[];
  // What couldn't be written in Svelte, noted in the page rather than faked.
  unsupported: string[];
  // The list a Base UI-shaped combobox renders its rows from (its items prop), written out with
  // {#each} here.
  items?: string;
};

// React packages whose Svelte port the page imports instead: toast() is svelte-sonner's.
const SVELTE_PACKAGES: Record<string, string> = { sonner: "svelte-sonner" };

// A row rendered from each item, as a Base UI list's children: (item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>.
const ROW_PER_ITEM = /^\((\w+): \w+\) => <(\w+) key=\{\1\} value=\{\1\}>\{\1\}<\/\2>$/;

// A tag's name, with its import noted.
function nameFor(p: Printing, node: Element): string {
  if (node.from === undefined) return node.tag;
  if (node.from === "lucide-react") {
    p.icons.set(node.tag, `${LUCIDE_PACKAGES.svelte}/icons/${meaningOf(node.tag)}`);
    return node.tag;
  }
  const module = node.from.startsWith("pkg:") ? (SVELTE_PACKAGES[node.from.slice(4)] ?? node.from.slice(4)) : `$UI$/${node.from}/index.js`;
  if (!p.imports.has(module)) p.imports.set(module, new Set());
  p.imports.get(module)!.add(node.tag);
  return node.tag;
}

// Text as Svelte markup: braces and angle brackets would read as code or tags.
const text = (value: string) => (/[{}<>]/.test(value) || value !== value.trim() ? `{${JSON.stringify(value)}}` : value);

// A string attribute; braces in it would read as an expression.
const attribute = (name: string, value: string) => (/["{}\n\\]/.test(value) ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`);

// An element's text, when its one child is text.
const textOf = (node: Element) => (node.children.length === 1 && node.children[0]!.k === "text" ? node.children[0]!.text : undefined);

// The value and label of every item in a select.
function selectItems(node: Node): { value: string; label: string }[] {
  if (node.k === "frag" || (node.k === "el" && !(node.from === "select" && node.tag === "SelectItem"))) return node.children.flatMap(selectItems);
  if (node.k !== "el") return [];
  const value = node.props["value"];
  const label = textOf(node);
  return typeof value === "string" && label !== undefined ? [{ value, label }] : [];
}

// React's props for this element, in Svelte's words.
function propsOf(p: Printing, node: Element): [string, Prop][] {
  const component = node.from !== undefined && node.from !== "lucide-react";
  const out = new Map<string, Prop>();
  for (const [key, value] of Object.entries(node.props)) {
    if (value === undefined || value === false) continue;
    let name = RENAMES[key] ?? INITIAL[key] ?? key;
    // DOM events are lowercase in Svelte (onclick, and a questionnaire's onsubmit and onreset, which our
    // components pass to their element); Bits'
    // callbacks keep their names (onCheckedChange).
    if (["onClick", "onSubmit", "onReset"].includes(key) || (!component && /^on[A-Z]/.test(key))) name = key.toLowerCase();
    out.set(name, value);
  }
  // Bits' select shows an item's label, which it knows from the item (label) or, while the list is
  // closed and no item is mounted, from the root's items; given neither, it shows the raw value.
  if (node.from === "select" && node.tag === "Select") {
    if (!out.has("type")) out.set("type", "single");
    const items = selectItems(node);
    if (items.length > 0 && !out.has("items")) out.set("items", { expr: JSON.stringify(items) });
  }
  if (node.from === "select" && node.tag === "SelectItem" && !out.has("label")) {
    const label = textOf(node);
    if (label !== undefined) out.set("label", label);
  }
  // Bits' combobox says whether it holds one value or several, as its select does.
  if (node.from === "combobox" && node.tag === "Combobox" && !out.has("type")) out.set("type", "single");
  // Bits' single accordion always lets its open item close.
  if (node.from === "accordion" && node.tag === "Accordion") out.delete("collapsible");
  // A slider holds one value or a range; Bits says which by type.
  if (node.from === "slider" && node.tag === "Slider") {
    const value = out.get("value");
    if (typeof value === "object" && value !== null && "expr" in value) {
      const values = JSON.parse(value.expr) as number[];
      out.set("type", values.length === 1 ? "single" : "multiple");
      out.set("value", { expr: values.length === 1 ? String(values[0]) : JSON.stringify(values) });
    }
  }
  // Bits' PinInput takes maxlength; each slot draws the cell its root hands out (see print).
  if (node.from === "input-otp" && node.tag === "InputOTP" && out.has("maxLength")) {
    out.set("maxlength", out.get("maxLength"));
    out.delete("maxLength");
  }
  if (node.from === "input-otp" && node.tag === "InputOTPSlot") {
    const index = out.get("index");
    out.delete("index");
    out.set("cell", { expr: `cells[${typeof index === "number" ? index : 0}]!` });
  }
  // paneforge's group takes a direction, and a pane its default size as a percentage (a number).
  if (node.from === "resizable" && node.tag === "ResizablePanelGroup" && out.has("orientation")) {
    out.set("direction", out.get("orientation"));
    out.delete("orientation");
  }
  if (node.from === "resizable" && node.tag === "ResizablePanel") {
    const size = out.get("defaultSize");
    if (typeof size === "string" && /^\d+(\.\d+)?%?$/.test(size)) out.set("defaultSize", Number.parseFloat(size));
  }
  // shadcn-svelte's menu button calls its tooltip tooltipContent.
  if (node.from === "sidebar" && node.tag === "SidebarMenuButton" && out.has("tooltip")) {
    out.set("tooltipContent", out.get("tooltip"));
    out.delete("tooltip");
  }
  if (node.from === "checkbox" && node.tag === "Checkbox") {
    const checked = out.get("checked");
    const three = typeof checked === "object" && checked !== null && "expr" in checked ? INDETERMINATE.exec(checked.expr) : null;
    if (three !== null) {
      out.set("checked", { expr: three[1]! });
      out.set("indeterminate", { expr: three[2]! });
    }
  }
  return [...out];
}

function printProps(p: Printing, node: Element, indent: string, extra: string[] = []): string {
  const props = propsOf(p, node);
  const byName = new Map(props);
  const out = [...extra];
  const bound = new Set<string>();
  // A value the page's state holds, changed only by its setter: Svelte binds it.
  for (const [prop, callback] of Object.entries(BINDABLE)) {
    const value = byName.get(prop);
    const handler = byName.get(callback);
    if (typeof value !== "object" || value === null || !("expr" in value) || typeof handler !== "object" || handler === null || !("expr" in handler)) continue;
    const state = p.states.find((s) => s.value === value.expr && s.set === handler.expr);
    if (state === undefined) continue;
    out.push(`bind:${prop}={${state.value}}`);
    bound.add(prop).add(callback);
  }
  for (const [name, value] of props) {
    if (bound.has(name) || value === undefined || value === false) continue;
    if (value === true) out.push(name);
    else if (typeof value === "string") out.push(attribute(name, value));
    else if (typeof value === "number") out.push(`${name}={${value}}`);
    else if ("expr" in value) {
      if (/<[A-Za-z]/.test(value.expr)) p.unsupported.push(`${node.tag}'s ${name} (markup in an expression)`);
      else out.push(`${name}={${value.expr}}`);
    } else p.unsupported.push(`${node.tag}'s ${name} (a component as a prop)`);
  }
  return out.length === 0 ? "" : ` ${out.join(" ")}`;
}

// A chart, which the page builds with Recharts for the React preview, written with LayerChart as the
// Svelte chart is (shadcn-svelte's): its simple chart over the categories, each series labelled and
// colored from the config, the system's tooltip and legend in the chart's snippets.
function printChart(p: Printing, c: PageChart, indent: string): string {
  const chart = { bar: "BarChart", line: "LineChart", area: "AreaChart" }[c.kind];
  const labels = JSON.parse(c.config) as Record<string, { label?: string }>;
  const series = c.series.map((key) => `{ key: ${JSON.stringify(key)}, label: ${JSON.stringify(labels[key]?.label ?? key)}, color: "var(--color-${key})" }`);
  const chartProps = [
    `data={${c.data}}`,
    attribute("x", c.categoryKey),
    `axis="x"`,
    `series={[${series.join(", ")}]}`,
    ...(c.kind === "bar" ? [`seriesLayout="group"`] : c.kind === "area" ? [`seriesLayout="stack"`, `props={{ area: { fillOpacity: 0.4 } }}`] : []),
    ...(c.grid ? [] : ["grid={false}"]),
  ];
  const snippets = [
    ...(c.tooltip ? [`{#snippet tooltip()}`, `  <${nameFor(p, { k: "el", tag: "ChartTooltip", from: "chart", props: {}, children: [] })} />`, `{/snippet}`] : []),
    ...(c.legend ? [`{#snippet legend()}`, `  <${nameFor(p, { k: "el", tag: "ChartLegendContent", from: "chart", props: {}, children: [] })} />`, `{/snippet}`] : []),
  ];
  const container = nameFor(p, { k: "el", tag: "ChartContainer", from: "chart", props: {}, children: [] });
  const plot = nameFor(p, { k: "el", tag: chart, from: "pkg:layerchart", props: {}, children: [] });
  return [
    `${indent}<${container} config={${c.config}}${c.className === undefined ? "" : ` ${attribute("class", c.className)}`}>`,
    `${indent}  <${plot} ${chartProps.join(" ")}>`,
    ...snippets.map((line) => `${indent}    ${line}`),
    `${indent}  </${plot}>`,
    `${indent}</${container}>`,
  ].join("\n");
}

// HTML elements that can't have children; any other empty element is written open and closed.
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

function print(p: Printing, node: Node, indent: string, extra: string[] = []): string {
  switch (node.k) {
    case "text":
      return `${indent}${text(node.text)}`;
    case "expr": {
      const row = ROW_PER_ITEM.exec(node.code.trim());
      if (row !== null && p.items !== undefined) {
        const [, item, tag] = row;
        nameFor(p, { k: "el", tag: tag!, from: "combobox", props: {}, children: [] });
        return `${indent}{#each ${p.items} as ${item} (${item})}\n${indent}  <${tag} value={${item}} label={${item}}>{${item}}</${tag}>\n${indent}{/each}`;
      }
      if (/<[A-Za-z]/.test(node.code)) {
        p.unsupported.push("markup in an expression");
        return "";
      }
      return `${indent}{${node.code}}`;
    }
    case "frag":
      return node.children.map((c) => print(p, c, indent)).filter((line) => line !== "").join("\n");
    case "use":
      nameFor(p, { k: "el", tag: node.name, from: node.from, props: {}, children: [] });
      return "";
    case "trigger": {
      const as = nameFor(p, { k: "el", tag: node.as, from: node.from, props: {}, children: [] });
      // The trigger's own button becomes the child: Bits' `child` snippet, with its props spread on.
      if (node.child.k !== "el") return `${indent}<${as}>\n${print(p, node.child, `${indent}  `)}\n${indent}</${as}>`;
      return `${indent}<${as}>\n${indent}  {#snippet child({ props })}\n${print(p, node.child, `${indent}    `, ["{...props}"])}\n${indent}  {/snippet}\n${indent}</${as}>`;
    }
    case "el": {
      const chart = pageChartOf(node);
      if (chart !== null) return printChart(p, chart, indent);
      // A combobox's items become its rows' {#each} (Bits' root takes no such list).
      const items = node.from === "combobox" && node.tag === "Combobox" ? node.props["items"] : undefined;
      if (typeof items === "object" && items !== null && "expr" in items) {
        const { items: _, ...rest } = node.props;
        return print({ ...p, items: items.expr }, { ...node, props: rest }, indent, extra);
      }
      const name = nameFor(p, node);
      const props = printProps(p, node, `${indent}  `, extra);
      const component = node.from !== undefined;
      const empty = component || VOID.has(name) ? `${indent}<${name}${props} />` : `${indent}<${name}${props}></${name}>`;
      if (node.children.length === 0) return empty;
      if (node.children.length === 1 && node.children[0]!.k === "text") return `${indent}<${name}${props}>${text((node.children[0] as { text: string }).text)}</${name}>`;
      // Bits' PinInput hands its cells to its children, which the slots draw.
      if (node.from === "input-otp" && node.tag === "InputOTP") {
        const cells = node.children.map((c) => print(p, c, `${indent}    `)).filter((line) => line !== "");
        return `${indent}<${name}${props}>\n${indent}  {#snippet children({ cells })}\n${cells.join("\n")}\n${indent}  {/snippet}\n${indent}</${name}>`;
      }
      const inner = node.children.map((c) => print(p, c, `${indent}  `)).filter((line) => line !== "");
      if (inner.length === 0) return empty;
      return `${indent}<${name}${props}>\n${inner.join("\n")}\n${indent}</${name}>`;
    }
  }
}

const printSvelte: PagePrinter = ({ root, states, name, system }) => {
  const p: Printing = { imports: new Map(), icons: new Map(), states, unsupported: [] };
  const body = print(p, root, "");
  const imports = [
    ...[...p.icons].sort(([a], [b]) => a.localeCompare(b)).map(([local, path]) => `import ${local} from "${path}";`),
    ...[...p.imports].sort(([a], [b]) => a.localeCompare(b)).map(([module, names]) => `import { ${[...names].sort().join(", ")} } from "${module}";`),
  ];
  // React state, and its setter, which takes a value or an update as React's does.
  const state = states.flatMap((s) => [`let ${s.value} = $state<${s.type}>(${s.initial});`, `const ${s.set} = (next: ${s.type} | ((current: ${s.type}) => ${s.type})) => (${s.value} = typeof next === "function" ? next(${s.value}) : next);`]);
  const script = [...imports, ...(state.length > 0 ? ["", ...state] : [])];
  const unsupported = [...new Set(p.unsupported)].map((what) => `<!-- Not printed for Svelte yet: ${what}. -->\n`).join("");
  // Lucide as printed, then the system's icon library, as its components get.
  return applySvelteIcons(
    `<!-- ${pascal(name)}Page: generated by tesserai from a page spec, using this system's components. -->
<script lang="ts">
${script.map((line) => (line === "" ? "" : `  ${line}`)).join("\n")}
</script>

${unsupported}${body}
`,
    "page",
    system,
  );
};

export const printSveltePage: PagePrinter = Object.assign(printSvelte, { framework: "svelte" as const });
