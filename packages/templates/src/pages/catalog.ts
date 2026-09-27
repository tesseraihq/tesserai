import type { Base, DesignSystem, Framework } from "@tesserai/core";
import { z } from "zod";
import { el, expr, frag, html, type Node, type Prop } from "./jsx";

// What a page can be built from: layout pieces whose sizes come only from the system's tokens,
// and the system's own components with the content they take. Each entry has a props schema (for
// validation, and later the model's catalog) and an adapter that builds the tree.

// Icons pages may use, by lucide name; the preview provides exactly these.
export const PAGE_ICONS = [
  "home", "inbox", "layers", "users", "settings", "search", "plus", "filter", "download", "bell", "calendar", "mail",
  "info", "triangle-alert", "circle-check", "circle-alert", "trash-2", "pencil", "star", "folder", "file-text",
  "chart-column", "credit-card", "log-out", "user", "x", "check", "chevron-down", "ellipsis", "sliders-horizontal", "arrow-right",
] as const;
export const pageIconName = (icon: string) => icon.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("") + "Icon";

const Icon = z.enum(PAGE_ICONS);
const Gap = z.union([z.literal(0), z.literal(1), z.literal(1.5), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(8), z.literal(10)]);
const TypeStep = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);
const Tone = z.enum(["default", "muted", "strong", "danger", "warning", "success", "info"]);
const Option = z.object({ value: z.string().min(1), label: z.string().min(1) }).strict();
const Width = z.enum(["xs", "sm", "md", "full"]);

// What an adapter gets: its props (validated), its children and slots already built, and the
// page being printed.
export type BuildContext = {
  base: Base;
  // The framework the page is printed for: a Vue or Svelte page is built the Radix way (base), and
  // the few elements whose code differs by framework (a calendar's dates, a data table's columns) ask.
  framework: Framework;
  // Included, generated, and exporting this name (or any name when omitted).
  has: (component: string, name?: string) => boolean;
  // The options a component's axis offers in this system.
  axis: (component: string, axis: "variant" | "intent" | "size") => readonly string[] | undefined;
  intents: readonly string[];
  // Declares React state at the top of the page; returns the names to read and set it with.
  state: (name: string, type: string, initial: string) => { value: string; set: string };
  key: string;
  // A DOM id for an element, made from a hint ("Email" -> "email") and unique on the page.
  idFor: (key: string, hint: string) => string;
  // Set while building a Field's control, so it can take the label's id and the error state.
  field: { id: string; labelId: string; invalid: boolean } | undefined;
  // Set while building inside an overlay, so a button can close it.
  overlay: { from: string; close: string; compose?: Base } | undefined;
  // Set inside an app shell, whose inset already fills the screen.
  inShell: boolean;
};

export type Built = { children: Node[]; slots: Record<string, Node[]> };

export type CatalogEntry = {
  // The generated component this needs, if any.
  component?: string;
  description: string;
  props: z.ZodObject;
  // Which of the component's axes the element takes as props (variant, intent, size).
  axes?: readonly ("variant" | "intent" | "size")[];
  slots?: readonly string[];
  // Slots named by the element's own props (a tab's value, an accordion item's value).
  slotsFrom?: (props: Record<string, unknown>) => readonly string[];
  children?: boolean;
  // The only types this may be a child of, and the only types its children may be.
  parents?: readonly string[];
  childTypes?: readonly string[];
  // When the component is left out: show the children in its place, only the trigger slot, or nothing.
  fallback?: "children" | "trigger";
  // Context its children are built in.
  inner?: (props: Record<string, unknown>, ctx: BuildContext) => Partial<Pick<BuildContext, "field" | "overlay" | "inShell">>;
  build: (props: Record<string, unknown>, built: Built, ctx: BuildContext) => Node;
};

const cx = (...classes: (string | false | undefined | null)[]) => classes.filter(Boolean).join(" ");
const toneClass = (tone: string | undefined, ctx: BuildContext) => {
  if (tone === undefined || tone === "default") return undefined;
  if (tone === "muted") return "text-neutral-text";
  if (tone === "strong") return "text-neutral-text-strong";
  return ctx.intents.includes(tone) ? `text-${tone}-text` : "text-neutral-text";
};
// Fixed widths never push past a narrow screen.
const widthClass = (width: string | undefined) => ({ xs: "w-40 max-w-full", sm: "w-64 max-w-full", md: "w-80 max-w-full", full: "w-full" })[width ?? ""];
const axisProps = (component: string, props: Record<string, unknown>, ctx: BuildContext, axes: readonly ("variant" | "intent" | "size")[]): Record<string, Prop> => {
  const out: Record<string, Prop> = {};
  for (const axis of axes) {
    const value = props[axis];
    // An option the system doesn't offer is dropped, so the component's default applies.
    if (typeof value === "string" && ctx.axis(component, axis)?.includes(value)) out[axis] = value;
  }
  return out;
};
const icon = (name: string, props: Record<string, Prop> = {}) => el(pageIconName(name), "lucide-react", props);

// A control with its label beside it: React Aria's Checkbox, Switch and Radio are themselves the
// label; elsewhere a <label> wraps the control.
function labeled(ctx: BuildContext, control: Node & { k: "el" }, label: string): Node {
  const span = html("span", { className: "text-2" }, label);
  if (ctx.base === "react-aria") return { ...control, children: [span] };
  return html("label", { className: "flex items-center gap-2" }, control, span);
}

// The label/description/error around a control (the system's Field when it has one).
function fieldControlProps(ctx: BuildContext, labelable: boolean): Record<string, Prop> {
  const f = ctx.field;
  if (f === undefined) return {};
  return { ...(labelable ? { id: f.id } : { "aria-labelledby": f.labelId }), ...(f.invalid ? { "aria-invalid": "true" } : {}) };
}

