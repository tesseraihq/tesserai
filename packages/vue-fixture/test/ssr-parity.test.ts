import { join } from "node:path";
import type { ReactElement } from "react";
import type { VNode } from "vue";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prefixFiles, renderAll, supportedComponents } from "@tesserai/templates";
import { createLoader, FIXTURE_DIR, writeGenerated, type Loader } from "../harness";
import { CUSTOM_CASES, SSR_CASES } from "./cases";
import { ACCEPTED_DATA, ACCEPTED_SSR_DATA, acceptedData, rekaVars, seenData, slotsInHtml } from "./slots";
import { ICON_SYSTEMS, SYSTEMS, writeRun } from "./systems";
import { n, nx, toReact, toVue, type Tree } from "./tree";
import { Window } from "happy-dom";

// Server-rendered DOM parity: the same components with the same props, rendered by React (the
// Radix output, which the builder's preview draws) and by Vue (the Reka output), come out with the
// same data-slot elements, tags, data attributes and classes. Dialog's overlay and content render
// through a portal, which neither framework renders on the server; dom-parity.test.ts mounts those.

type Parts = Record<string, any>;
type Render = {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => ReactElement;
  h: (type: unknown, props?: unknown, children?: unknown) => VNode;
  renderReact: (element: ReactElement) => string;
  renderVue: (render: () => VNode) => Promise<string>;
};

// One case: the props both frameworks get, and the children, as text or a link (asChild).
type ButtonCase = { props: Record<string, unknown>; link?: true };
const BUTTON_CASES: Record<string, ButtonCase[]> = {
  default: [
    { props: {} },
    { props: { variant: "outline" } },
    { props: { variant: "destructive" } },
    { props: { variant: "secondary", size: "sm" } },
    { props: { variant: "soft", intent: "danger", size: "lg" } },
    { props: { variant: "ghost", size: "icon" } },
    { props: { size: "icon-xs", intent: "neutral" } },
    { props: { variant: "link", intent: "success" } },
    { props: { disabled: true, class: "mt-2 px-8" } },
    { props: { asChild: true, variant: "link" }, link: true },
  ],
  custom: [
    { props: {} },
    { props: { intent: "accent" } },
    { props: { variant: "outline", intent: "accent", size: "xl" } },
    { props: { variant: "solid", size: "icon-xl" } },
    { props: { variant: "default" } },
    { props: { variant: "destructive", size: "xs" } },
    { props: { variant: "ghost", class: "rounded-none" } },
    { props: { asChild: true, variant: "secondary" }, link: true },
  ],
};

let ssr: Loader;
let render: Render;
beforeAll(async () => {
  ssr = await createLoader("ssr");
  render = await ssr.load<Render>(join(FIXTURE_DIR, "harness/render-ssr.ts"));
});
afterAll(() => ssr.close());

// React takes className; everything else is the same prop in both.
const reactProps = ({ class: className, ...props }: Record<string, unknown>) => (className === undefined ? props : { ...props, className });

describe.each(Object.keys(SYSTEMS))("%s system", (name) => {
  let react: { button: Parts; dialog: Parts };
  let vue: { button: Parts; dialog: Parts };
  beforeAll(async () => {
    const system = SYSTEMS[name]!();
    const reactDir = await writeRun(`ssr-${name}-react`, "radix", system);
    const vueDir = await writeRun(`ssr-${name}-vue`, "reka-ui", system);
    react = { button: await ssr.load(join(reactDir, "components/ui/button.tsx")), dialog: await ssr.load(join(reactDir, "components/ui/dialog.tsx")) };
    vue = { button: await ssr.load(join(vueDir, "components/ui/button/index.ts")), dialog: await ssr.load(join(vueDir, "components/ui/dialog/index.ts")) };
  });

  it.each(BUTTON_CASES[name]!.map((c) => [JSON.stringify(c.props), c] as const))("Button %s", async (_, c) => {
    const { createElement, h } = render;
    const reactHtml = render.renderReact(
      createElement(react.button["Button"], reactProps(c.props), c.link ? createElement("a", { href: "/docs" }, "Docs") : "Save"),
    );
    const vueHtml = await render.renderVue(() => h(vue.button["Button"], c.props, { default: () => (c.link ? h("a", { href: "/docs" }, "Docs") : "Save") }));
    const reactSlots = slotsInHtml(reactHtml);
    expect(reactSlots).toHaveLength(1);
    expect(slotsInHtml(vueHtml)).toEqual(reactSlots);
  });

  it.each([
    ["closed, with a trigger, header and footer", {}],
    ["with classes of the page's own", { header: "text-center", title: "text-2", footer: "justify-start" }],
  ] as const)("Dialog %s", async (_, classes: Partial<Record<"header" | "title" | "footer", string>>) => {
    const { createElement: e, h } = render;
    const r = react.dialog;
    const v = vue.dialog;
    const reactHtml = render.renderReact(
      e(
        r["Dialog"],
        null,
        e(r["DialogTrigger"], null, "Open"),
        e(r["DialogHeader"], { className: classes.header }, e(r["DialogTitle"], { className: classes.title }, "Invite"), e(r["DialogDescription"], null, "They'll get an email.")),
        e(r["DialogFooter"], { className: classes.footer, showCloseButton: true }, "Send"),
      ),
    );
    const vueHtml = await render.renderVue(() =>
      h(v["Dialog"], null, {
        default: () => [
          h(v["DialogTrigger"], null, { default: () => "Open" }),
          h(v["DialogHeader"], { class: classes.header }, { default: () => [h(v["DialogTitle"], { class: classes.title }, { default: () => "Invite" }), h(v["DialogDescription"], null, { default: () => "They'll get an email." })] }),
          h(v["DialogFooter"], { class: classes.footer, showCloseButton: true }, { default: () => "Send" }),
        ],
      }),
    );
    const reactSlots = slotsInHtml(reactHtml);
    expect(reactSlots.map((s) => s.slot)).toEqual(["dialog-trigger", "dialog-header", "dialog-title", "dialog-description", "dialog-footer"]);
    expect(slotsInHtml(vueHtml)).toEqual(reactSlots);
  });
});

