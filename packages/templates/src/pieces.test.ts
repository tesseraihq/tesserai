import { applyChangeset, createSystemFromBrand, cssVarName, includedComponents, parseColor, refPath, type Anatomy, type DesignSystem } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { badgePieces } from "./badge";
import { cardPieces } from "./base-ui/card";
import { labelPieces } from "./base-ui/label";
import { tablePieces } from "./base-ui/table";
import { textareaPieces } from "./base-ui/textarea";
import { breadcrumbPieces } from "./breadcrumb";
import { accordionPieces, collapsiblePieces } from "./disclosure";
import { alertPieces, avatarPieces, kbdPieces, progressPieces, separatorPieces, skeletonPieces, spinnerPieces, typographyPieces } from "./display";
import { fieldPieces } from "./field";
import { nativeSelectPieces } from "./native-select";
import { paginationPieces } from "./pagination";
import { attachmentPieces, bubblePieces, markerPieces, messagePieces, messageScrollerPieces, questionnairePieces } from "./chat";
import { chartContainer, chartPieces, chartRoleTokens, type ChartLibrary } from "./chart";
import { dataTablePieces } from "./data-table";
import { calendarPieces } from "./calendar";
import { datePickerPieces } from "./date-picker";
import { checkboxPieces } from "./radix/checkbox";
import { dropdownMenuPieces } from "./radix/dropdown-menu";
import { inputPieces } from "./radix/input";
import { popoverPieces } from "./radix/popover";
import { radioGroupPieces } from "./radix/radio-group";
import { selectPieces } from "./radix/select";
import { sliderPieces } from "./radix/slider";
import { RADIX_STATES } from "./radix/states";
import { switchPieces } from "./radix/switch";
import { RADIX_TOGGLE_STATES } from "./radix/toggle";
import { tooltipPieces } from "./radix/tooltip";
import { renderComponent } from "./render";
import { tabsPieces } from "./tabs-shared";
import { aspectRatioPieces, buttonGroupPieces, emptyPieces, itemPieces } from "./display";
import { inputGroupPieces } from "./input-group";
import { inputOtpPieces } from "./input-otp";
import { scrollAreaPieces } from "./scroll-area";
import { resizablePieces } from "./resizable";
import { carouselPieces } from "./carousel";
import { sidebarPieces } from "./sidebar";
import { comboboxPieces } from "./combobox";
import { commandPieces } from "./command";
import { navigationMenuPieces } from "./navigation-menu";
import { contextMenuPieces } from "./radix/context-menu";
import { drawerPieces } from "./radix/drawer";
import { hoverCardPieces } from "./radix/hover-card";
import { menubarPieces } from "./radix/menubar";
import { toastSlotPieces } from "./radix/toast";
import { sonnerPieces } from "./sonner";
import { togglePieces, toggleGroupPieces } from "./toggle-shared";

// The contract the Vue and Svelte shells rely on: a component's pieces hold, slot by slot, exactly
// the classes the Radix React output gives each data-slot element.

