import type { Node, Prop } from "../pages/jsx";
import type { PagePrinter } from "../pages/print";
import { replaceCharts, type PageChart } from "../chart-page";
import { LUCIDE_PACKAGES } from "../icons";
import { el, expr } from "../pages/jsx";
import { applyVueIcons } from "./icons";

// Pages, docs examples and MCP examples as a Vue single-file component: printPage builds the page
// the Radix way (its tree's shape is Reka's too) and this writes it as a <script setup lang="ts">
// SFC over the system's generated Vue components. React's spelling becomes Vue's:
// - className is class, htmlFor is for, other props are kebab-case on components;
// - a string prop is written as is, anything else bound (:prop="code"; the codes are JSON literals,
//   arrow functions and state reads, all valid in a template);
// - on* handlers are @events, named as Reka emits them; a controlled pair (checked and
//   onCheckedChange, value and onValueChange, open and onOpenChange…) is Reka's model, written as
//   v-model when it's a plain state and its setter;
// - a trigger is the part with as-child around what opens it;
// - state is a ref, with a setter taking a value or an updater, as React's does, so the codes that
//   call setX keep working.

// React's name for a component's model (the value, its change handler, and its uncontrolled
// start) and Reka's: Vue's model is modelValue for these, open for overlays.
type Model = { value: string; change: string; initial?: string };
const MODEL: Record<string, Model> = {
  Checkbox: { value: "checked", change: "onCheckedChange", initial: "defaultChecked" },
  Switch: { value: "checked", change: "onCheckedChange", initial: "defaultChecked" },
  DropdownMenuCheckboxItem: { value: "checked", change: "onCheckedChange", initial: "defaultChecked" },
  Toggle: { value: "pressed", change: "onPressedChange", initial: "defaultPressed" },
  Select: { value: "value", change: "onValueChange" },
  RadioGroup: { value: "value", change: "onValueChange" },
  Tabs: { value: "value", change: "onValueChange" },
  ToggleGroup: { value: "value", change: "onValueChange" },
  Accordion: { value: "value", change: "onValueChange" },
  Slider: { value: "value", change: "onValueChange" },
  DropdownMenuRadioGroup: { value: "value", change: "onValueChange" },
  Progress: { value: "value", change: "onValueChange" },
};
const OPEN: Model = { value: "open", change: "onOpenChange" };

// React's names for HTML attributes that Vue writes as HTML does.
const HTML_ATTRS: Record<string, string> = { className: "class", htmlFor: "for", tabIndex: "tabindex", readOnly: "readonly", maxLength: "maxlength", autoFocus: "autofocus", colSpan: "colspan", rowSpan: "rowspan", autoComplete: "autocomplete" };

// Props a Vue component takes under another name or in another form than the React one:
// vue-input-otp's maxlength, and Reka's Splitter, whose group has a direction and whose panel's
// default size is a percentage as a number ("50%" in React is 50).
const PROP_NAMES: Record<string, Record<string, string>> = {
  InputOTP: { maxLength: "maxlength" },
  ResizablePanelGroup: { orientation: "direction" },
};
const PROP_VALUES: Record<string, Record<string, (value: Prop) => Prop>> = {
  ResizablePanel: { defaultSize: (value) => (typeof value === "string" && /^\d+(\.\d+)?%?$/.test(value) ? Number.parseFloat(value) : value) },
};

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

// A prop's name on an element: HTML elements keep attribute names (lowercased where React
// camelCases them); components take Vue's kebab-case, as their templates are written.
function propName(key: string, component: boolean): string {
  if (key in HTML_ATTRS) return HTML_ATTRS[key]!;
  if (key.startsWith("aria-") || key.startsWith("data-")) return key;
  return component ? kebab(key) : key;
}