// The rest of the everyday set: each component's cases (cases.ts), with every export of every
// component's module in reach by name, so a tree can mix components.
describe.each(Object.keys(SYSTEMS))("%s system, the everyday set", (name) => {
  let react: Parts;
  let vue: Parts;
  beforeAll(async () => {
    const system = SYSTEMS[name]!();
    const reactDir = await writeRun(`ssr-set-${name}-react`, "radix", system);
    const vueDir = await writeRun(`ssr-set-${name}-vue`, "reka-ui", system);
    react = {};
    vue = {};
    for (const component of supportedComponents("reka-ui")) {
      Object.assign(react, await ssr.load(join(reactDir, `components/ui/${component}.tsx`)));
      Object.assign(vue, await ssr.load(join(vueDir, `components/ui/${component}/index.ts`)));
    }
  });

  const cases = Object.entries(SSR_CASES).flatMap(([component, list]) =>
    [...list, ...(name === "custom" ? (CUSTOM_CASES[component] ?? []) : [])].map(([label, tree]) => [`${component}: ${label}`, tree] as const),
  );
  it.each(cases)("%s", async (_, tree) => {
    const reactHtml = render.renderReact(toReact(tree, react, render) as ReactElement);
    const vueHtml = await render.renderVue(() => toVue(tree, vue, render) as VNode);
    const accepted = { ...ACCEPTED_DATA, ...ACCEPTED_SSR_DATA };
    const reactSlots = acceptedData(rekaVars(slotsInHtml(reactHtml)), accepted);
    expect(reactSlots.length).toBeGreaterThan(0);
    expect(acceptedData(slotsInHtml(vueHtml), accepted)).toEqual(reactSlots);
  });
});

// A Tailwind class prefix (system.tailwindPrefix, applied by prefixFiles): the prefixed Vue output
// renders the prefixed React output's classes, every one of them prefixed.
describe("the default system, with a class prefix", () => {
  let react: Parts;
  let vue: Parts;
  beforeAll(async () => {
    const system = SYSTEMS["default"]!();
    const reactDir = writeGenerated("ssr-prefix-react", await prefixFiles(await renderAll("radix", system), "tw"));
    const vueDir = writeGenerated("ssr-prefix-vue", await prefixFiles(await renderAll("reka-ui", system), "tw"));
    react = {};
    vue = {};
    for (const component of supportedComponents("reka-ui")) {
      Object.assign(react, await ssr.load(join(reactDir, `components/ui/${component}.tsx`)));
      Object.assign(vue, await ssr.load(join(vueDir, `components/ui/${component}/index.ts`)));
    }
  });

  const cases = Object.entries(SSR_CASES).flatMap(([component, list]) => list.map(([label, tree]) => [`${component}: ${label}`, tree] as const));
  it.each(cases)("%s", async (_, tree) => {
    const reactHtml = render.renderReact(toReact(tree, react, render) as ReactElement);
    const vueHtml = await render.renderVue(() => toVue(tree, vue, render) as VNode);
    const accepted = { ...ACCEPTED_DATA, ...ACCEPTED_SSR_DATA };
    const reactSlots = acceptedData(rekaVars(slotsInHtml(reactHtml)), accepted);
    expect(acceptedData(slotsInHtml(vueHtml), accepted)).toEqual(reactSlots);
    // The page's own classes (w-40…) and Lucide's (lucide-chevron-down) come through as written;
    // the system's are all prefixed.
    const own = new Set(["w-40", "min-h-40", "text-2", "ms-2", "me-2", "gap-4", "mx-2", "h-4", "size-6", "px-2", "ring-2", "text-3", "mt-2", "w-80", "text-end", "p-2", "pb-2", "px-4", "grow", "my-2", "size-3", "font-bold",
      // The layout and composition cases'.
      "rounded-lg", "border", "rounded-none", "h-40", "min-h-48", "bg-transparent", "-ms-1", "min-h-0", "w-60", "basis-1/2",
      // The menus and overlays cases'.
      "h-32",
      // The long tail's.
      "p-4",
    ]);
    for (const slot of reactSlots) for (const c of slot.classes) if (!own.has(c) && !c.startsWith("lucide")) expect(c, slot.slot).toMatch(/^tw:/);
  });
});

