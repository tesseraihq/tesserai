import { SHADCN_VARIANT_ALIASES, type DesignSystem } from "@tesserai/core";
import { renderAll, supportedComponents, type GeneratedFile } from "@tesserai/templates";
import { join } from "node:path";
import ts from "typescript";
import { parse } from "vue/compiler-sfc";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLoader, writeGenerated, type Loader } from "../harness";
import { asVueClasses, LIBRARY_CLASSES, REKA_CLASSES, seenClasses, seenLibrary, withoutLibraryClasses } from "./slots";
import { SYSTEMS } from "./systems";

// Static class parity, for every component the Vue target has, read from the source:
// - every element with a data-slot gets the same classes in the Vue output as in the Radix React
//   output (the one the builder's preview draws), through the same kind of expression;
// - the elements with no data-slot of their own (icons, inner wrappers) get the same classes too;
// - every cva has the same name and the same classes for every variant, compound and default;
// - Button's buttonVariants gives the same classes in both for every variant, shadcn alias,
//   intent and size, run for real.
// Radix's --radix-* CSS variables are Reka's --reka-*.

const COMPONENTS = supportedComponents("reka-ui");

// Components built on another library's structure, held to React by a test of their own, each
// with why its elements can't be compared one to one here.
const OWN_STRUCTURE: Record<string, string> = {
  calendar:
    "React's calendar is react-day-picker's: its classes go in through a classNames map and its cells' states as class lists; Reka's marks state with attributes of its own. calendar-parity.test.ts compares the two part by part, with each state prefix resolved against the rendered calendar",
};

// data-slots one output writes and the other doesn't, each with why that changes nothing.
const PORTAL = "Radix's portal renders no element and drops the attribute; Reka's renders none either, so the Vue part leaves it off";
const ACCEPTED: Record<string, { only: "react" | "vue"; why: string }> = {
  "dialog/dialog-portal": { only: "react", why: PORTAL },
  "alert-dialog/alert-dialog-portal": { only: "react", why: PORTAL },
  "sheet/sheet-portal": { only: "react", why: PORTAL },
  "dropdown-menu/dropdown-menu-portal": { only: "react", why: PORTAL },
  "context-menu/context-menu-portal": { only: "react", why: PORTAL },
  "menubar/menubar-portal": { only: "react", why: PORTAL },
  "hover-card/hover-card-portal": { only: "react", why: PORTAL },
  "drawer/drawer-portal": { only: "react", why: "Vaul's portal is Radix's, which renders no element and drops the attribute; vaul-vue's is Reka's, which renders none either" },
};

// Components that render no element of their own, and so have nothing to compare.
const UNSTYLED: Record<string, string> = {
  direction: "Radix's DirectionProvider and Reka's ConfigProvider render only their children",
};
// Elements with no data-slot, styled in one output only, by their classes.
const ACCEPTED_UNSLOTTED: Record<string, { only: "react" | "vue"; classes: string; why: string }> = {
  combobox: {
    only: "react",
    classes: "isolate z-50",
    why: "Base UI positions the list from a Positioner element, which the React file stacks with isolate z-50; Reka's popper wrapper isn't ours to style and takes the list's own z-index (the list's z-50, in both)",
  },
};
const seenUnslotted = new Set<string>();

// What an element's class expression comes to, read from the source: the classes written as
// string literals, the functions that make classes (buttonVariants), and whether tailwind-merge
// runs over them (a cn call): merged and unmerged lists of the same classes can render differently.
// slot is "" for an element with no data-slot.
type SlotClasses = { slot: string; classes: string[]; calls: string[]; merged: boolean };

function readExpression(node: ts.Node, out: Omit<SlotClasses, "slot">, constants: Map<string, string>) {
  if (ts.isStringLiteralLike(node)) out.classes.push(...node.text.split(/\s+/).filter(Boolean));
  if (ts.isIdentifier(node) && constants.has(node.text)) out.classes.push(...constants.get(node.text)!.split(/\s+/).filter(Boolean));
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    if (node.expression.text === "cn") out.merged = true;
    else out.calls.push(node.expression.text);
  }
  // An object's keys (variant, intent, size, class) are names, not classes; a property access
  // (props.class, group.spacing) names no class either.
  if (ts.isPropertyAssignment(node)) return readExpression(node.initializer, out, constants);
  if (ts.isPropertyAccessExpression(node)) return;
  ts.forEachChild(node, (child) => readExpression(child, out, constants));
}

function fromExpression(slot: string, code: string, constants = new Map<string, string>()): SlotClasses {
  const out = { slot, classes: [] as string[], calls: [] as string[], merged: false };
  readExpression(ts.createSourceFile("class.ts", `(${code})`, ts.ScriptTarget.ES2022, true), out, constants);
  return out;
}

// const x = "…" in a file: a class list a className can name.
function stringConstants(file: ts.SourceFile): Map<string, string> {
  const constants = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined && ts.isStringLiteral(node.initializer)) constants.set(node.name.text, node.initializer.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return constants;
}