export const CATALOG: Record<string, CatalogEntry> = {
  // ---------- layout ----------
  Page: {
    description: "The page itself: its background, padding and width. The root of every page.",
    props: z.object({ width: z.enum(["sm", "md", "lg", "xl", "full"]).optional(), align: z.enum(["top", "center"]).optional() }).strict(),
    children: true,
    build: (p, { children }, ctx) => {
      const max = { sm: "max-w-sm", md: "max-w-2xl", lg: "max-w-5xl", xl: "max-w-7xl", full: "" }[(p.width as string) ?? "md"];
      if (p.align === "center") {
        return html("main", { className: "bg-background text-neutral-text-strong flex min-h-screen items-center justify-center p-6 max-sm:p-4" }, html("div", { className: cx("@container flex w-full flex-col gap-6", max) }, ...children));
      }
      // The page's content is a container: grids and columns in it answer to the room they have
      // (beside a sidebar, in a card), not to the whole screen.
      const outer = ctx.inShell ? "text-neutral-text-strong p-8 pt-0 max-sm:px-4" : "bg-background text-neutral-text-strong min-h-screen p-8 max-sm:p-4";
      return html(ctx.inShell ? "div" : "main", { className: outer }, html("div", { className: cx("@container mx-auto flex w-full flex-col gap-6", max) }, ...children));
    },
  },
  Stack: {
    description: "Children one above the other, with a gap from the spacing scale.",
    props: z.object({ gap: Gap.optional(), align: z.enum(["stretch", "start", "center", "end"]).optional() }).strict(),
    children: true,
    build: (p, { children }) => html("div", { className: cx("flex flex-col", `gap-${p.gap ?? 4}`, p.align !== undefined && p.align !== "stretch" && `items-${p.align}`) }, ...children),
  },
  Row: {
    description: "Short items side by side (buttons, badges, a title and its actions), with a gap from the spacing scale; wraps when narrow. For side-by-side regions of a page, use Columns.",
    props: z.object({ gap: Gap.optional(), align: z.enum(["start", "center", "end", "baseline"]).optional(), justify: z.enum(["start", "center", "between", "end"]).optional(), wrap: z.boolean().optional() }).strict(),
    children: true,
    build: (p, { children }) =>
      html(
        "div",
        // Not wrapping, its items may shrink rather than push past the edge.
        { className: cx("flex", `items-${p.align ?? "center"}`, `gap-${p.gap ?? 2}`, p.justify !== undefined && p.justify !== "start" && `justify-${p.justify}`, p.wrap !== false ? "flex-wrap" : "*:min-w-0") },
        ...children,
      ),
  },
  Grid: {
    description: "Children in equal columns (cards, stats, tiles). They follow the room the grid has: one column when narrow, two, then all of them.",
    props: z.object({ columns: z.union([z.literal(2), z.literal(3), z.literal(4)]), gap: Gap.optional() }).strict(),
    children: true,
    // By the space it's in (the nearest @container: the page, a card, a column, a panel), so a grid
    // beside a sidebar or inside a card steps down on its own.
    build: (p, { children }) =>
      html("div", { className: cx("grid grid-cols-1 *:min-w-0", `gap-${p.gap ?? 4}`, "@md:grid-cols-2", p.columns === 3 && "@2xl:grid-cols-3", p.columns === 4 && "@3xl:grid-cols-4") }, ...children),
  },
  Columns: {
    description: "Two or three side-by-side regions of a page (main content and a side panel, a list and its detail), split by ratio. They stack, in order, when there isn't room.",
    props: z.object({ split: z.enum(["1:1", "2:1", "1:2", "3:1", "1:3", "1:1:1"]).optional(), gap: Gap.optional() }).strict(),
    children: true,
    build: (p, { children }) => {
      const tracks = { "1:1": "@3xl:grid-cols-2", "2:1": "@3xl:grid-cols-[2fr_1fr]", "1:2": "@3xl:grid-cols-[1fr_2fr]", "3:1": "@3xl:grid-cols-[3fr_1fr]", "1:3": "@3xl:grid-cols-[1fr_3fr]", "1:1:1": "@3xl:grid-cols-3" }[(p.split as string) ?? "2:1"];
      // Each column is a container too, so what's inside answers to the column's width.
      return html("div", { className: cx("grid grid-cols-1 items-start", `gap-${p.gap ?? 6}`, tracks) }, ...children.map((child) => html("div", { className: "@container flex min-w-0 flex-col gap-6" }, child)));
    },
  },
  Heading: {
    description: "A heading, sized by a step of the type scale, in the system's heading face.",
    props: z.object({ text: z.string().min(1), size: TypeStep.optional(), level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() }).strict(),
    // In the heading face, as the system's own headings (card titles, dialogs) are: a system with a
    // display face for headings showed its example screens' titles in the body face.
    build: (p) => html(`h${(p.level as number | undefined) ?? 1}`, { className: `font-heading text-${p.size ?? 4} font-semibold` }, p.text as string),
  },
  Text: {
    description: "A line or paragraph of text, with a tone and a size from the type scale.",
    props: z.object({ text: z.string().min(1), tone: Tone.optional(), size: TypeStep.optional(), mono: z.boolean().optional(), align: z.enum(["start", "end"]).optional() }).strict(),
    build: (p, _b, ctx) => html("span", { className: cx(toneClass(p.tone as string, ctx), p.size !== undefined && `text-${p.size}`, p.mono === true && "font-mono", p.align === "end" && "block text-right") || undefined }, p.text as string),
  },
  Spacer: {
    description: "Pushes what follows to the far end of a row.",
    props: z.object({}).strict(),
    build: () => html("span", { className: "flex-1" }),
  },
  Field: {
    description: "A label (and optional description or error) for one control: Input, Textarea, Select, RadioGroup, Slider or InputOTP.",
    props: z.object({ label: z.string().min(1), description: z.string().optional(), error: z.string().optional() }).strict(),
    children: true,
    inner: (p, ctx) => {
      const id = ctx.idFor(ctx.key, p.label as string);
      return { field: { id, labelId: `${id}-label`, invalid: p.error !== undefined } };
    },
    build: (p, { children }, ctx) => {
      const id = ctx.idFor(ctx.key, p.label as string);
      const labelFor = { id: `${id}-label`, htmlFor: id };
      if (ctx.has("field")) {
        return el(
          "Field",
          "field",
          p.error === undefined ? {} : { "data-invalid": "true" },
          el("FieldLabel", "field", labelFor, p.label as string),
          ...children,
          p.description === undefined ? null : el("FieldDescription", "field", {}, p.description as string),
          p.error === undefined ? null : el("FieldError", "field", {}, p.error as string),
        );
      }
      return html(
        "div",
        { className: "flex flex-col gap-1.5" },
        html("label", { ...labelFor, className: "text-neutral-text text-2" }, p.label as string),
        ...children,
        p.description === undefined ? null : html("span", { className: "text-neutral-text text-1" }, p.description as string),
        p.error === undefined ? null : html("span", { className: "text-danger-text text-1" }, p.error as string),
      );
    },
  },

  // ---------- components ----------
  Button: {
    component: "button",
    description: "A button. In an overlay's footer, `closes` makes it close the overlay.",
    props: z.object({ label: z.string().min(1), icon: Icon.optional(), iconOnly: z.boolean().optional(), fullWidth: z.boolean().optional(), disabled: z.boolean().optional(), closes: z.boolean().optional() }).strict(),
    axes: ["variant", "intent", "size"],
    build: (p, _b, ctx) => {
      const button = el(
        "Button",
        "button",
        { ...axisProps("button", p, ctx, ["variant", "intent", "size"]), ...(p.fullWidth === true ? { className: "w-full" } : {}), ...(p.disabled === true ? { disabled: true } : {}), ...(p.iconOnly === true ? { "aria-label": p.label as string } : {}) },
        p.icon === undefined ? null : icon(p.icon as string),
        p.iconOnly === true ? null : (p.label as string),
      );
      if (p.closes === true && ctx.overlay !== undefined) return { k: "trigger", from: ctx.overlay.from, as: ctx.overlay.close, close: true, ...(ctx.overlay.compose === undefined ? {} : { compose: ctx.overlay.compose }), child: button };
      return button;
    },
  },
  Badge: {
    component: "badge",
    description: "A short status label.",
    props: z.object({ label: z.string().min(1) }).strict(),
    axes: ["variant", "intent", "size"],
    build: (p, _b, ctx) => el("Badge", "badge", axisProps("badge", p, ctx, ["variant", "intent", "size"]), p.label as string),
  },
  Input: {
    component: "input",
    description: "A text box. Put it in a Field for a visible label; otherwise `label` names it for screen readers.",
    props: z.object({ label: z.string().optional(), type: z.enum(["text", "email", "password", "search", "number"]).optional(), placeholder: z.string().optional(), defaultValue: z.string().optional(), width: Width.optional() }).strict(),
    axes: ["size"],
    build: (p, _b, ctx) =>
      el("Input", "input", {
        ...axisProps("input", p, ctx, ["size"]),
        ...(p.type === undefined || p.type === "text" ? {} : { type: p.type as string }),
        placeholder: p.placeholder as string | undefined,
        defaultValue: p.defaultValue as string | undefined,
        className: widthClass(p.width as string),
        ...(ctx.field === undefined ? { "aria-label": (p.label as string | undefined) ?? (p.placeholder as string | undefined) } : fieldControlProps(ctx, true)),
      }),
  },
  Textarea: {
    component: "textarea",
    description: "A multi-line text box. Put it in a Field for a visible label.",
    props: z.object({ label: z.string().optional(), placeholder: z.string().optional(), defaultValue: z.string().optional() }).strict(),
    build: (p, _b, ctx) =>
      el("Textarea", "textarea", {
        placeholder: p.placeholder as string | undefined,
        defaultValue: p.defaultValue as string | undefined,
        ...(ctx.field === undefined ? { "aria-label": (p.label as string | undefined) ?? (p.placeholder as string | undefined) } : fieldControlProps(ctx, true)),
      }),
  },
  Checkbox: {
    component: "checkbox",
    description: "A checkbox with its label.",
    props: z.object({ label: z.string().min(1), defaultChecked: z.boolean().optional() }).strict(),
    axes: ["size"],
    build: (p, _b, ctx) => labeled(ctx, el("Checkbox", "checkbox", { ...axisProps("checkbox", p, ctx, ["size"]), ...(p.defaultChecked === true ? { defaultChecked: true } : {}) }), p.label as string),
  },
  Switch: {
    component: "switch",
    description: "An on/off switch. `row` puts the label on the left and the switch at the far right, as in settings lists.",
    props: z.object({ label: z.string().min(1), defaultChecked: z.boolean().optional(), layout: z.enum(["inline", "row"]).optional() }).strict(),
    axes: ["size"],
    build: (p, _b, ctx) => {
      const on = p.defaultChecked === true ? { defaultChecked: true } : {};
      if (p.layout === "row") {
        return html("div", { className: "flex items-center justify-between gap-4" }, html("span", { className: "text-2" }, p.label as string), el("Switch", "switch", { ...axisProps("switch", p, ctx, ["size"]), "aria-label": p.label as string, ...on }));
      }
      return labeled(ctx, el("Switch", "switch", { ...axisProps("switch", p, ctx, ["size"]), ...on }), p.label as string);
    },
  },
  Toggle: {
    component: "toggle",
    description: "A button that stays pressed until pressed again: bold, a filter, a view option. Its label is its text.",
    props: z.object({ label: z.string().min(1), icon: Icon.optional(), defaultPressed: z.boolean().optional() }).strict(),
    axes: ["variant", "size"],
    build: (p, _b, ctx) =>
      el(
        "Toggle",
        "toggle",
        {
          ...axisProps("toggle", p, ctx, ["variant", "size"]),
          // React Aria's ToggleButton calls it selected; Radix, Base UI, Reka and Bits pressed.
          ...(p.defaultPressed === true ? (ctx.base === "react-aria" ? { defaultSelected: true } : { defaultPressed: true }) : {}),
        },
        p.icon === undefined ? null : icon(p.icon as string),
        p.label as string,
      ),
  },
  RadioGroup: {
    component: "radio-group",
    description: "One choice among a few options, all visible. Put it in a Field for a visible label.",
    props: z.object({ label: z.string().optional(), options: z.array(Option).min(2).max(8), defaultValue: z.string().optional() }).strict(),
    build: (p, _b, ctx) =>
      el(
        "RadioGroup",
        "radio-group",
        { defaultValue: p.defaultValue as string | undefined, ...(ctx.field === undefined ? { "aria-label": p.label as string | undefined } : fieldControlProps(ctx, false)) },
        ...(p.options as { value: string; label: string }[]).map((o) => labeled(ctx, el("RadioGroupItem", "radio-group", { value: o.value }), o.label)),
      ),
  },
  Slider: {
    component: "slider",
    description: "A value, or a range with two values, on a track.",
    props: z.object({ label: z.string().optional(), min: z.number(), max: z.number(), step: z.number().positive().optional(), defaultValue: z.array(z.number()).min(1).max(2) }).strict(),
    build: (p, _b, ctx) =>
      el("Slider", "slider", {
        defaultValue: expr(JSON.stringify(p.defaultValue)),
        min: p.min as number,
        max: p.max as number,
        step: p.step as number | undefined,
        className: "max-w-sm",
        ...(ctx.field === undefined ? { "aria-label": p.label as string | undefined } : fieldControlProps(ctx, false)),
      }),
  },
  Select: {
    component: "select",
    description: "One choice from a list that opens. Put it in a Field for a visible label; otherwise `label` names it.",
    props: z.object({ label: z.string().optional(), options: z.array(Option).min(1).max(50), defaultValue: z.string().optional(), placeholder: z.string().optional(), width: Width.optional() }).strict(),
    build: (p, _b, ctx) => {
      const options = p.options as { value: string; label: string }[];
      const name = ctx.field === undefined ? (p.label as string | undefined) : undefined;
      // Base UI's value shows the raw value unless the root knows each value's label; React Aria
      // names the select from the root.
      const root: Record<string, Prop> = { defaultValue: p.defaultValue as string | undefined };
      // React Aria takes the placeholder on the Select; the others on its value.
      const placeholder = p.placeholder === undefined ? {} : { placeholder: p.placeholder as string };
      if (ctx.base === "react-aria") Object.assign(root, placeholder);
      if (ctx.base === "base-ui") root["items"] = expr(JSON.stringify(Object.fromEntries(options.map((o) => [o.value, o.label]))));
      if (ctx.base === "react-aria" && name !== undefined) root["aria-label"] = name;
      return el(
        "Select",
        "select",
        root,
        el("SelectTrigger", "select", { className: widthClass((p.width as string) ?? "sm"), ...(name === undefined ? {} : { "aria-label": name }), ...(ctx.field === undefined ? {} : fieldControlProps(ctx, true)) }, el("SelectValue", "select", ctx.base === "react-aria" ? {} : placeholder)),
        el("SelectContent", "select", {}, ...options.map((o) => el("SelectItem", "select", { value: o.value }, o.label))),
      );
    },
  },
  InputOTP: {
    component: "input-otp",
    description: "A one-time code, one box per digit.",
    props: z.object({ label: z.string().optional(), length: z.union([z.literal(4), z.literal(6)]) }).strict(),
    build: (p, _b, ctx) => {
      const n = p.length as number;
      const half = n / 2;
      const group = (from: number) => el("InputOTPGroup", "input-otp", {}, ...Array.from({ length: half }, (_, i) => el("InputOTPSlot", "input-otp", { index: from + i })));
      return el("InputOTP", "input-otp", { maxLength: n, ...(ctx.field === undefined ? { "aria-label": p.label as string | undefined } : fieldControlProps(ctx, false)) }, group(0), el("InputOTPSeparator", "input-otp"), group(half));
    },
  },
  Tabs: {
    component: "tabs",
    description: "Panels switched by tabs. Each tab's content goes in the slot named by its value.",
    props: z.object({ tabs: z.array(Option).min(2).max(8), defaultValue: z.string().optional() }).strict(),
    slotsFrom: (p) => (p.tabs as { value: string }[]).map((t) => t.value),
    build: (p, { slots }) => {
      const tabs = p.tabs as { value: string; label: string }[];
      return el(
        "Tabs",
        "tabs",
        { defaultValue: (p.defaultValue as string | undefined) ?? tabs[0]!.value },
        // Many tabs scroll rather than push past a narrow screen.
        el("TabsList", "tabs", { className: "max-w-full overflow-x-auto" }, ...tabs.map((t) => el("TabsTrigger", "tabs", { value: t.value }, t.label))),
        ...tabs.map((t) => el("TabsContent", "tabs", { value: t.value }, html("div", { className: "@container flex flex-col gap-6 pt-2" }, ...(slots[t.value] ?? [])))),
      );
    },
  },
  Card: {
    component: "card",
    description: "A surface grouping related content, with an optional title, description, action (top right) and footer.",
    props: z.object({ title: z.string().optional(), description: z.string().optional(), footer: z.enum(["row", "stack"]).optional(), flush: z.boolean().optional() }).strict(),
    axes: ["size"],
    slots: ["action", "footer"],
    children: true,
    fallback: "children",
    build: (p, { children, slots }, ctx) => {
      // "flush" once took the card's padding away for a table; that's a restyle the installed lint
      // reports, so the table now sits in the card's content like anything else.
      const flush = p.flush === true;
      const header =
        p.title === undefined && p.description === undefined && (slots["action"] ?? []).length === 0
          ? null
          : el(
              "CardHeader",
              "card",
              {},
              p.title === undefined ? null : el("CardTitle", "card", {}, p.title as string),
              p.description === undefined ? null : el("CardDescription", "card", {}, p.description as string),
              (slots["action"] ?? []).length === 0 ? null : el("CardAction", "card", {}, ...(slots["action"] ?? [])),
            );
      const footer =
        (slots["footer"] ?? []).length === 0
          ? null
          : el("CardFooter", "card", {}, html("div", { className: p.footer === "stack" ? "flex w-full flex-col items-stretch gap-2" : "flex w-full flex-wrap justify-end gap-2" }, ...(slots["footer"] ?? [])));
      return el(
        "Card",
        "card",
        axisProps("card", p, ctx, ["size"]),
        header,
        el("CardContent", "card", {}, flush ? frag(...children) : html("div", { className: "@container flex flex-col gap-4" }, ...children)),
        footer,
      );
    },
  },
  Alert: {
    component: "alert",
    description: "A message in the flow of the page, with a meaning (intent) and an icon.",
    props: z.object({ title: z.string().min(1), description: z.string().optional(), icon: Icon.optional() }).strict(),
    axes: ["variant", "intent"],
    build: (p, _b, ctx) =>
      el(
        "Alert",
        "alert",
        axisProps("alert", p, ctx, ["variant", "intent"]),
        p.icon === undefined ? null : icon(p.icon as string),
        el("AlertTitle", "alert", {}, p.title as string),
        p.description === undefined ? null : el("AlertDescription", "alert", {}, p.description as string),
      ),
  },
  Separator: {
    component: "separator",
    description: "A line between sections.",
    props: z.object({}).strict(),
    build: () => el("Separator", "separator"),
  },
  Avatar: {
    component: "avatar",
    description: "A person's picture, or their initials.",
    props: z.object({ name: z.string().min(1), src: z.string().optional() }).strict(),
    axes: ["size"],
    build: (p, _b, ctx) => {
      const initials = (p.name as string).split(/\s+/).map((w) => w.charAt(0)).join("").slice(0, 2).toUpperCase();
      return el("Avatar", "avatar", axisProps("avatar", p, ctx, ["size"]), p.src === undefined ? null : el("AvatarImage", "avatar", { src: p.src as string, alt: p.name as string }), el("AvatarFallback", "avatar", {}, initials));
    },
  },
  Progress: {
    component: "progress",
    description: "How far along something is, 0 to 100.",
    props: z.object({ label: z.string().min(1), value: z.number().min(0).max(100) }).strict(),
    build: (p) => el("Progress", "progress", { value: p.value as number, "aria-label": p.label as string, className: "max-w-sm" }),
  },
  Breadcrumb: {
    component: "breadcrumb",
    description: "Where the page sits: links to the pages above it, then the current one.",
    props: z.object({ links: z.array(z.string().min(1)).max(6), current: z.string().min(1) }).strict(),
    build: (p, _b, ctx) => {
      const separator = ctx.has("breadcrumb", "BreadcrumbSeparator");
      return el(
        "Breadcrumb",
        "breadcrumb",
        {},
        el(
          "BreadcrumbList",
          "breadcrumb",
          {},
          ...(p.links as string[]).flatMap((label) => [el("BreadcrumbItem", "breadcrumb", {}, el("BreadcrumbLink", "breadcrumb", { href: "#" }, label)), separator ? el("BreadcrumbSeparator", "breadcrumb") : null].filter((n): n is Node & { k: "el" } => n !== null)),
          el("BreadcrumbItem", "breadcrumb", {}, el("BreadcrumbPage", "breadcrumb", {}, p.current as string)),
        ),
      );
    },
  },
  Pagination: {
    component: "pagination",
    description: "Links to pages of a long list.",
    props: z.object({ current: z.number().int().min(1), last: z.number().int().min(1) }).strict(),
    build: (p) => {
      const current = p.current as number;
      const last = p.last as number;
      const pages: (number | "gap")[] = [];
      for (let n = 1; n <= last; n++) {
        if (n === 1 || n === last || Math.abs(n - current) <= 1) pages.push(n);
        else if (pages.at(-1) !== "gap") pages.push("gap");
      }
      return el(
        "Pagination",
        "pagination",
        {},
        el(
          "PaginationContent",
          "pagination",
          {},
          el("PaginationItem", "pagination", {}, el("PaginationPrevious", "pagination", { href: "#" })),
          ...pages.map((n) => el("PaginationItem", "pagination", {}, n === "gap" ? el("PaginationEllipsis", "pagination") : el("PaginationLink", "pagination", { href: "#", ...(n === current ? { isActive: true } : {}) }, String(n)))),
          el("PaginationItem", "pagination", {}, el("PaginationNext", "pagination", { href: "#" })),
        ),
      );
    },
  },
  Accordion: {
    component: "accordion",
    description: "Sections that open and close. Each section's content goes in the slot named by its value.",
    props: z.object({ items: z.array(z.object({ value: z.string().min(1), title: z.string().min(1) }).strict()).min(1).max(12), multiple: z.boolean().optional(), defaultOpen: z.array(z.string()).optional() }).strict(),
    slotsFrom: (p) => (p.items as { value: string }[]).map((i) => i.value),
    build: (p, { slots }, ctx) => {
      const multiple = p.multiple === true;
      const open = (p.defaultOpen as string[] | undefined) ?? [];
      const root: Record<string, Prop> =
        ctx.base === "react-aria"
          ? { allowsMultipleExpanded: multiple, defaultExpandedKeys: expr(JSON.stringify(open)) }
          : ctx.base === "radix"
            ? multiple
              ? { type: "multiple", defaultValue: expr(JSON.stringify(open)) }
              : { type: "single", collapsible: true, defaultValue: open[0] ?? "" }
            : { multiple, defaultValue: expr(JSON.stringify(open)) };
      return el(
        "Accordion",
        "accordion",
        root,
        ...(p.items as { value: string; title: string }[]).map((item) =>
          el("AccordionItem", "accordion", { value: item.value }, el("AccordionTrigger", "accordion", {}, item.title), el("AccordionContent", "accordion", {}, ...(slots[item.value] ?? []))),
        ),
      );
    },
  },
  ToggleGroup: {
    component: "toggle-group",
    description: "A set of toggles: one or several of a few options.",
    props: z.object({ label: z.string().min(1), options: z.array(Option).min(2).max(8), multiple: z.boolean().optional(), defaultValue: z.array(z.string()).optional() }).strict(),
    axes: ["variant", "size"],
    build: (p, _b, ctx) => {
      const multiple = p.multiple === true;
      const selected = (p.defaultValue as string[] | undefined) ?? [];
      const selection: Record<string, Prop> =
        ctx.base === "react-aria"
          ? { selectionMode: multiple ? "multiple" : "single", defaultSelectedKeys: expr(JSON.stringify(selected)) }
          : ctx.base === "radix"
            ? multiple
              ? { type: "multiple", defaultValue: expr(JSON.stringify(selected)) }
              : { type: "single", defaultValue: selected[0] ?? "" }
            : { multiple, defaultValue: expr(JSON.stringify(selected)) };
      return el(
        "ToggleGroup",
        "toggle-group",
        { "aria-label": p.label as string, ...axisProps("toggle-group", p, ctx, ["variant", "size"]), ...selection },
        ...(p.options as { value: string; label: string }[]).map((o) => el("ToggleGroupItem", "toggle-group", { value: o.value }, o.label)),
      );
    },
  },
  DropdownMenu: {
    component: "dropdown-menu",
    description: "A menu of actions that opens from a button in the `trigger` slot.",
    props: z
      .object({ items: z.array(z.object({ label: z.string().min(1), destructive: z.boolean().optional(), separatorBefore: z.boolean().optional() }).strict()).min(1).max(20), align: z.enum(["start", "end"]).optional() })
      .strict(),
    slots: ["trigger"],
    fallback: "trigger",
    build: (p, { slots }, ctx) => {
      const trigger = slots["trigger"]?.[0];
      const align: Record<string, Prop> = p.align === "end" ? (ctx.base === "react-aria" ? { placement: "bottom end" } : { align: "end" }) : {};
      return el(
        "DropdownMenu",
        "dropdown-menu",
        {},
        trigger === undefined ? null : { k: "trigger", from: "dropdown-menu", as: "DropdownMenuTrigger", child: trigger },
        el(
          "DropdownMenuContent",
          "dropdown-menu",
          align,
          ...(p.items as { label: string; destructive?: boolean; separatorBefore?: boolean }[]).flatMap((item) => [
            ...(item.separatorBefore === true ? [el("DropdownMenuSeparator", "dropdown-menu")] : []),
            el("DropdownMenuItem", "dropdown-menu", item.destructive === true ? { variant: "destructive" } : {}, item.label),
          ]),
        ),
      );
    },
  },
  Popover: {
    component: "popover",
    description: "A panel that opens from a button in the `trigger` slot, for extra controls such as filters.",
    props: z.object({ title: z.string().optional(), description: z.string().optional(), align: z.enum(["start", "end"]).optional() }).strict(),
    slots: ["trigger"],
    children: true,
    fallback: "trigger",
    build: (p, { children, slots }, ctx) => {
      const trigger = slots["trigger"]?.[0];
      const align: Record<string, Prop> = p.align === "end" ? (ctx.base === "react-aria" ? { placement: "bottom end" } : { align: "end" }) : {};
      return el(
        "Popover",
        "popover",
        {},
        trigger === undefined ? null : { k: "trigger", from: "popover", as: "PopoverTrigger", child: trigger },
        el(
          "PopoverContent",
          "popover",
          { ...align },
          html(
            "div",
            { className: "flex flex-col gap-4" },
          p.title === undefined && p.description === undefined
            ? null
            : el("PopoverHeader", "popover", {}, p.title === undefined ? null : el("PopoverTitle", "popover", {}, p.title as string), p.description === undefined ? null : el("PopoverDescription", "popover", {}, p.description as string)),
          ...children,
          ),
        ),
      );
    },
  },
  Sheet: {
    component: "sheet",
    description: "A panel that slides in from the side, opened by a button in the `trigger` slot; buttons in `footer` with `closes` close it.",
    props: z.object({ title: z.string().min(1), description: z.string().optional(), side: z.enum(["right", "left", "top", "bottom"]).optional() }).strict(),
    slots: ["trigger", "footer"],
    children: true,
    fallback: "trigger",
    inner: () => ({ overlay: { from: "sheet", close: "SheetClose" } }),
    build: (p, { children, slots }) => {
      const trigger = slots["trigger"]?.[0];
      return el(
        "Sheet",
        "sheet",
        {},
        trigger === undefined ? null : { k: "trigger", from: "sheet", as: "SheetTrigger", child: trigger },
        el(
          "SheetContent",
          "sheet",
          p.side === undefined || p.side === "right" ? {} : { side: p.side as string },
          el("SheetHeader", "sheet", {}, el("SheetTitle", "sheet", {}, p.title as string), p.description === undefined ? null : el("SheetDescription", "sheet", {}, p.description as string)),
          html("div", { className: "flex flex-col gap-4 px-6" }, ...children),
          (slots["footer"] ?? []).length === 0 ? null : el("SheetFooter", "sheet", {}, ...(slots["footer"] ?? [])),
        ),
      );
    },
  },
  Dialog: {
    component: "dialog",
    description: "A window over the page, opened by a button in the `trigger` slot; buttons in `footer` with `closes` close it.",
    props: z.object({ title: z.string().min(1), description: z.string().optional() }).strict(),
    slots: ["trigger", "footer"],
    children: true,
    fallback: "trigger",
    inner: () => ({ overlay: { from: "dialog", close: "DialogClose" } }),
    build: (p, { children, slots }) => {
      const trigger = slots["trigger"]?.[0];
      return el(
        "Dialog",
        "dialog",
        {},
        trigger === undefined ? null : { k: "trigger", from: "dialog", as: "DialogTrigger", child: trigger },
        el(
          "DialogContent",
          "dialog",
          {},
          el("DialogHeader", "dialog", {}, el("DialogTitle", "dialog", {}, p.title as string), p.description === undefined ? null : el("DialogDescription", "dialog", {}, p.description as string)),
          ...children,
          (slots["footer"] ?? []).length === 0 ? null : el("DialogFooter", "dialog", {}, ...(slots["footer"] ?? [])),
        ),
      );
    },
  },
  AlertDialog: {
    component: "alert-dialog",
    description: "Asks before something that can't be undone. Opened by a button in the `trigger` slot.",
    props: z.object({ title: z.string().min(1), description: z.string().optional(), confirm: z.string().min(1), cancel: z.string().optional() }).strict(),
    axes: ["intent"],
    slots: ["trigger"],
    fallback: "trigger",
    build: (p, { slots }, ctx) => {
      const trigger = slots["trigger"]?.[0];
      return el(
        "AlertDialog",
        "alert-dialog",
        {},
        trigger === undefined ? null : { k: "trigger", from: "alert-dialog", as: "AlertDialogTrigger", child: trigger },
        el(
          "AlertDialogContent",
          "alert-dialog",
          {},
          el("AlertDialogHeader", "alert-dialog", {}, el("AlertDialogTitle", "alert-dialog", {}, p.title as string), p.description === undefined ? null : el("AlertDialogDescription", "alert-dialog", {}, p.description as string)),
          el(
            "AlertDialogFooter",
            "alert-dialog",
            {},
            el("AlertDialogCancel", "alert-dialog", {}, (p.cancel as string | undefined) ?? "Cancel"),
            el("AlertDialogAction", "alert-dialog", typeof p.intent === "string" && ctx.intents.includes(p.intent) ? { intent: p.intent } : {}, p.confirm as string),
          ),
        ),
      );
    },
  },
  Table: {
    component: "table",
    description:
      "Rows of data under column headings; children are TableRow elements. `selectable` adds a checkbox per row and a select-all; `bulkActions` are buttons for the selected rows.",
    props: z
      .object({
        label: z.string().min(1),
        columns: z.array(z.object({ label: z.string(), align: z.enum(["start", "end"]).optional(), mono: z.boolean().optional(), muted: z.boolean().optional() }).strict()).min(1).max(12),
        selectable: z.boolean().optional(),
        defaultSelected: z.array(z.number().int().min(0)).optional(),
        bulkActions: z.array(z.object({ label: z.string().min(1), destructive: z.boolean().optional() }).strict()).optional(),
      })
      .strict(),
    children: true,
    childTypes: ["TableRow"],
    build: (p, { children }, ctx) => {
      const columns = p.columns as { label: string; align?: "start" | "end"; mono?: boolean; muted?: boolean }[];
      const rows = children;
      const n = rows.length;
      const selectable = p.selectable === true && ctx.has("checkbox");
      const rac = ctx.base === "react-aria";
      const sel = selectable ? ctx.state("selected", "number[]", JSON.stringify((p.defaultSelected as number[] | undefined) ?? [])) : undefined;
      const all = `Array.from({ length: ${n} }, (_, i) => i)`;
      // The cell keeps only its alignment (layout); type and color go on the text inside, since the
      // lint installed in people's projects reports them on a component (a cell) as a restyle.
      const cellClass = (c: (typeof columns)[number]) => cx(c.align === "end" && "text-right") || undefined;
      const cellText = (c: (typeof columns)[number], cell: Node) => {
        const look = cx(c.mono === true && "font-mono", c.muted === true && "text-neutral-text");
        return look === "" || look === undefined ? cell : html("span", { className: look }, cell);
      };

      const checkbox = (label: string, checked: string, some: string | null, onChange: string) => {
        if (rac) return el("Checkbox", "checkbox", { slot: "selection" });
        const props: Record<string, Prop> = { size: ctx.axis("checkbox", "size")?.includes("sm") ? "sm" : undefined, "aria-label": label, onCheckedChange: expr(onChange) };
        if (some === null) props["checked"] = expr(checked);
        else if (ctx.base === "radix") props["checked"] = expr(`${checked} ? true : ${some} ? "indeterminate" : false`);
        else Object.assign(props, { checked: expr(checked), indeterminate: expr(some) });
        return el("Checkbox", "checkbox", props);
      };
      const head = [
        selectable && sel !== undefined
          ? el("TableHead", "table", { className: "w-10" }, checkbox("Select all", `${sel.value}.length === ${n}`, `${sel.value}.length > 0 && ${sel.value}.length < ${n}`, `(checked) => ${sel.set}(checked === true ? ${all} : [])`))
          : null,
        ...columns.map((c, i) =>
          el("TableHead", "table", { className: cx(c.align === "end" && "text-right") || undefined, ...(rac && i === 0 ? { isRowHeader: true } : {}) }, c.label === "" ? html("span", { className: "sr-only" }, "Actions") : c.label),
        ),
      ].filter((x): x is Node & { k: "el" } => x !== null);
      const body = rows.map((row, i) => {
        const cells = row.k === "el" ? row.children : [row];
        const selectCell =
          selectable && sel !== undefined
            ? el("TableCell", "table", {}, checkbox(`Select row ${i + 1}`, `${sel.value}.includes(${i})`, null, `(checked) => ${sel.set}((s) => (checked === true ? [...s, ${i}] : s.filter((x) => x !== ${i})))`))
            : null;
        const rowProps: Record<string, Prop> = rac ? { id: i } : selectable && sel !== undefined ? { selected: expr(`${sel.value}.includes(${i})`) } : {};
        return el("TableRow", "table", rowProps, selectCell, ...cells.map((cell, c) => el("TableCell", "table", { className: cellClass(columns[c] ?? { label: "" }) }, cellText(columns[c] ?? { label: "" }, cell))));
      });
      const tableProps: Record<string, Prop> = rac
        ? {
            "aria-label": p.label as string,
            ...(selectable && sel !== undefined
              ? { selectionMode: "multiple", selectedKeys: expr(`new Set(${sel.value})`), onSelectionChange: expr(`(keys) => ${sel.set}(keys === "all" ? ${all} : [...keys].map(Number))`) }
              : {}),
          }
        : {};
      const table = el(
        "Table",
        "table",
        tableProps,
        el("TableHeader", "table", {}, rac ? frag(...head) : el("TableRow", "table", {}, ...head)),
        el("TableBody", "table", {}, ...body),
      );
      const actions = (p.bulkActions as { label: string; destructive?: boolean }[] | undefined) ?? [];
      if (!selectable || sel === undefined || actions.length === 0 || !ctx.has("button")) return table;
      return html(
        "div",
        { className: "flex flex-col gap-3" },
        html(
          "div",
          // Wraps on a phone, where the count and several actions don't fit on one line.
          { className: "flex flex-wrap items-center justify-end gap-2" },
          html("span", { className: "text-neutral-text text-2" }, { k: "expr", code: `${sel.value}.length` }, " selected"),
          ...actions.map((a) => el("Button", "button", { variant: ctx.axis("button", "variant")?.includes("outline") ? "outline" : undefined, size: ctx.axis("button", "size")?.includes("sm") ? "sm" : undefined, ...(a.destructive === true && ctx.intents.includes("danger") ? { intent: "danger" } : {}), disabled: expr(`${sel.value}.length === 0`) }, a.label)),
        ),
        table,
      );
    },
  },
  TableRow: {
    component: "table",
    description: "One row of a Table: each child is one cell, in column order (Text, Badge, Avatar with a name in a Row, a DropdownMenu…).",
    props: z.object({}).strict(),
    children: true,
    parents: ["Table"],
    // The Table lays its rows out; a row is only its cells.
    build: (_p, { children }) => ({ k: "el", tag: "row", props: {}, children }),
  },
  // ---------- more components ----------
  Label: {
    component: "label",
    description: "A label on its own, for a control that isn't in a Field.",
    props: z.object({ text: z.string().min(1) }).strict(),
    build: (p) => el("Label", "label", {}, p.text as string),
  },
  Kbd: {
    component: "kbd",
    description: "A keyboard key or shortcut, one entry per key (⌘, K).",
    props: z.object({ keys: z.array(z.string().min(1).max(12)).min(1).max(4) }).strict(),
    build: (p) => {
      const keys = p.keys as string[];
      if (keys.length === 1) return el("Kbd", "kbd", {}, keys[0]!);
      return el("KbdGroup", "kbd", {}, ...keys.map((k) => el("Kbd", "kbd", {}, k)));
    },
  },
  Skeleton: {
    component: "skeleton",
    description: "A placeholder shape while content loads: a line of text, a circle (an avatar) or a block.",
    props: z.object({ shape: z.enum(["line", "circle", "block"]), width: Width.optional() }).strict(),
    build: (p) => {
      const shape = p.shape as string;
      // A circle's shape is on an element around it: the installed lint reports it on the skeleton.
      if (shape === "circle") return html("div", { className: "size-10 shrink-0 overflow-hidden rounded-full" }, el("Skeleton", "skeleton", { className: "size-full" }));
      const className = shape === "block" ? cx("h-32", widthClass((p.width as string) ?? "full")) : cx("h-4", widthClass((p.width as string) ?? "sm"));
      return el("Skeleton", "skeleton", { className });
    },
  },
  Spinner: {
    component: "spinner",
    description: "Shows that something is loading.",
    props: z.object({}).strict(),
    build: () => el("Spinner", "spinner"),
  },
  AspectRatio: {
    component: "aspect-ratio",
    description: "Keeps its content at a fixed shape (an image, a video, a map).",
    props: z.object({ ratio: z.enum(["16:9", "4:3", "1:1", "21:9", "3:4"]) }).strict(),
    children: true,
    build: (p, { children }) => {
      const [w, h] = (p.ratio as string).split(":");
      return el("AspectRatio", "aspect-ratio", { ratio: expr(`${w} / ${h}`) }, html("div", { className: "bg-neutral-subtle text-neutral-text flex size-full items-center justify-center rounded-lg" }, ...children));
    },
  },
  Typography: {
    component: "typography",
    description: "Long-form text styles: headings, a lead paragraph, body, a quote, inline code, small or muted notes.",
    props: z.object({ kind: z.enum(["h1", "h2", "h3", "h4", "lead", "p", "blockquote", "inline-code", "large", "small", "muted"]), text: z.string().min(1) }).strict(),
    build: (p) => {
      const kind = p.kind as string;
      const name = kind === "inline-code" ? "InlineCode" : kind.length === 2 ? kind.toUpperCase() : kind.charAt(0).toUpperCase() + kind.slice(1);
      return el(`Typography${name}`, "typography", {}, p.text as string);
    },
  },
  Empty: {
    component: "empty",
    description: "What a place shows when there's nothing in it yet, with what to do next in the `action` slot.",
    props: z.object({ title: z.string().min(1), description: z.string().optional(), icon: Icon.optional() }).strict(),
    slots: ["action"],
    build: (p, { slots }) =>
      html(
        "div",
        { className: "rounded-lg border-(length:--border-width) border-dashed border-neutral-border" },
      el(
        "Empty",
        "empty",
        {},
        el(
          "EmptyHeader",
          "empty",
          {},
          p.icon === undefined ? null : el("EmptyMedia", "empty", { variant: "icon" }, icon(p.icon as string)),
          el("EmptyTitle", "empty", {}, p.title as string),
          p.description === undefined ? null : el("EmptyDescription", "empty", {}, p.description as string),
        ),
        (slots["action"] ?? []).length === 0 ? null : el("EmptyContent", "empty", {}, ...(slots["action"] ?? [])),
      ),
      ),
  },
  Item: {
    component: "item",
    description: "A row of content: an optional icon, a title and description, and actions on the right (the `actions` slot).",
    props: z.object({ title: z.string().min(1), description: z.string().optional(), icon: Icon.optional() }).strict(),
    axes: ["variant", "size"],
    slots: ["actions"],
    build: (p, { slots }, ctx) =>
      el(
        "Item",
        "item",
        axisProps("item", p, ctx, ["variant", "size"]),
        p.icon === undefined ? null : el("ItemMedia", "item", { variant: "icon" }, icon(p.icon as string)),
        el("ItemContent", "item", {}, el("ItemTitle", "item", {}, p.title as string), p.description === undefined ? null : el("ItemDescription", "item", {}, p.description as string)),
        (slots["actions"] ?? []).length === 0 ? null : el("ItemActions", "item", {}, ...(slots["actions"] ?? [])),
      ),
  },
  ButtonGroup: {
    component: "button-group",
    description: "Buttons joined into one control (Reply · Archive · More).",
    props: z.object({ label: z.string().min(1), orientation: z.enum(["horizontal", "vertical"]).optional() }).strict(),
    children: true,
    childTypes: ["Button"],
    fallback: "children",
    build: (p, { children }) => el("ButtonGroup", "button-group", { "aria-label": p.label as string, ...(p.orientation === "vertical" ? { orientation: "vertical" } : {}) }, ...children),
  },
  InputGroup: {
    component: "input-group",
    description: "A text box with something attached: an icon, text before or after it (https://, .com).",
    props: z
      .object({ label: z.string().min(1), placeholder: z.string().optional(), defaultValue: z.string().optional(), icon: Icon.optional(), prefix: z.string().max(20).optional(), suffix: z.string().max(20).optional(), width: Width.optional() })
      .strict(),
    build: (p) =>
      el(
        "InputGroup",
        "input-group",
        { className: widthClass((p.width as string) ?? "sm") },
        el("InputGroupInput", "input-group", { "aria-label": p.label as string, placeholder: p.placeholder as string | undefined, defaultValue: p.defaultValue as string | undefined }),
        p.icon === undefined && p.prefix === undefined
          ? null
          : el("InputGroupAddon", "input-group", {}, p.icon === undefined ? null : icon(p.icon as string), p.prefix === undefined ? null : el("InputGroupText", "input-group", {}, p.prefix as string)),
        p.suffix === undefined ? null : el("InputGroupAddon", "input-group", { align: "inline-end" }, el("InputGroupText", "input-group", {}, p.suffix as string)),
      ),
  },
  NativeSelect: {
    component: "native-select",
    description: "The browser's own select, styled: best on phones and for long lists.",
    props: z.object({ label: z.string().min(1), options: z.array(Option).min(1).max(50), placeholder: z.string().optional(), width: Width.optional() }).strict(),
    axes: ["size"],
    build: (p, _b, ctx) =>
      el(
        "NativeSelect",
        "native-select",
        { "aria-label": p.label as string, className: widthClass((p.width as string) ?? "sm"), ...axisProps("native-select", p, ctx, ["size"]) },
        p.placeholder === undefined ? null : el("NativeSelectOption", "native-select", { value: "" }, p.placeholder as string),
        ...(p.options as { value: string; label: string }[]).map((o) => el("NativeSelectOption", "native-select", { value: o.value }, o.label)),
      ),
  },
  Collapsible: {
    component: "collapsible",
    description: "A title with more below it that opens and closes.",
    props: z.object({ title: z.string().min(1), defaultOpen: z.boolean().optional() }).strict(),
    children: true,
    fallback: "children",
    build: (p, { children }) =>
      el(
        "Collapsible",
        "collapsible",
        { defaultOpen: p.defaultOpen === true ? true : undefined },
        html(
          "div",
          { className: "flex flex-col gap-2" },
        html(
          "div",
          { className: "flex items-center justify-between gap-4" },
          html("span", { className: "text-2 font-medium" }, p.title as string),
          { k: "trigger", from: "collapsible", as: "CollapsibleTrigger", slot: "trigger", child: el("Button", "button", { variant: "ghost", size: "sm", "aria-label": "Show more" }, icon("chevron-down")) },
        ),
        el("CollapsibleContent", "collapsible", {}, html("div", { className: "flex flex-col gap-2" }, ...children)),
        ),
      ),
  },
  ScrollArea: {
    component: "scroll-area",
    description: "A box that scrolls its content, with the system's scrollbar.",
    props: z.object({ height: z.enum(["sm", "md", "lg"]) }).strict(),
    children: true,
    fallback: "children",
    build: (p, { children }) =>
      html(
        "div",
        { className: "overflow-hidden rounded-md border-(length:--border-width) border-neutral-border" },
        el("ScrollArea", "scroll-area", { className: cx({ sm: "h-40", md: "h-64", lg: "h-96" }[p.height as string], "w-full") }, html("div", { className: "flex flex-col gap-2 p-4" }, ...children)),
      ),
  },
  Tooltip: {
    component: "tooltip",
    description: "A short hint on hover or focus for the element in the `trigger` slot.",
    props: z.object({ text: z.string().min(1).max(120), side: z.enum(["top", "right", "bottom", "left"]).optional() }).strict(),
    slots: ["trigger"],
    fallback: "trigger",
    build: (p, { slots }) => {
      const trigger = slots["trigger"]?.[0];
      return el(
        "Tooltip",
        "tooltip",
        {},
        trigger === undefined ? null : { k: "trigger", from: "tooltip", as: "TooltipTrigger", child: trigger },
        el("TooltipContent", "tooltip", p.side === undefined ? {} : { side: p.side as string }, p.text as string),
      );
    },
  },
  HoverCard: {
    component: "hover-card",
    description: "A card of details that opens when the element in the `trigger` slot is hovered (a person, a link).",
    props: z.object({}).strict(),
    slots: ["trigger"],
    children: true,
    fallback: "trigger",
    build: (_p, { children, slots }) => {
      const trigger = slots["trigger"]?.[0];
      return el(
        "HoverCard",
        "hover-card",
        {},
        trigger === undefined ? null : { k: "trigger", from: "hover-card", as: "HoverCardTrigger", child: trigger },
        el("HoverCardContent", "hover-card", {}, html("div", { className: "flex flex-col gap-1" }, ...children)),
      );
    },
  },
  // ---------- more components: menus, overlays, data, chat ----------
  Drawer: {
    component: "drawer",
    description: "A panel that slides up from the bottom (or in from the right), opened by a button in the `trigger` slot; buttons in `footer` with `closes` close it.",
    props: z.object({ title: z.string().min(1), description: z.string().optional(), edge: z.enum(["bottom", "right"]).optional() }).strict(),
    slots: ["trigger", "footer"],
    children: true,
    fallback: "trigger",
    // React Aria's drawer is Base UI's, so it composes the Base UI way.
    inner: (_p, ctx) => ({ overlay: { from: "drawer", close: "DrawerClose", ...(ctx.base === "react-aria" ? { compose: "base-ui" as const } : {}) } }),
    build: (p, { children, slots }, ctx) => {
      const trigger = slots["trigger"]?.[0];
      const edge = (p.edge as string | undefined) ?? "bottom";
      const placement: Record<string, Prop> = ctx.base === "radix" ? { direction: edge } : { swipeDirection: edge === "bottom" ? "down" : "right", showSwipeHandle: edge === "bottom" ? true : undefined };
      return el(
        "Drawer",
        "drawer",
        placement,
        trigger === undefined ? null : { k: "trigger", from: "drawer", as: "DrawerTrigger", ...(ctx.base === "react-aria" ? { compose: "base-ui" as const } : {}), child: trigger },
        el(
          "DrawerContent",
          "drawer",
          {},
          el("DrawerHeader", "drawer", {}, el("DrawerTitle", "drawer", {}, p.title as string), p.description === undefined ? null : el("DrawerDescription", "drawer", {}, p.description as string)),
          children.length === 0 ? null : html("div", { className: "flex flex-col gap-4 px-4" }, ...children),
          (slots["footer"] ?? []).length === 0 ? null : el("DrawerFooter", "drawer", {}, ...(slots["footer"] ?? [])),
        ),
      );
    },
  },
  ContextMenu: {
    component: "context-menu",
    description: "A menu of actions on right-click over an area; the area's content is the children.",
    props: z.object({ items: z.array(z.object({ label: z.string().min(1), destructive: z.boolean().optional(), separatorBefore: z.boolean().optional() }).strict()).min(1).max(20) }).strict(),
    children: true,
    fallback: "children",
    build: (p, { children }, ctx) => {
      const area = "grid h-32 w-full place-items-center rounded-lg border border-dashed border-neutral-border text-neutral-text text-2";
      // React Aria opens a context menu from a pressable element.
      const child =
        ctx.base === "react-aria"
          ? el("Pressable", "pkg:react-aria-components", {}, html("div", { role: "button", tabIndex: 0, className: area }, ...children))
          : html("div", { className: area }, ...children);
      return el(
        "ContextMenu",
        "context-menu",
        {},
        { k: "trigger", from: "context-menu", as: "ContextMenuTrigger", child },
        el(
          "ContextMenuContent",
          "context-menu",
          { className: "w-56" },
          ...(p.items as { label: string; destructive?: boolean; separatorBefore?: boolean }[]).flatMap((item) => [
            ...(item.separatorBefore === true ? [el("ContextMenuSeparator", "context-menu")] : []),
            el("ContextMenuItem", "context-menu", item.destructive === true ? { variant: "destructive" } : {}, item.label),
          ]),
        ),
      );
    },
  },
  Menubar: {
    component: "menubar",
    description: "An app's menu bar (File, Edit, View), each menu with its items and shortcuts.",
    props: z
      .object({
        label: z.string().min(1),
        menus: z
          .array(z.object({ label: z.string().min(1), items: z.array(z.object({ label: z.string().min(1), shortcut: z.string().max(8).optional(), separatorBefore: z.boolean().optional() }).strict()).min(1).max(12) }).strict())
          .min(1)
          .max(6),
      })
      .strict(),
    build: (p) =>
      el(
        "Menubar",
        "menubar",
        { "aria-label": p.label as string },
        ...(p.menus as { label: string; items: { label: string; shortcut?: string; separatorBefore?: boolean }[] }[]).map((menu) =>
          el(
            "MenubarMenu",
            "menubar",
            {},
            el("MenubarTrigger", "menubar", {}, menu.label),
            el(
              "MenubarContent",
              "menubar",
              {},
              ...menu.items.flatMap((item) => [
                ...(item.separatorBefore === true ? [el("MenubarSeparator", "menubar")] : []),
                el("MenubarItem", "menubar", {}, item.label, item.shortcut === undefined ? null : el("MenubarShortcut", "menubar", {}, item.shortcut)),
              ]),
            ),
          ),
        ),
      ),
  },
  Command: {
    component: "command",
    description: "A command palette: a search box over groups of actions, with icons and shortcuts.",
    props: z
      .object({
        placeholder: z.string().optional(),
        groups: z
          .array(z.object({ heading: z.string().min(1), items: z.array(z.object({ label: z.string().min(1), icon: Icon.optional(), shortcut: z.string().max(8).optional() }).strict()).min(1).max(12) }).strict())
          .min(1)
          .max(6),
      })
      .strict(),
    build: (p, _b, ctx) => {
      const aria = ctx.base === "react-aria";
      const groups = p.groups as { heading: string; items: { label: string; icon?: string; shortcut?: string }[] }[];
      return html(
        "div",
        { className: "overflow-hidden rounded-lg border-(length:--border-width) border-neutral-border shadow-md" },
      el(
        "Command",
        "command",
        {},
        el("CommandInput", "command", { placeholder: (p.placeholder as string | undefined) ?? "Type a command or search…" }),
        el(
          "CommandList",
          "command",
          // React Aria's list holds only its items; the empty state is a render function.
          aria ? { "aria-label": "Commands", renderEmptyState: expr(`() => <CommandEmpty>No results found.</CommandEmpty>`) } : { "aria-label": "Commands" },
          aria ? { k: "use", from: "command", name: "CommandEmpty" } : el("CommandEmpty", "command", {}, "No results found."),
          ...groups.flatMap((group, i) => [
            ...(i > 0 ? [el("CommandSeparator", "command")] : []),
            el(
              "CommandGroup",
              "command",
              { heading: group.heading },
              ...group.items.map((item) => el("CommandItem", "command", {}, item.icon === undefined ? null : icon(item.icon), item.label, item.shortcut === undefined ? null : el("CommandShortcut", "command", {}, item.shortcut))),
            ),
          ]),
        ),
      ),
      );
    },
  },
  Combobox: {
    component: "combobox",
    description: "A text box that suggests options from a list as you type.",
    props: z.object({ label: z.string().min(1), placeholder: z.string().optional(), options: z.array(z.string().min(1)).min(1).max(50), width: Width.optional() }).strict(),
    build: (p, _b, ctx) => {
      const options = p.options as string[];
      const aria = ctx.base === "react-aria";
      const empty = el("ComboboxEmpty", "combobox", {}, "No match.");
      return html(
        "div",
        { className: widthClass((p.width as string) ?? "sm") },
        el(
          "Combobox",
          "combobox",
          aria ? { defaultItems: expr(JSON.stringify(options.map((o) => ({ id: o, name: o })))), "aria-label": p.label as string } : { items: expr(JSON.stringify(options)) },
          el("ComboboxInput", "combobox", { placeholder: (p.placeholder as string | undefined) ?? "Search", ...(aria ? {} : { "aria-label": p.label as string }) }),
          el(
            "ComboboxContent",
            "combobox",
            {},
            aria ? { k: "use", from: "combobox", name: "ComboboxEmpty" } : empty,
            { k: "use", from: "combobox", name: "ComboboxItem" },
            el(
              "ComboboxList",
              "combobox",
              aria ? { renderEmptyState: expr(`() => <ComboboxEmpty>No match.</ComboboxEmpty>`) } : {},
              { k: "expr", code: aria ? "(item: { id: string; name: string }) => <ComboboxItem id={item.id}>{item.name}</ComboboxItem>" : "(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>" },
            ),
          ),
        ),
      );
    },
  },
  NavigationMenu: {
    component: "navigation-menu",
    description: "A site's top navigation: links, and menus that open with more links and a line about each.",
    props: z
      .object({
        items: z
          .array(z.object({ label: z.string().min(1), links: z.array(z.object({ title: z.string().min(1), text: z.string().optional() }).strict()).max(8).optional() }).strict())
          .min(1)
          .max(6),
      })
      .strict(),
    build: (p) =>
      el(
        "NavigationMenu",
        "navigation-menu",
        {},
        el(
          "NavigationMenuList",
          "navigation-menu",
          {},
          ...(p.items as { label: string; links?: { title: string; text?: string }[] }[]).map((item, i) =>
            item.links === undefined || item.links.length === 0
              ? el("NavigationMenuItem", "navigation-menu", { value: `item-${i}` }, el("NavigationMenuLink", "navigation-menu", { href: "#" }, item.label))
              : el(
                  "NavigationMenuItem",
                  "navigation-menu",
                  { value: `item-${i}` },
                  el("NavigationMenuTrigger", "navigation-menu", {}, item.label),
                  el(
                    "NavigationMenuContent",
                    "navigation-menu",
                    {},
                    html(
                      "ul",
                      { className: "grid w-80 gap-1" },
                      ...item.links.map((link) =>
                        html(
                          "li",
                          {},
                          el(
                            "NavigationMenuLink",
                            "navigation-menu",
                            { href: "#" },
                            html(
                              "span",
                              { className: "flex flex-col items-start gap-1" },
                              html("span", { className: "font-medium" }, link.title),
                              link.text === undefined ? null : html("span", { className: "text-neutral-text text-1" }, link.text),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
          ),
        ),
      ),
  },
  Toast: {
    component: "toast",
    description: "A button that raises a toast (a short message in the corner), inside the toast area.",
    props: z.object({ label: z.string().min(1), title: z.string().min(1), description: z.string().optional() }).strict(),
    axes: ["intent"],
    build: (p, _b, ctx) => {
      const intent = typeof p.intent === "string" && ctx.axis("toast", "intent")?.includes(p.intent) ? p.intent : undefined;
      const options = JSON.stringify({ title: p.title, ...(p.description === undefined ? {} : { description: p.description }), ...(intent === undefined ? {} : { type: intent }) });
      return el("Toaster", "toast", {}, { k: "use", from: "toast", name: "toast" }, el("Button", "button", { variant: "outline", onClick: expr(`() => toast.add(${options})`) }, p.label as string));
    },
  },
  Sonner: {
    component: "sonner",
    description: "A button that shows a Sonner toast (success, info, warning, error), with the Toaster that shows it.",
    props: z.object({ label: z.string().min(1), title: z.string().min(1), description: z.string().optional(), kind: z.enum(["default", "success", "info", "warning", "error"]).optional() }).strict(),
    build: (p) => {
      const kind = (p.kind as string | undefined) ?? "default";
      const call = `toast${kind === "default" ? "" : `.${kind}`}(${JSON.stringify(p.title)}${p.description === undefined ? "" : `, { description: ${JSON.stringify(p.description)} }`})`;
      return frag(el("Toaster", "sonner", { position: "top-center" }), { k: "use", from: "pkg:sonner", name: "toast" }, el("Button", "button", { variant: "outline", onClick: expr(`() => ${call}`) }, p.label as string));
    },
  },
  Resizable: {
    component: "resizable",
    description: "Panels side by side (or stacked) with handles to drag between them; each panel's content is a slot named panel-1, panel-2…",
    props: z.object({ panels: z.number().int().min(2).max(4), direction: z.enum(["horizontal", "vertical"]).optional() }).strict(),
    slotsFrom: (p) => Array.from({ length: p.panels as number }, (_, i) => `panel-${i + 1}`),
    build: (p, { slots }) => {
      const n = p.panels as number;
      const size = `${Math.round(100 / n)}%`;
      return html(
        "div",
        { className: "overflow-hidden rounded-lg border-(length:--border-width) border-neutral-border" },
      el(
        "ResizablePanelGroup",
        "resizable",
        { orientation: (p.direction as string | undefined) ?? "horizontal", className: "min-h-48" },
        ...Array.from({ length: n }, (_, i) => [
          ...(i > 0 ? [el("ResizableHandle", "resizable", { withHandle: true })] : []),
          el("ResizablePanel", "resizable", { defaultSize: size }, html("div", { className: "@container flex h-full flex-col gap-2 p-4" }, ...(slots[`panel-${i + 1}`] ?? []))),
        ]).flat(),
      ),
      );
    },
  },
  Carousel: {
    component: "carousel",
    description: "Slides to page through with arrows (a gallery, testimonials); each slide's content is a slot named slide-1, slide-2…",
    props: z.object({ label: z.string().min(1), slides: z.number().int().min(2).max(10) }).strict(),
    slotsFrom: (p) => Array.from({ length: p.slides as number }, (_, i) => `slide-${i + 1}`),
    build: (p, { slots }) =>
      html(
        "div",
        { className: "w-full max-w-sm px-12" },
        el(
          "Carousel",
          "carousel",
          { "aria-label": p.label as string, className: "w-full" },
          el(
            "CarouselContent",
            "carousel",
            {},
            ...Array.from({ length: p.slides as number }, (_, i) =>
              el("CarouselItem", "carousel", {}, html("div", { className: "bg-neutral-subtle flex aspect-square flex-col items-center justify-center gap-2 rounded-lg p-6" }, ...(slots[`slide-${i + 1}`] ?? []))),
            ),
          ),
          el("CarouselPrevious", "carousel"),
          el("CarouselNext", "carousel"),
        ),
      ),
  },
  Calendar: {
    component: "calendar",
    description: "A month to pick a day (or a range of days) from.",
    props: z.object({ label: z.string().min(1), range: z.boolean().optional() }).strict(),
    build: (p, _b, ctx) => {
      // The frame is the page's, on an element around the calendar (the installed lint reports it on the calendar).
      const card = "w-fit rounded-lg border-(length:--border-width) border-neutral-border";
      // React Aria's, Reka's and Bits' calendars take @internationalized/date values; Bits' single
      // calendar says it's single (type).
      if (ctx.base === "react-aria" || ctx.framework !== "react") {
        const single = ctx.framework === "svelte" ? { type: "single" } : {};
        return frag(
          { k: "use", from: "pkg:@internationalized/date", name: "today" },
          { k: "use", from: "pkg:@internationalized/date", name: "getLocalTimeZone" },
          p.range === true
            ? html("div", { className: card }, el("RangeCalendar", "calendar", { "aria-label": p.label as string, defaultValue: expr("{ start: today(getLocalTimeZone()), end: today(getLocalTimeZone()).add({ days: 6 }) }") }))
            : html("div", { className: card }, el("Calendar", "calendar", { ...single, "aria-label": p.label as string, defaultValue: expr("today(getLocalTimeZone())") })),
        );
      }
      if (p.range === true) {
        const range = ctx.state("range", "{ from?: Date; to?: Date } | undefined", "{ from: new Date(), to: new Date(Date.now() + 6 * 86_400_000) }");
        return html("div", { className: card }, el("Calendar", "calendar", { mode: "range", selected: expr(range.value), onSelect: expr(range.set) }));
      }
      const day = ctx.state("date", "Date | undefined", "new Date()");
      return html("div", { className: card }, el("Calendar", "calendar", { mode: "single", selected: expr(day.value), onSelect: expr(day.set) }));
    },
  },
  DatePicker: {
    component: "date-picker",
    description: "A button that opens a calendar to pick a date (or a range).",
    props: z.object({ range: z.boolean().optional() }).strict(),
    build: (p) => (p.range === true ? el("DateRangePicker", "date-picker", { className: "w-80" }) : el("DatePicker", "date-picker")),
  },
  Chart: {
    component: "chart",
    description: "A bar, line or area chart of up to three series over categories (months, days), in the system's chart colors.",
    props: z
      .object({
        kind: z.enum(["bar", "line", "area"]),
        categories: z.array(z.string().min(1)).min(2).max(24),
        series: z.array(z.object({ label: z.string().min(1), values: z.array(z.number()).min(2).max(24) }).strict()).min(1).max(3),
      })
      .strict(),
    build: (p) => {
      const categories = p.categories as string[];
      const series = (p.series as { label: string; values: number[] }[]).map((s, i) => ({ ...s, key: `s${i + 1}` }));
      const data = categories.map((x, i) => ({ x, ...Object.fromEntries(series.map((s) => [s.key, s.values[i] ?? 0])) }));
      const config = Object.fromEntries(series.map((s, i) => [s.key, { label: s.label, color: `var(--chart-${i + 1})` }]));
      const kind = p.kind as "bar" | "line" | "area";
      const Chart = { bar: "BarChart", line: "LineChart", area: "AreaChart" }[kind];
      const Mark = { bar: "Bar", line: "Line", area: "Area" }[kind];
      const marks = series.map((s) =>
        el(
          Mark,
          "pkg:recharts",
          kind === "bar"
            ? { dataKey: s.key, fill: `var(--color-${s.key})`, radius: 4 }
            : kind === "line"
              ? { dataKey: s.key, type: "natural", stroke: `var(--color-${s.key})`, strokeWidth: 2, dot: false }
              : { dataKey: s.key, type: "natural", fill: `var(--color-${s.key})`, fillOpacity: 0.4, stroke: `var(--color-${s.key})`, stackId: "a" },
        ),
      );
      return el(
        "ChartContainer",
        "chart",
        { config: expr(JSON.stringify(config)), className: "h-56 w-full" },
        el(
          Chart,
          "pkg:recharts",
          { accessibilityLayer: true, data: expr(JSON.stringify(data)) },
          el("CartesianGrid", "pkg:recharts", { vertical: false }),
          el("XAxis", "pkg:recharts", { dataKey: "x", tickLine: false, axisLine: false, tickMargin: 8 }),
          el("ChartTooltip", "chart", { content: { node: el("ChartTooltipContent", "chart") } }),
          series.length > 1 ? el("ChartLegend", "chart", { content: { node: el("ChartLegendContent", "chart") } }) : null,
          ...marks,
        ),
      );
    },
  },
  DataTable: {
    component: "data-table",
    description: "A table of records with sorting, a filter box, row selection and pages (payments, users, orders).",
    props: z
      .object({
        label: z.string().min(1),
        columns: z.array(z.object({ key: z.string().regex(/^[a-z][a-zA-Z0-9]*$/), label: z.string().min(1) }).strict()).min(1).max(8),
        rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).min(1).max(50),
        filter: z.string().optional(),
      })
      .strict(),
    build: (p, _b, ctx) => {
      const columns = p.columns as { key: string; label: string }[];
      // A sorting header in each framework's words: JSX, Vue's h(), Svelte's renderComponent.
      const header = (title: string) =>
        ctx.framework === "vue"
          ? `h(DataTableColumnHeader, { column, title: ${JSON.stringify(title)} })`
          : ctx.framework === "svelte"
            ? `renderComponent(DataTableColumnHeader, { column, title: ${JSON.stringify(title)} })`
            : `<DataTableColumnHeader column={column} title=${JSON.stringify(title)} />`;
      const code = `[${columns.map((c) => `{ accessorKey: ${JSON.stringify(c.key)}, header: ({ column }) => ${header(c.label)} }`).join(", ")}]`;
      const helper: Node | null = ctx.framework === "vue" ? { k: "use", from: "pkg:vue", name: "h" } : ctx.framework === "svelte" ? { k: "use", from: "data-table", name: "renderComponent" } : null;
      return el(
        "DataTable",
        "data-table",
        {
          label: p.label as string,
          columns: expr(code),
          data: expr(JSON.stringify(p.rows)),
          ...(p.filter === undefined ? {} : { filterColumn: p.filter as string, filterPlaceholder: `Filter ${(columns.find((c) => c.key === p.filter)?.label ?? p.filter as string).toLowerCase()}` }),
          selectable: true,
          pageSize: 5,
          className: "w-full",
        },
        { k: "use", from: "data-table", name: "DataTableColumnHeader" },
        helper,
      );
    },
  },
  Message: {
    component: "message",
    description: "One message in a conversation: who sent it (initials), their name, the text in a bubble and a footnote (time, read).",
    props: z.object({ author: z.string().optional(), initials: z.string().max(3).optional(), text: z.string().min(1), footer: z.string().optional(), mine: z.boolean().optional() }).strict(),
    build: (p, _b, ctx) => {
      const mine = p.mine === true;
      const bubble = ctx.has("bubble")
        ? el("Bubble", "bubble", { variant: mine ? "default" : "secondary", align: mine ? "end" : "start" }, el("BubbleContent", "bubble", {}, p.text as string))
        : html("p", { className: "m-0" }, p.text as string);
      return el(
        "Message",
        "message",
        mine ? { align: "end" } : {},
        mine || p.initials === undefined ? null : el("MessageAvatar", "message", { className: "size-8" }, html("span", { className: "text-1" }, p.initials as string)),
        el(
          "MessageContent",
          "message",
          {},
          mine || p.author === undefined ? null : el("MessageHeader", "message", {}, p.author as string),
          bubble,
          p.footer === undefined ? null : el("MessageFooter", "message", {}, p.footer as string),
        ),
      );
    },
  },
  MessageGroup: {
    component: "message",
    description: "A conversation: Messages one after another.",
    props: z.object({}).strict(),
    children: true,
    childTypes: ["Message", "Marker"],
    fallback: "children",
    build: (_p, { children }) => el("MessageGroup", "message", { className: "w-full" }, ...children),
  },
  Bubble: {
    component: "bubble",
    description: "A chat bubble on its own, with optional reactions under it.",
    props: z.object({ text: z.string().min(1), reactions: z.string().max(20).optional() }).strict(),
    axes: ["variant", "intent"],
    build: (p, _b, ctx) =>
      el("Bubble", "bubble", axisProps("bubble", p, ctx, ["variant", "intent"]), el("BubbleContent", "bubble", {}, p.text as string), p.reactions === undefined ? null : el("BubbleReactions", "bubble", {}, p.reactions as string)),
  },
  Attachment: {
    component: "attachment",
    description: "A file attached to a message: its name, a detail (size, progress) and a remove button.",
    props: z.object({ name: z.string().min(1), detail: z.string().optional(), state: z.enum(["done", "uploading", "error"]).optional() }).strict(),
    axes: ["size"],
    build: (p, _b, ctx) =>
      el(
        "Attachment",
        "attachment",
        { state: (p.state as string | undefined) ?? "done", ...axisProps("attachment", p, ctx, ["size"]) },
        el("AttachmentMedia", "attachment", {}, icon("file-text")),
        el("AttachmentContent", "attachment", {}, el("AttachmentTitle", "attachment", {}, p.name as string), p.detail === undefined ? null : el("AttachmentDescription", "attachment", {}, p.detail as string)),
        el("AttachmentActions", "attachment", {}, el("AttachmentAction", "attachment", { "aria-label": `Remove ${p.name as string}` }, icon("x"))),
      ),
  },
  Marker: {
    component: "marker",
    description: "A line in a conversation that isn't a message: a date, someone joining.",
    props: z.object({ text: z.string().min(1), variant: z.enum(["default", "separator", "border"]).optional() }).strict(),
    build: (p) => el("Marker", "marker", p.variant === undefined ? {} : { variant: p.variant as string }, el("MarkerContent", "marker", {}, p.text as string)),
  },
  MessageScroller: {
    component: "message-scroller",
    description: "A conversation that scrolls, stays at the newest message and offers a jump-to-latest button.",
    props: z.object({ label: z.string().min(1), height: z.enum(["sm", "md", "lg"]).optional() }).strict(),
    children: true,
    fallback: "children",
    build: (p, { children }) =>
      html(
        "div",
        { className: cx({ sm: "h-48", md: "h-64", lg: "h-96" }[(p.height as string | undefined) ?? "md"], "w-full rounded-lg border-(length:--border-width) border-neutral-border") },
        el(
          "MessageScrollerProvider",
          "message-scroller",
          {},
          el(
            "MessageScroller",
            "message-scroller",
            {},
            el("MessageScrollerViewport", "message-scroller", { "aria-label": p.label as string, tabIndex: 0 }, el("MessageScrollerContent", "message-scroller", {}, html("div", { className: "flex flex-col gap-4 p-4" }, ...children.map((c) => el("MessageScrollerItem", "message-scroller", {}, c))))),
            el("MessageScrollerButton", "message-scroller"),
          ),
        ),
      ),
  },
  Questionnaire: {
    component: "questionnaire",
    description: "Questions asked one at a time with choices to pick (one, or several), progress, skip and back.",
    props: z
      .object({
        questions: z
          .array(z.object({ title: z.string().min(1), description: z.string().optional(), multiple: z.boolean().optional(), choices: z.array(z.string().min(1)).min(2).max(8) }).strict())
          .min(1)
          .max(8),
        submit: z.string().optional(),
      })
      .strict(),
    build: (p) => {
      const questions = (p.questions as { title: string; description?: string; multiple?: boolean; choices: string[] }[]).map((q, i) => ({
        ...q,
        name: `q${i + 1}`,
        options: q.choices.map((c) => ({ label: c, value: c.toLowerCase().replace(/[^a-z0-9]+/g, "-") })),
      }));
      // The root knows each question's name and choices; titles and descriptions are in the JSX.
      const items = questions.map((q) => ({ name: q.name, required: false, choices: q.options.map((o) => ({ value: o.value })) }));
      return el(
        "Questionnaire",
        "questionnaire",
        { className: "w-full", defaultItem: questions[0]!.name, items: expr(JSON.stringify(items)), onSubmit: expr("(e: { preventDefault: () => void }) => e.preventDefault()") },
        el("QuestionnaireProgress", "questionnaire"),
        ...questions.map((q) =>
          el(
            "QuestionnaireItem",
            "questionnaire",
            { name: q.name, multiple: q.multiple === true ? true : undefined, required: expr("false") },
            el("QuestionnaireTitle", "questionnaire", {}, q.title),
            q.description === undefined ? null : el("QuestionnaireDescription", "questionnaire", {}, q.description),
            el("QuestionnaireChoices", "questionnaire", {}, ...q.options.map((o) => el("QuestionnaireChoice", "questionnaire", { value: o.value }, o.label))),
            el("QuestionnaireError", "questionnaire"),
          ),
        ),
        el(
          "QuestionnaireActions",
          "questionnaire",
          {},
          el("QuestionnairePrevious", "questionnaire"),
          el("QuestionnaireSkip", "questionnaire"),
          el("QuestionnaireNext", "questionnaire"),
          el("QuestionnaireSubmit", "questionnaire", {}, (p.submit as string | undefined) ?? "Submit"),
        ),
      );
    },
  },
  AppShell: {
    component: "sidebar",
    description: "An app's frame: a sidebar with the product name and navigation, and the page beside it. Without a sidebar in the system, just the page.",
    props: z
      .object({
        brand: z.string().min(1),
        nav: z.array(z.object({ label: z.string().min(1), icon: Icon, active: z.boolean().optional(), badge: z.string().optional() }).strict()).min(1).max(12),
        footer: z.string().optional(),
      })
      .strict(),
    children: true,
    fallback: "children",
    inner: () => ({ inShell: true }),
    build: (p, { children }) => {
      const s = (tag: string, props: Record<string, Prop> = {}, ...kids: (Node | string | null)[]) => el(tag, "sidebar", props, ...kids);
      return s(
        "SidebarProvider",
        {},
        s(
          "Sidebar",
          { collapsible: "icon", variant: "inset" },
          s("SidebarHeader", {}, html("div", { className: "text-2 flex h-8 items-center px-2 font-semibold" }, p.brand as string)),
          s(
            "SidebarContent",
            {},
            s(
              "SidebarGroup",
              {},
              s(
                "SidebarGroupContent",
                {},
                s(
                  "SidebarMenu",
                  {},
                  ...(p.nav as { label: string; icon: string; active?: boolean; badge?: string }[]).map((item) =>
                    s(
                      "SidebarMenuItem",
                      {},
                      s("SidebarMenuButton", { isActive: item.active === true, tooltip: item.label }, icon(item.icon), html("span", {}, item.label)),
                      item.badge === undefined ? null : s("SidebarMenuBadge", {}, item.badge),
                    ),
                  ),
                ),
              ),
            ),
          ),
          p.footer === undefined ? null : s("SidebarFooter", {}, html("div", { className: "text-neutral-text text-1 px-2" }, p.footer as string)),
          s("SidebarRail"),
        ),
        s("SidebarInset", {}, html("header", { className: "flex h-12 items-center gap-2 px-4" }, s("SidebarTrigger")), ...children),
      );
    },
  },
};


export type CatalogDoc = {
  type: string;
  description: string;
  // JSON Schema for the element's props, including the variant/intent/size options this system offers.
  props: Record<string, unknown>;
  slots?: readonly string[];
  children: boolean;
  component?: string;
};

// The catalog as a model (or a person) reads it for one system: only what the system includes,
// with its own axis options, so a generated page can only ask for what exists.
export function pageCatalog(system: Pick<DesignSystem, "components" | "excluded">): CatalogDoc[] {
  const out: CatalogDoc[] = [];
  for (const [type, entry] of Object.entries(CATALOG)) {
    const anatomy = entry.component === undefined ? undefined : system.components[entry.component];
    if (entry.component !== undefined && (anatomy === undefined || system.excluded.includes(entry.component))) continue;
    const axes: Record<string, z.ZodType> = {};
    for (const axis of entry.axes ?? []) {
      const options = anatomy?.axes[axis]?.enabled;
      if (options !== undefined && options.length > 0) axes[axis] = z.enum(options as [string, ...string[]]).optional();
    }
    out.push({
      type,
      description: entry.description,
      props: z.toJSONSchema(entry.props.extend(axes)) as Record<string, unknown>,
      ...(entry.slots !== undefined ? { slots: entry.slots } : entry.slotsFrom !== undefined ? { slots: ["one per option value"] } : {}),
      children: entry.children === true,
      ...(entry.component === undefined ? {} : { component: entry.component }),
    });
  }
  return out;
}