// The icon pass: the same icon, weight, stroke and classes in both, for each library, through the
// parts that draw an icon with a data-slot of its own; and every icon, slotted or not, the same
// element with the same classes (read from the whole rendered markup).
const ICON_TREES: [string, Tree][] = [
  ["Spinner", n("Spinner", { class: "size-6" })],
  ["Select's chevron", n("Select", {}, n("SelectTrigger", {}, n("SelectValue", { placeholder: "Fruit" })))],
  ["Native select's chevron", n("NativeSelect", {}, n("NativeSelectOption", { value: "a" }, "A"))],
  ["Accordion's chevron", n("Accordion", { type: "single", defaultValue: "a" }, n("AccordionItem", { value: "a" }, n("AccordionTrigger", {}, "Open"), n("AccordionContent", {}, "Shown")))],
  ["Checkbox's check", nx("Checkbox", { react: { defaultChecked: true }, vue: { defaultValue: true } })],
  ["Breadcrumb's separator and ellipsis", n("BreadcrumbList", {}, n("BreadcrumbSeparator", {}), n("BreadcrumbEllipsis", {}))],
  ["Pagination's chevrons", n("PaginationContent", {}, n("PaginationPrevious", { href: "#" }), n("PaginationNext", { href: "#" }), n("PaginationEllipsis", {}))],
];

// Every svg in some markup: its classes, the attributes that draw it, and what it draws. Written
// the way it draws: a size in px is the same size unitless (@remixicon/vue writes "24px",
// @remixicon/react 24); a bare <g> around the paths draws nothing of its own (@phosphor-icons/vue
// wraps them in one); Vue's fragment markers are comments; and a stroke on the svg that every shape
// in it sets again is the shapes' (@hugeicons/react sets it on both, @hugeicons/vue on the shapes).
function svgs(html: string) {
  const window = new Window();
  window.document.body.innerHTML = html;
  const found = [...window.document.body.querySelectorAll("svg")].map((svg) => {
    const inner = svg.innerHTML
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<g>|<\/g>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const shapes = [...svg.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse")];
    const attrs = Object.fromEntries(["viewBox", "width", "height", "fill", "stroke", "stroke-width", "data-slot", "aria-hidden"].map((a) => [a, svg.getAttribute(a)?.replace(/px$/, "") ?? null]));
    for (const a of ["stroke", "stroke-width"]) if (shapes.length > 0 && shapes.every((s) => s.getAttribute(a) === attrs[a])) attrs[a] = null;
    return { classes: (svg.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).sort(), attrs, inner };
  });
  void window.happyDOM.close();
  return found;
}

describe.each(Object.keys(ICON_SYSTEMS))("the default preset with %s icons", (name) => {
  let react: Parts;
  let vue: Parts;
  beforeAll(async () => {
    const system = ICON_SYSTEMS[name]!();
    const reactDir = await writeRun(`ssr-icons-${name}-react`, "radix", system);
    const vueDir = await writeRun(`ssr-icons-${name}-vue`, "reka-ui", system);
    react = {};
    vue = {};
    for (const component of ["spinner", "select", "native-select", "accordion", "checkbox", "breadcrumb", "pagination", "button"]) {
      Object.assign(react, await ssr.load(join(reactDir, `components/ui/${component}.tsx`)));
      Object.assign(vue, await ssr.load(join(vueDir, `components/ui/${component}/index.ts`)));
    }
  });

  it.each(ICON_TREES)("%s", async (_, tree) => {
    const reactHtml = render.renderReact(toReact(tree, react, render) as ReactElement);
    const vueHtml = await render.renderVue(() => toVue(tree, vue, render) as VNode);
    const accepted = { ...ACCEPTED_DATA, ...ACCEPTED_SSR_DATA };
    expect(acceptedData(slotsInHtml(vueHtml), accepted)).toEqual(acceptedData(rekaVars(slotsInHtml(reactHtml)), accepted));
    const drawn = svgs(reactHtml);
    expect(drawn.length).toBeGreaterThan(0);
    expect(svgs(vueHtml)).toEqual(drawn);
  });
});

// An accepted difference that no longer happens is taken off the list, so it can't hide a new one.
// (dom-parity.test.ts checks the ones only a mounted component shows.)
it("every accepted server-rendering difference still occurs", () => {
  for (const key of Object.keys(ACCEPTED_SSR_DATA)) expect(seenData.has(key), key).toBe(true);
});