// Code for an attribute value, which a double quote would end: double-quoted strings become
// single-quoted ones; a double quote left anywhere else is written as an entity.
function attrCode(code: string): string {
  let out = "";
  for (let i = 0; i < code.length; ) {
    const ch = code[i]!;
    if (ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) j += code[j] === "\\" ? 2 : 1;
      out += code.slice(i, j + 1).replace(/"/g, "&quot;");
      i = j + 1;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"') j += code[j] === "\\" ? 2 : 1;
      const value = JSON.parse(code.slice(i, j + 1)) as string;
      out += `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`.replace(/"/g, "&quot;");
      i = j + 1;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// Text in a template: as is, unless it could be read as markup, an interpolation or an entity, or
// its edges' spaces would be lost.
const templateText = (value: string) => (/[<>{}&]/.test(value) || value !== value.trim() ? `{{ ${JSON.stringify(value)} }}` : value);

// items: the list a Base UI-shaped combobox renders its rows from (its items prop), which Vue writes
// out with v-for.
type Ctx = { exports: ReadonlyMap<string, ReadonlySet<string>>; imports: Map<string, Set<string>>; items?: string };

// React packages whose Vue port the page imports instead: toast() is vue-sonner's.
const VUE_PACKAGES: Record<string, string> = { sonner: "vue-sonner" };

// A row rendered from each item, as a Base UI list's children: (item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>.
const ROW_PER_ITEM = /^\((\w+): \w+\) => <(\w+) key=\{\1\} value=\{\1\}>\{\1\}<\/\2>$/;

function nameFor(ctx: Ctx, tag: string, from: string | undefined): string {
  if (from === undefined) return tag;
  const module = from === "lucide-react" ? LUCIDE_PACKAGES.vue : from.startsWith("pkg:") ? (VUE_PACKAGES[from.slice(4)] ?? from.slice(4)) : `@/components/ui/${from}`;
  if (!ctx.imports.has(module)) ctx.imports.set(module, new Set());
  ctx.imports.get(module)!.add(tag);
  return tag;
}

// An expression prop's code, when it's the plain name of a state or its setter.
const codeOf = (value: Prop) => (typeof value === "object" && value !== null && "expr" in value ? value.expr.trim() : undefined);

function printProps(ctx: Ctx, tag: string, component: boolean, props: Record<string, Prop>, states: ReadonlyMap<string, string>, indent: string): string[] {
  const out: string[] = [];
  const entries: Record<string, Prop> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!component) {
      entries[key] = value;
      continue;
    }
    const transform = PROP_VALUES[tag]?.[key];
    entries[PROP_NAMES[tag]?.[key] ?? key] = transform === undefined || value === undefined ? value : transform(value);
  }
  // The model, in Reka's names: v-model for a state and its setter; :model-value and
  // @update:model-value otherwise.
  const model = component ? (MODEL[tag] ?? ("open" in entries || "onOpenChange" in entries ? OPEN : undefined)) : undefined;
  if (model !== undefined) {
    const vueName = model === OPEN ? "open" : "modelValue";
    const value = entries[model.value];
    const change = entries[model.change];
    const state = codeOf(value);
    const setter = codeOf(change);
    if (state !== undefined && setter !== undefined && states.get(state) === setter) {
      out.push(vueName === "modelValue" ? `v-model="${state}"` : `v-model:${kebab(vueName)}="${state}"`);
      delete entries[model.value];
      delete entries[model.change];
    } else {
      if (value !== undefined) {
        entries[vueName] = value;
        if (model.value !== vueName) delete entries[model.value];
      }
      if (change !== undefined) {
        out.push(`@update:${kebab(vueName)}="${attrCode(setter ?? "")}"`);
        delete entries[model.change];
      }
    }
    if (model.initial !== undefined && model.initial in entries) {
      entries["defaultValue"] = entries[model.initial];
      delete entries[model.initial];
    }
  }
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === false) continue;
    if (/^on[A-Z]/.test(key)) {
      const code = codeOf(value);
      if (code !== undefined) out.push(`@${kebab(key.slice(2))}="${attrCode(code)}"`);
      continue;
    }
    // A plain element's defaultValue and defaultChecked are its initial value and checked state.
    const name = !component && key === "defaultValue" ? "value" : !component && key === "defaultChecked" ? "checked" : propName(key, component);
    // A model's start is bound, not a bare attribute: Reka's are typed boolean | "indeterminate"
    // and the like, where an empty attribute could be read as the string.
    if (value === true) out.push(component && (key === "defaultValue" || key === "modelValue") ? `:${name}="true"` : name);
    else if (typeof value === "string") out.push(/["\n]/.test(value) ? `:${name}="${attrCode(JSON.stringify(value))}"` : `${name}="${value}"`);
    else if (typeof value === "number") out.push(`:${name}="${value}"`);
    else if ("expr" in value) out.push(`:${name}="${attrCode(value.expr)}"`);
    else throw new Error(`${tag}: a prop given as an element (${key}) has no Vue form yet`);
  }
  return out.map((p) => p.replace(/\n/g, `\n${indent}`));
}

function print(ctx: Ctx, node: Node, states: ReadonlyMap<string, string>, indent: string): string {
  switch (node.k) {
    case "text":
      return `${indent}${templateText(node.text)}`;
    case "expr": {
      const row = ROW_PER_ITEM.exec(node.code.trim());
      if (row !== null && ctx.items !== undefined) {
        const [, item, tag] = row;
        nameFor(ctx, tag!, "combobox");
        return `${indent}<${tag} v-for="${item} in ${attrCode(ctx.items)}" :key="${item}" :value="${item}">{{ ${item} }}</${tag}>`;
      }
      return `${indent}{{ ${node.code} }}`;
    }
    case "frag":
      return node.children.map((c) => print(ctx, c, states, indent)).filter((line) => line !== "").join("\n");
    case "use":
      nameFor(ctx, node.name, node.from);
      return "";
    case "trigger": {
      const as = nameFor(ctx, node.as, node.from);
      return `${indent}<${as} as-child>\n${print(ctx, node.child, states, `${indent}  `)}\n${indent}</${as}>`;
    }
    case "el": {
      const name = nameFor(ctx, node.tag, node.from);
      // A combobox's items become its rows' v-for (Reka's root takes no items).
      const items = node.from === "combobox" && node.tag === "Combobox" ? codeOf(node.props["items"]) : undefined;
      if (items !== undefined) {
        const { items: _, ...rest } = node.props;
        return print({ ...ctx, items }, { ...node, props: rest }, states, indent);
      }
      const props = printProps(ctx, node.tag, node.from !== undefined && node.from !== "lucide-react", node.props, states, `${indent}  `);
      const open = `${indent}<${name}${props.length === 0 ? "" : ` ${props.join(" ")}`}`;
      if (node.children.length === 0) return `${open} />`;
      if (node.children.length === 1 && node.children[0]!.k === "text") return `${open}>${templateText((node.children[0] as { text: string }).text)}</${name}>`;
      const inner = node.children.map((c) => print(ctx, c, states, `${indent}  `)).filter((line) => line !== "");
      if (inner.length === 0) return `${open} />`;
      return `${open}>\n${inner.join("\n")}\n${indent}</${name}>`;
    }
  }
}

// A chart, which the page builds with Recharts for the React preview, written with Unovis as the
// Vue chart is (shadcn-vue's): the series over the categories' places along x, the categories as
// the axis' labels, the grid from the y axis, the tooltip through the crosshair.
const UNOVIS = "pkg:@unovis/vue";
function unovisChart(c: PageChart): Node {
  const place = expr("(_: unknown, i: number) => i");
  const mark = { bar: "VisGroupedBar", line: "VisLine", area: "VisArea" }[c.kind];
  const look = c.kind === "bar" ? { roundedCorners: 4 } : c.kind === "area" ? { opacity: 0.4 } : {};
  const no = expr("false");
  const y = expr(`[${c.series.map((s) => `(d: { ${s}: number }) => d.${s}`).join(", ")}]`);
  return el(
    "ChartContainer",
    "chart",
    { config: expr(c.config), className: c.className },
    el(
      "VisXYContainer",
      UNOVIS,
      { data: expr(c.data) },
      el(mark, UNOVIS, { x: place, y, color: expr(JSON.stringify(c.series.map((s) => `var(--color-${s})`))), ...look }),
      el("VisAxis", UNOVIS, {
        type: "x",
        x: place,
        tickValues: expr(JSON.stringify(c.categories.map((_, i) => i))),
        tickFormat: expr(`(tick: number | Date) => ${JSON.stringify(c.categories)}[Number(tick)] ?? ""`),
        tickLine: no,
        domainLine: no,
        gridLine: no,
      }),
      c.grid ? el("VisAxis", UNOVIS, { type: "y", tickFormat: expr('() => ""'), tickLine: no, domainLine: no }) : null,
      c.tooltip ? el("ChartTooltip", "chart") : null,
      // The crosshair finds the datum under the pointer through the marks' accessors (without them
      // Unovis warns in the console), and the tooltip is headed by the category (x), as React's is.
      c.tooltip ? el("ChartCrosshair", "chart", { x: place, y, template: expr(`componentToString(${c.config}, ChartTooltipContent, { labelKey: "x" })`), color: "#0000" }) : null,
      c.tooltip ? { k: "use", from: "chart", name: "ChartTooltipContent" } : null,
      c.tooltip ? { k: "use", from: "chart", name: "componentToString" } : null,
    ),
    c.legend ? el("ChartLegendContent", "chart") : null,
  );
}

const pascal = (id: string) => id.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");

const printVue: PagePrinter = ({ root, states, exports, name, system }) => {
  const ctx: Ctx = { exports, imports: new Map() };
  const setters = new Map(states.map((s) => [s.value, s.set]));
  const template = print(ctx, replaceCharts(root, unovisChart), setters, "  ");
  const imports = [...ctx.imports.entries()]
    .sort(([a], [b]) => (a === LUCIDE_PACKAGES.vue ? -1 : b === LUCIDE_PACKAGES.vue ? 1 : a.localeCompare(b)))
    .map(([module, names]) => `import { ${[...names].sort().join(", ")} } from "${module}";`);
  // A state, and its setter where the page calls it: a value, or an updater of the last one.
  const declarations = states.flatMap((s) => {
    const ref = `const ${s.value} = ref<${s.type}>(${s.initial});`;
    if (!new RegExp(`\\b${s.set}\\b`).test(template)) return [ref];
    return [ref, `const ${s.set} = (next: ${s.type} | ((last: ${s.type}) => ${s.type})) => (${s.value}.value = typeof next === "function" ? next(${s.value}.value) : next);`];
  });
  const script = [...(states.length > 0 ? ['import { ref } from "vue";'] : []), ...imports, ...(declarations.length > 0 ? ["", ...declarations] : [])];
  const setup = script.length === 0 ? "" : `<script setup lang="ts">\n${script.join("\n")}\n</script>\n\n`;
  // Lucide as printed, then the system's icon library, as its components get.
  const page = `<!-- ${pascal(name)}Page: generated by tesserai from a page spec, using this system's components. -->\n${setup}<template>\n${template}\n</template>\n`;
  return applyVueIcons(page, "page", system);
};

export const printVuePage: PagePrinter = Object.assign(printVue, { framework: "vue" as const });