function reactSlots(source: string): SlotClasses[] {
  const file = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const constants = stringConstants(file);
  const found: SlotClasses[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const attribute = (name: string) => attributes.find((a) => a.name.getText() === name)?.initializer;
      let slot: string | undefined;
      const direct = attribute("data-slot");
      if (direct !== undefined && ts.isStringLiteral(direct)) slot = direct.text;
      // {...{ "data-slot": "badge", … }}
      for (const spread of node.attributes.properties.filter(ts.isJsxSpreadAttribute)) {
        if (!ts.isObjectLiteralExpression(spread.expression)) continue;
        for (const p of spread.expression.properties) if (ts.isPropertyAssignment(p) && ts.isStringLiteral(p.name) && p.name.text === "data-slot" && ts.isStringLiteral(p.initializer)) slot = p.initializer.text;
      }
      const className = attribute("className");
      let classes: SlotClasses | undefined;
      if (className !== undefined && ts.isStringLiteral(className)) classes = fromExpression("", JSON.stringify(className.text));
      else if (className !== undefined && ts.isJsxExpression(className) && className.expression !== undefined) classes = fromExpression("", className.expression.getText(), constants);
      if (slot !== undefined) found.push({ ...(classes ?? { classes: [], calls: [], merged: false }), slot });
      else if (classes !== undefined) found.push(classes);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

// The template AST's node types, as vue/compiler-sfc's parse returns them.
type TemplateChildNode = NonNullable<NonNullable<ReturnType<typeof parse>["descriptor"]["template"]>["ast"]>["children"][number];
type ElementNode = Extract<TemplateChildNode, { tag: string; props: unknown }>;

function vueSlots(source: string): SlotClasses[] {
  const found: SlotClasses[] = [];
  const visit = (nodes: TemplateChildNode[]) => {
    for (const node of nodes) {
      if (node.type !== 1) continue;
      const element = node as ElementNode;
      let slot: string | undefined;
      let classes: SlotClasses | undefined;
      for (const prop of element.props) {
        if (prop.type === 6 && prop.name === "data-slot") slot = prop.value?.content;
        if (prop.type === 6 && prop.name === "class") classes = fromExpression("", JSON.stringify(prop.value?.content ?? ""));
        if (prop.type === 7 && prop.name === "bind" && prop.arg?.type === 4 && prop.arg.content === "class" && prop.exp?.type === 4) classes = fromExpression("", prop.exp.content);
      }
      if (slot !== undefined) found.push({ ...(classes ?? { classes: [], calls: [], merged: false }), slot });
      else if (classes !== undefined) found.push(classes);
      visit(element.children);
    }
  };
  const { descriptor, errors } = parse(source);
  if (errors.length > 0) throw errors[0];
  visit(descriptor.template?.ast?.children ?? []);
  return found;
}

const rekaVars = (s: string) => s.replaceAll("--radix-", "--reka-");
const sorted = (slots: SlotClasses[]) => slots.map((s) => JSON.stringify([s.slot, [...s.classes].sort(), s.calls, s.merged])).sort();

function slotsByComponent(files: GeneratedFile[], component: string, framework: "react" | "vue"): SlotClasses[] {
  const slots =
    framework === "react"
      ? reactSlots(files.find((f) => f.path === `components/ui/${component}.tsx`)!.source).map((s) => ({ ...s, classes: asVueClasses(s.slot, s.classes.map(rekaVars)) }))
      : files.filter((f) => f.path.startsWith(`components/ui/${component}/`) && f.path.endsWith(".vue")).flatMap((f) => vueSlots(f.source));
  for (const s of slots) s.classes = withoutLibraryClasses(s.slot, s.classes);
  const unslotted = ACCEPTED_UNSLOTTED[component];
  return (
    slots
      .filter((s) => ACCEPTED[`${component}/${s.slot}`]?.only !== framework)
      .filter((s) => {
        const accepted = unslotted !== undefined && unslotted.only === framework && s.slot === "" && [...s.classes].sort().join(" ") === unslotted.classes.split(" ").sort().join(" ");
        if (accepted) seenUnslotted.add(component);
        return !accepted;
      })
      // An element with no data-slot and no classes of its own says nothing (a Button's className
      // passed on as is).
      .filter((s) => s.slot !== "" || s.classes.length > 0 || s.calls.length > 0)
  );
}

// ---------- cva configs ----------

type Cva = { base: string[]; variants: Record<string, Record<string, string[]>>; compound: string[]; defaults: Record<string, string> };
const tokens = (classes: unknown) => [...new Set(String(classes ?? "").split(/\s+/).filter(Boolean))].map(rekaVars).sort();

// Every `const x = cva(…)` in a set of sources, evaluated (their arguments are literals).
function cvas(sources: string[]): Record<string, Cva> {
  const out: Record<string, Cva> = {};
  for (const source of sources) {
    const file = ts.createSourceFile("s.ts", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined && ts.isCallExpression(node.initializer) && node.initializer.expression.getText() === "cva") {
        const [base, config = {}] = new Function(`return [${node.initializer.arguments.map((a) => a.getText()).join(", ")}];`)() as [unknown, { variants?: Record<string, Record<string, unknown>>; compoundVariants?: Record<string, unknown>[]; defaultVariants?: Record<string, string> }];
        out[node.name.text] = {
          base: tokens(Array.isArray(base) ? base.join(" ") : base),
          variants: Object.fromEntries(Object.entries(config.variants ?? {}).map(([axis, values]) => [axis, Object.fromEntries(Object.entries(values).map(([v, c]) => [v, tokens(Array.isArray(c) ? c.join(" ") : c)]))])),
          compound: (config.compoundVariants ?? [])
            .map(({ class: c, ...when }) => `${JSON.stringify(Object.entries(when).sort())} ${tokens(c).join(" ")}`)
            .sort(),
          defaults: config.defaultVariants ?? {},
        };
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return out;
}

const vueScripts = (files: GeneratedFile[], component: string) =>
  files
    .filter((f) => f.path.startsWith(`components/ui/${component}/`))
    .map((f) => (f.path.endsWith(".vue") ? [parse(f.source).descriptor.scriptSetup?.content ?? "", parse(f.source).descriptor.script?.content ?? ""].join("\n") : f.source));

let ssr: Loader;
beforeAll(async () => {
  ssr = await createLoader("ssr");
});
afterAll(() => ssr.close());

const seen = new Set<string>();
const unstyledSeen = new Set<string>();

describe.each(Object.keys(SYSTEMS))("%s system", (name) => {
  let system: DesignSystem;
  let react: GeneratedFile[];
  let vue: GeneratedFile[];
  beforeAll(async () => {
    system = SYSTEMS[name]!();
    react = await renderAll("radix", system);
    vue = await renderAll("reka-ui", system);
  });

  it.each(COMPONENTS.filter((c) => !(c in OWN_STRUCTURE)))("%s: each element's classes are the Radix output's", (component) => {
    for (const [key, entry] of Object.entries(ACCEPTED)) {
      if (!key.startsWith(`${component}/`)) continue;
      const slot = key.slice(component.length + 1);
      const inReact = reactSlots(react.find((f) => f.path === `components/ui/${component}.tsx`)!.source).some((s) => s.slot === slot);
      if (inReact === (entry.only === "react")) seen.add(key);
    }
    const expected = slotsByComponent(react, component, "react");
    if (component in UNSTYLED) {
      unstyledSeen.add(component);
      expect(expected).toEqual([]);
    } else expect(expected.length).toBeGreaterThan(0);
    expect(sorted(slotsByComponent(vue, component, "vue"))).toEqual(sorted(expected));
  });

  it.each(COMPONENTS)("%s: every cva is the Radix output's", (component) => {
    const reactCvas = cvas([react.find((f) => f.path === `components/ui/${component}.tsx`)!.source]);
    expect(cvas(vueScripts(vue, component))).toEqual(reactCvas);
  });

  it("buttonVariants gives the same classes for every variant, alias, intent and size", async () => {
    const reactDir = writeGenerated(`class-${name}-react`, react);
    const vueDir = writeGenerated(`class-${name}-vue`, vue);
    type Variants = (props: Record<string, string | undefined>) => string;
    const reactVariants = (await ssr.load<{ buttonVariants: Variants }>(join(reactDir, "components/ui/button.tsx"))).buttonVariants;
    const vueVariants = (await ssr.load<{ buttonVariants: Variants }>(join(vueDir, "components/ui/button/index.ts"))).buttonVariants;

    const button = system.components["button"]!;
    const axes = button.axes;
    const sizes = axes.size?.enabled ?? [];
    const variantNames = [undefined, ...(axes.variant?.enabled ?? []), ...Object.keys(SHADCN_VARIANT_ALIASES)];
    const intentNames = [undefined, ...(axes.intent?.enabled ?? [])];
    const sizeNames = [undefined, "default", "icon", ...sizes, ...sizes.map((s) => `icon-${s}`)];
    // Every enabled selection is among these, with the aliases, the defaults and the square sizes.
    for (const variant of new Set(variantNames))
      for (const intent of intentNames)
        for (const size of sizeNames) {
          const props = { variant, intent, size };
          expect(vueVariants({ ...props, class: "mt-2" }), JSON.stringify(props)).toBe(reactVariants({ ...props, className: "mt-2" }));
        }
  });
});

it("every accepted difference still occurs", () => {
  expect([...seen].sort()).toEqual(Object.keys(ACCEPTED).sort());
  expect([...unstyledSeen].sort()).toEqual(Object.keys(UNSTYLED).sort());
  expect([...seenUnslotted].sort()).toEqual(Object.keys(ACCEPTED_UNSLOTTED).sort());
  expect(REKA_CLASSES.filter((d) => !seenClasses.has(d)).map((d) => d.slot)).toEqual([]);
  expect(LIBRARY_CLASSES.filter((l) => !seenLibrary.has(l)).map((l) => l.slot)).toEqual([]);
});