const PIECES: Record<string, (anatomy: Anatomy, system: DesignSystem) => { slots: object }> = {
  badge: (a) => badgePieces(a),
  input: (a) => inputPieces(a),
  textarea: (a) => textareaPieces(a),
  label: (a) => labelPieces(a),
  field: (a) => fieldPieces(a),
  checkbox: (a) => checkboxPieces(a),
  switch: (a) => switchPieces(a),
  "radio-group": (a) => radioGroupPieces(a),
  select: (a) => selectPieces(a),
  "native-select": (a) => nativeSelectPieces(a),
  card: (a) => cardPieces(a),
  separator: (a) => separatorPieces(a),
  skeleton: (a) => skeletonPieces(a),
  spinner: (a) => spinnerPieces(a),
  kbd: (a) => kbdPieces(a),
  alert: (a) => alertPieces(a),
  avatar: (a) => avatarPieces(a),
  typography: (a) => typographyPieces(a),
  table: (a) => tablePieces(a),
  tabs: (a) => tabsPieces(a),
  accordion: (a) => accordionPieces(a),
  collapsible: (a) => collapsiblePieces(a),
  toggle: (a) => togglePieces(a, RADIX_TOGGLE_STATES),
  "toggle-group": (a) => toggleGroupPieces(a, RADIX_STATES),
  tooltip: (a) => tooltipPieces(a),
  popover: (a) => popoverPieces(a),
  "dropdown-menu": (a) => dropdownMenuPieces(a),
  progress: (a) => progressPieces(a),
  slider: (a) => sliderPieces(a),
  breadcrumb: (a) => breadcrumbPieces(a),
  pagination: (a) => paginationPieces(a),
  "aspect-ratio": () => aspectRatioPieces(),
  "button-group": (a) => buttonGroupPieces(a),
  empty: (a) => emptyPieces(a),
  item: (a) => itemPieces(a),
  "input-group": (a) => inputGroupPieces(a),
  "input-otp": (a) => inputOtpPieces(a),
  "scroll-area": (a) => scrollAreaPieces(a),
  resizable: (a) => resizablePieces(a),
  // Radix's direction provider renders no element and takes no classes.
  direction: () => ({ slots: {} }),
  sidebar: (a) => sidebarPieces(a),
  carousel: (a) => carouselPieces(a),
  message: (a) => messagePieces(a),
  bubble: (a) => bubblePieces(a),
  attachment: (a) => attachmentPieces(a),
  marker: (a) => markerPieces(a),
  "data-table": (a) => dataTablePieces(a),
  // react-day-picker gives its Root (data-slot="calendar") the root classes through className, so
  // the element itself writes none: they're its calendar:root entry here.
  calendar: (a) => {
    const { slots } = calendarPieces(a);
    return { slots: { ...slots, calendar: [], "calendar:root": slots.calendar } };
  },
  "date-picker": (a) => datePickerPieces(a),
  "context-menu": (a) => contextMenuPieces(a),
  menubar: (a) => menubarPieces(a),
  "hover-card": (a) => hoverCardPieces(a),
  drawer: (a) => drawerPieces(a),
  command: (a) => commandPieces(a),
  combobox: (a) => comboboxPieces(a),
  "navigation-menu": (a) => navigationMenuPieces(a),
  toast: (a, system) => toastSlotPieces(a, { intents: system.intents }),
  chart: (a) => chartPieces(a),
  "message-scroller": (a) => messageScrollerPieces(a),
  questionnaire: (a) => questionnairePieces(a),
};

// A system whose components vary by every axis the templates support: added, renamed and left-out
// options, new defaults, and styles scoped to a variant, an intent, a size or a combination.
const all = { kind: "all" } as const;
const style = (component: string, part: string, property: string, value: string, scope: object = all, state = "default") => ({
  op: "component.setStyle",
  input: { component, part, scope, state, property, value },
});
const CUSTOM_OPS = [
  { op: "component.addOption", input: { component: "badge", axis: "size", name: "lg", copyFrom: "md" } },
  { op: "component.renameOption", input: { component: "badge", axis: "variant", name: "soft", to: "tonal" } },
  style("badge", "root", "textTransform", "uppercase", { kind: "size", name: "sm" }),
  style("badge", "root", "fontWeight", "700", { kind: "intent", name: "danger" }, "hover"),
  { op: "component.addOption", input: { component: "input", axis: "size", name: "xl", copyFrom: "lg" } },
  style("input", "placeholder", "fontStyle", "italic"),
  style("input", "root", "letterSpacing", "1px", { kind: "size", name: "sm" }),
  style("textarea", "root", "textTransform", "lowercase", all, "disabled"),
  style("label", "root", "textTransform", "uppercase"),
  style("field", "label", "fontStyle", "italic"),
  style("field", "choice", "border", "{intent.primary.border}", all, "selected"),
  style("checkbox", "root", "radius", "{radius.full}", { kind: "size", name: "sm" }),
  style("checkbox", "indicator", "opacity", "0.9", all, "disabled"),
  { op: "component.addOption", input: { component: "switch", axis: "size", name: "lg", copyFrom: "md" } },
  { op: "component.addOption", input: { component: "radio-group", axis: "size", name: "lg", copyFrom: "md" } },
  style("radio-group", "item", "scale", "0.95", all, "pressed"),
  { op: "component.setDefault", input: { component: "select", axis: "size", option: "lg" } },
  style("select", "item", "fontWeight", "600", all, "selected"),
  style("select", "trigger", "textTransform", "uppercase", { kind: "size", name: "sm" }),
  style("native-select", "select", "fontStyle", "italic", { kind: "size", name: "sm" }),
  { op: "component.setOption", input: { component: "card", axis: "size", option: "sm", enabled: false } },
  style("card", "title", "textTransform", "uppercase"),
  style("separator", "root", "opacity", "0.5"),
  style("skeleton", "root", "radius", "{radius.full}"),
  style("spinner", "root", "opacity", "0.7"),
  style("kbd", "root", "fontStyle", "italic"),
  { op: "component.addOption", input: { component: "alert", axis: "variant", name: "solid", copyFrom: "soft" } },
  style("alert", "title", "fontWeight", "700", { kind: "intent", name: "danger" }),
  style("avatar", "fallback", "textTransform", "uppercase", { kind: "size", name: "lg" }),
  style("typography", "h2", "textTransform", "uppercase"),
  style("table", "row", "fontWeight", "600", all, "selected"),
  { op: "component.addOption", input: { component: "tabs", axis: "variant", name: "pill", copyFrom: "segmented" } },
  style("tabs", "tab", "textTransform", "uppercase", { kind: "variant", name: "line" }),
  style("accordion", "trigger", "textTransform", "uppercase"),
  style("accordion", "content", "duration", "300ms"),
  style("collapsible", "content", "duration", "300ms"),
  style("toggle", "root", "fontWeight", "700", { kind: "combination", when: { variant: "outline", size: "sm" } }),
  { op: "component.setDefault", input: { component: "toggle", axis: "variant", option: "outline" } },
  style("toggle-group", "group", "gap", "{space.2}"),
  style("tooltip", "arrow", "opacity", "0.9"),
  style("popover", "title", "textTransform", "uppercase"),
  style("dropdown-menu", "item", "fontWeight", "500", all, "highlighted"),
  style("dropdown-menu", "shortcut", "fontStyle", "italic"),
  style("progress", "indicator", "opacity", "0.8"),
  style("slider", "thumb", "scale", "1.1", all, "dragging"),
  style("breadcrumb", "link", "textDecoration", "underline", all, "hover"),
  style("pagination", "ellipsis", "opacity", "0.6"),
  style("button-group", "text", "fontWeight", "600"),
  style("empty", "title", "textTransform", "uppercase"),
  { op: "component.setDefault", input: { component: "item", axis: "size", option: "sm" } },
  style("item", "root", "fontWeight", "600", { kind: "variant", name: "outline" }),
  style("input-group", "addon", "fontStyle", "italic"),
  style("input-otp", "slot", "fontWeight", "700"),
  style("scroll-area", "thumb", "opacity", "0.8"),
  style("resizable", "handle", "opacity", "0.5"),
  style("carousel", "control", "opacity", "0.9"),
  { op: "component.setDefault", input: { component: "sidebar", axis: "size", option: "lg" } },
  style("sidebar", "item", "fontWeight", "600", all, "current"),
  style("message", "header", "fontWeight", "600"),
  { op: "component.addOption", input: { component: "bubble", axis: "variant", name: "tinted", copyFrom: "soft" } },
  style("bubble", "content", "fontStyle", "italic", { kind: "intent", name: "danger" }),
  style("bubble", "content", "opacity", "0.9", all, "hover"),
  { op: "component.addOption", input: { component: "attachment", axis: "size", name: "lg", copyFrom: "md" } },
  style("attachment", "title", "fontWeight", "600", { kind: "size", name: "xs" }),
  style("marker", "rule", "opacity", "0.5"),
  style("data-table", "footer", "fontStyle", "italic"),
  style("data-table", "empty", "opacity", "0.7"),
  style("calendar", "caption", "textTransform", "uppercase"),
  style("calendar", "day", "fontWeight", "500", all, "hover"),
  style("date-picker", "placeholder", "fontStyle", "italic"),
  style("context-menu", "item", "fontWeight", "500", all, "highlighted"),
  style("context-menu", "popup", "shadow", "{shadow.lg}"),
  style("menubar", "trigger", "fontWeight", "600", all, "open"),
  style("menubar", "bar", "gap", "{space.2}"),
  style("hover-card", "popup", "padding", "{space.6}"),
  style("drawer", "handle", "opacity", "0.6"),
  style("drawer", "title", "textTransform", "uppercase"),
  style("command", "item", "fontWeight", "600", all, "highlighted"),
  style("command", "group-heading", "textTransform", "uppercase"),
  style("combobox", "item", "fontWeight", "600", all, "selected"),
  style("combobox", "field", "shadow", "{shadow.sm}", all, "focus-visible"),
  style("navigation-menu", "link", "textDecoration", "underline", all, "current"),
  style("navigation-menu", "trigger", "fontWeight", "600", all, "open"),
  style("toast", "title", "textTransform", "uppercase"),
  style("toast", "root", "borderWidth", "2px", { kind: "intent", name: "danger" }),
  style("sonner", "toast", "shadow", "{shadow.lg}"),
  style("chart", "grid", "border", "{intent.primary.border}"),
  style("chart", "tooltip-label", "textTransform", "uppercase"),
  style("message-scroller", "content", "gap", "{space.3}"),
  style("questionnaire", "choice", "fontWeight", "600", all, "selected"),
  style("questionnaire", "shortcut", "textTransform", "uppercase"),
];

function customized(): DesignSystem {
  const result = applyChangeset(createSystemFromBrand("t", parseColor("#7c3aed")!), { ops: CUSTOM_OPS as never });
  if (!result.ok) throw new Error(result.error);
  return result.system;
}

// ---------- reading the React output ----------

// Index just past the string literal starting at i.
function skipString(src: string, i: number): number {
  const quote = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === "\\") j++;
    else if (src[j] === quote) return j + 1;
  }
  throw new Error(`unterminated string at ${i}`);
}

// The text from src[open] (an opening bracket) to its matching close, strings skipped.
function balanced(src: string, open: number): string {
  const pairs: Record<string, string> = { "(": ")", "{": "}" };
  const close = pairs[src[open]!]!;
  let depth = 0;
  for (let i = open; i < src.length; ) {
    const ch = src[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(src, i);
      continue;
    }
    if (ch === src[open]) depth++;
    else if (ch === close && --depth === 0) return src.slice(open, i + 1);
    i++;
  }
  throw new Error(`unbalanced ${src[open]} at ${open}`);
}

// The string literals in an expression, and the identifiers outside them. A string compared with
// something (orientation === "horizontal") is a value the classes are chosen by, not a class.
function scan(expr: string): { strings: string[]; identifiers: string[] } {
  const strings: string[] = [];
  let rest = "";
  for (let i = 0; i < expr.length; ) {
    const ch = expr[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipString(expr, i);
      // A string compared against (orientation === "vertical") is a value, not classes.
      const compared = /[!=]==?\s*$/.test(rest) || /^\s*[!=]==?/.test(expr.slice(end));
      if (!compared) strings.push(ch === '"' ? (JSON.parse(expr.slice(i, end)) as string) : expr.slice(i + 1, end - 1));
      rest += " ";
      i = end;
      continue;
    }
    rest += ch;
    i++;
  }
  return { strings, identifiers: rest.match(/[A-Za-z_$][\w$]*/g) ?? [] };
}

type CvaLike = { base: unknown; variants?: Record<string, Record<string, unknown>>; compoundVariants?: Record<string, unknown>[]; defaultVariants?: Record<string, unknown> };
type Found = { slot: string; cvas: CvaLike[]; classes: string[] };

// Every element the source gives a data-slot and a className, with the className's classes: string
// literals, string constants and cva functions defined in the file. A cva imported from another
// component (Toggle Group's toggleVariants) is left out: that component's pieces hold it.
function styledSlots(src: string): { found: Found[]; slots: Set<string> } {
  const cvas = new Map<string, CvaLike>();
  for (const m of src.matchAll(/const (\w+) = cva\(/g)) {
    const args = balanced(src, m.index + m[0].length - 1);
    cvas.set(m[1]!, new Function("cva", `return cva${args};`)((base: unknown, config: object) => ({ base, ...config })) as CvaLike);
  }
  const constants = new Map<string, string>();
  for (const m of src.matchAll(/const (\w+) = ("(?:[^"\\]|\\.)*");/g)) constants.set(m[1]!, JSON.parse(m[2]!) as string);

  const found: Found[] = [];
  const slots = new Set<string>();
  for (const m of src.matchAll(/data-slot="([^"]+)"|"data-slot": "([^"]+)"/g)) {
    const slot = (m[1] ?? m[2])!;
    slots.add(slot);
    // Back to the tag's "<", over any attribute expressions before this one.
    let depth = 0;
    let start = m.index;
    for (; start >= 0; start--) {
      const ch = src[start];
      if (ch === "}") depth++;
      else if (ch === "{") depth--;
      else if (ch === "<" && depth <= 0 && /[A-Za-z]/.test(src[start + 1] ?? "")) break;
    }
    // Forward to the tag's ">", collecting its className.
    depth = 0;
    let value: string | undefined;
    for (let i = start + 1; i < src.length; ) {
      const ch = src[i]!;
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(src, i);
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
      else if (depth === 0 && src.startsWith("className=", i)) {
        const at = i + "className=".length;
        value = src[at] === '"' ? src.slice(at, skipString(src, at)) : balanced(src, at);
        i = at + value.length;
        continue;
      }
      i++;
    }
    if (value === undefined) continue;
    const { strings, identifiers } = scan(value);
    const classes = strings.flatMap((s) => s.split(/\s+/)).filter(Boolean);
    const used: CvaLike[] = [];
    for (const id of identifiers) {
      const cva = cvas.get(id);
      if (cva !== undefined) used.push(cva);
      const constant = constants.get(id);
      if (constant !== undefined) classes.push(...constant.split(/\s+/).filter(Boolean));
    }
    found.push({ slot, cvas: used, classes });
  }
  return { found, slots };
}

// ---------- comparing ----------

const tokens = (classes: unknown): string[] => {
  const list = Array.isArray(classes) ? (classes as string[]) : String(classes ?? "").split(/\s+/);
  return [...new Set(list.filter(Boolean))].sort();
};

// A cva in one shape whichever side it came from: the React source's cva(base, config) or a
// pieces CvaConfig. Class lists become sorted sets; compound variants a sorted list.
function normalize(cva: CvaLike, extra: string[] = []) {
  const variants = Object.fromEntries(
    Object.entries(cva.variants ?? {}).map(([axis, values]) => [axis, Object.fromEntries(Object.entries(values).map(([value, classes]) => [value, tokens(classes)]))]),
  );
  const compound = (cva.compoundVariants ?? [])
    .map((c) => {
      const { class: cls, classes, selection, ...rest } = c as { class?: unknown; classes?: unknown; selection?: Record<string, unknown> };
      const when = Object.entries(selection ?? rest).sort(([a], [b]) => a.localeCompare(b));
      return `${JSON.stringify(when)} ${tokens(cls ?? classes).join(" ")}`;
    })
    .sort();
  return { base: tokens([...tokens(cva.base), ...extra]), variants, compound, defaults: Object.fromEntries(Object.entries(cva.defaultVariants ?? {}).sort()) };
}

// Both sides in one comparable shape: a sorted class list, or a normalized cva.
function comparable(found: Found): unknown {
  if (found.cvas.length > 1) throw new Error(`${found.slot} combines ${found.cvas.length} cva functions`);
  const cva = found.cvas[0];
  return cva === undefined ? tokens(found.classes) : normalize(cva, found.classes);
}
const comparablePiece = (piece: unknown): unknown => (Array.isArray(piece) ? tokens(piece) : normalize(piece as CvaLike));

// Every class a piece holds, whatever its shape.
function pieceClasses(piece: unknown): string[] {
  if (Array.isArray(piece)) return piece as string[];
  const cva = piece as CvaLike;
  return [
    ...tokens(cva.base),
    ...Object.values(cva.variants ?? {}).flatMap((values) => Object.values(values).flatMap(tokens)),
    ...(cva.compoundVariants ?? []).flatMap((c) => tokens((c as { classes?: unknown }).classes)),
  ];
}

// The default preset's pieces are held by the Vue and Svelte parity suites (both compare every
// slot with the Radix output); the customized system varies components those suites don't.
const SYSTEMS: [string, () => DesignSystem][] = [["a customized system", customized]];

for (const [label, build] of SYSTEMS) {
  describe(`pieces match the Radix React output, on ${label}`, () => {
    const system = build();
    const components = includedComponents(system);

    it("covers every component in the set", () => {
      expect(Object.keys(PIECES).filter((name) => components[name] === undefined)).toEqual([]);
    });

    // Sonner renders no data-slot of ours: its pieces are the toastOptions class names by key, its
    // CSS variables, and the Toaster's and icons' classes, each read back from the React output.
    it("sonner", async () => {
      const anatomy = components["sonner"]!;
      const src = await renderComponent("radix", anatomy, { intents: system.intents }, { format: false });
      const p = sonnerPieces(anatomy);
      const block = /classNames: \{\n([\s\S]*?)\n\s*\.\.\.toastOptions\?\.classNames/.exec(src)![1]!;
      const written = Object.fromEntries([...block.matchAll(/^\s*(\w+): ("(?:[^"\\]|\\.)*"),$/gm)].map((m) => [m[1]!, tokens(JSON.parse(m[2]!))]));
      expect(written).toEqual(Object.fromEntries(Object.entries(p.classNames).map(([k, v]) => [k, tokens(v)])));
      const vars = Object.fromEntries([...src.matchAll(/^\s*"(--[\w-]+)": ("[^"]*"),$/gm)].map((m) => [m[1]!, JSON.parse(m[2]!) as string]));
      expect(vars).toEqual(p.vars);
      const classNames = [...src.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
      expect(classNames).toEqual([p.toaster, p.icon, p.icon, p.icon, p.icon, p.loadingIcon].map((c) => c.join(" ")));
    });

    // The chart's container is the one part each framework's library draws into: Recharts, Unovis
    // and LayerChart each get the system's color for a role (the axes' labels, the grid, the
    // cursor) where that library draws it. Each role's color must be the same token in all three.
    it("chart: every library's container paints each role with the system's token for it", () => {
      const anatomy = components["chart"]!;
      const tokens = chartRoleTokens(anatomy);
      // The variable a class paints with: fill-neutral-text is --color-neutral-text; fill-(color:--x) is --x.
      const variableOf = (utility: string) => /\(color:(--[\w-]+)\)$/.exec(utility)?.[1] ?? `--color-${utility.replace(/^(fill|stroke)-/, "")}`;
      const painted = (library: ChartLibrary) => {
        const found = new Map<string, Set<string>>();
        for (const c of chartContainer(anatomy, library)) {
          const variable = /^\[--vis-[\w-]+:var\((--[\w-]+)\)\]$/.exec(c)?.[1] ?? (/^\[&_[^\]]+\]+:((fill|stroke)-.+)$/.test(c) && !/-transparent$/.test(c) ? variableOf(c.slice(c.lastIndexOf(":") + 1)) : undefined);
          if (variable !== undefined) found.set(variable, (found.get(variable) ?? new Set()).add(c));
        }
        return found;
      };
      const expected = new Set(Object.values(tokens).map((ref) => cssVarName(refPath(ref))));
      for (const library of ["recharts", "layerchart"] as const) expect(new Set(painted(library).keys()), library).toEqual(expected);
      // Unovis draws no band behind a hovered bar, so the cursor's fill has nowhere to go.
      const unovis = new Set(painted("unovis").keys());
      expect([...expected].filter((v) => !unovis.has(v))).toEqual(tokens["cursor-fill"] === undefined || unovis.has(cssVarName(refPath(tokens["cursor-fill"]))) ? [] : [cssVarName(refPath(tokens["cursor-fill"]))]);
      // The rest of each container is the same: the layout and the axes' type size.
      const common = chartContainer(anatomy, "recharts").filter((c) => !c.startsWith("["));
      for (const library of ["unovis", "layerchart"] as const) expect(chartContainer(anatomy, library), library).toEqual(expect.arrayContaining(common));
    });

    for (const [name, piecesOf] of Object.entries(PIECES)) {
      it(name, async () => {
        const anatomy = components[name]!;
        const src = await renderComponent("radix", anatomy, { intents: system.intents }, { format: false });
        const slots = piecesOf(anatomy, system).slots as Record<string, unknown>;
        const { found, slots: present } = styledSlots(src);

        // Each styled element matches its slot, or a "<slot>:<name>" entry for a second element
        // sharing the slot. "<slot>:+<name>" entries are classes the element adds beside its slot's
        // own (one per orientation, say), which the source lists in the same className.
        for (const element of found) {
          const added = Object.entries(slots).filter(([key]) => key.startsWith(`${element.slot}:+`)).flatMap(([, piece]) => piece as string[]);
          const withAdded = (key: string, piece: unknown): unknown =>
            key !== element.slot || added.length === 0 ? piece : Array.isArray(piece) ? [...(piece as string[]), ...added] : { ...(piece as CvaLike), base: [...tokens((piece as CvaLike).base), ...added] };
          const candidates = Object.entries(slots)
            .filter(([key]) => (key === element.slot || key.startsWith(`${element.slot}:`)) && !key.startsWith(`${element.slot}:+`))
            .map(([key, piece]) => [key, withAdded(key, piece)] as const);
          expect(candidates.map(([key]) => key), `pieces have no entry for ${element.slot}`).not.toEqual([]);
          const actual = comparable(element);
          // One candidate: a diff says what differs. Several: one of them must match.
          if (candidates.length === 1) expect(comparablePiece(candidates[0]![1]), element.slot).toEqual(actual);
          else expect(candidates.filter(([, piece]) => JSON.stringify(comparablePiece(piece)) === JSON.stringify(actual)).map(([key]) => key), `${element.slot} matches none of its entries`).not.toEqual([]);
        }

        // Every entry names a data-slot of the output: its own, or the one it sits in or shares.
        const styled = new Set(found.map((f) => f.slot));
        for (const key of Object.keys(slots)) {
          const [slot, inner] = key.split(":");
          if (inner === undefined) expect(styled.has(slot!), `${key} is not a styled data-slot of the output`).toBe(true);
          else expect(present.has(slot!), `${key} names no data-slot of the output`).toBe(true);
        }

        // Entries for unslotted elements aren't matched above; their classes must still be in the output.
        const written = new Set(src.split(/[\s"'`]+/));
        for (const [key, piece] of Object.entries(slots)) {
          // A class with a quote in it (the chart's [stroke='#ccc'] selectors) is found whole.
          for (const c of pieceClasses(piece)) expect(written.has(c) || (/['"`]/.test(c) && src.includes(c)), `${key}: ${c}`).toBe(true);
        }
      });
    }
  });
}
