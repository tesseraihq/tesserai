import { enabledSelections, partOf, resolveRecipe, type Anatomy, type Selection } from "@tesserai/core";
import { partClasses, type PartOptions } from "./classes";

export type AxisName = "variant" | "intent" | "size";
const AXES: AxisName[] = ["variant", "intent", "size"];

export type CvaConfig = {
  base: string[];
  variants: Partial<Record<AxisName, Record<string, string[]>>>;
  compoundVariants: { selection: Selection; classes: string[] }[];
  defaultVariants: Selection;
};

// A component's classes, element by element, as its pieces function returns them for every
// framework's shell to print: a cva config where they vary by axis, a list where they don't. Keys
// are the data-slot the React output gives the element. An element with no data-slot of its own (an
// icon, an inner wrapper), or a second element sharing one, is keyed "<data-slot>:<name>" after the
// slot it sits in or shares.
export type Slots = Record<string, string[] | CvaConfig>;

type Combo = { selection: Selection; classes: string[]; covered: Set<string> };

function matches(selection: Selection, partial: Selection): boolean {
  return AXES.every((axis) => partial[axis] === undefined || partial[axis] === selection[axis]);
}

// Classes present and not yet covered in every combination of the group, in first-seen order.
function uncoveredShared(group: Combo[]): string[] {
  const [first, ...rest] = group;
  if (first === undefined) return [];
  return first.classes.filter(
    (c) => !first.covered.has(c) && rest.every((combo) => combo.classes.includes(c) && !combo.covered.has(c)),
  );
}

function assign(group: Combo[], classes: string[]): void {
  for (const combo of group) classes.forEach((c) => combo.covered.add(c));
}

// Computes the full class list for every enabled combination, then factors it from broad to narrow:
// classes shared by all combinations become the base, classes shared by every combination with one
// axis value become that axis's variant, then pairs of axes, then whatever a single combination still
// needs. Coverage is tracked per combination so a class can serve several groups when it must.
// The result is the smallest CVA config that reproduces the grid exactly.
export function factorClasses(
  anatomy: Anatomy,
  part: string,
  options: PartOptions,
  extraBase: string[] = [],
): CvaConfig {
  const combos: Combo[] = enabledSelections(anatomy).map((selection) => ({
    selection,
    classes: partClasses(partOf(resolveRecipe(anatomy, selection), anatomy.name, part), options),
    covered: new Set(),
  }));

  const base = uncoveredShared(combos);
  assign(combos, base);

  const variants: CvaConfig["variants"] = {};
  for (const axis of AXES) {
    const values = anatomy.axes[axis]?.enabled;
    if (values === undefined) continue;
    variants[axis] = {};
    for (const value of values) {
      const group = combos.filter((c) => c.selection[axis] === value);
      const classes = uncoveredShared(group);
      assign(group, classes);
      variants[axis][value] = classes;
    }
  }

  const compoundVariants: CvaConfig["compoundVariants"] = [];
  const pairs: [AxisName, AxisName][] = [
    ["variant", "intent"],
    ["variant", "size"],
    ["intent", "size"],
  ];
  for (const [a, b] of pairs) {
    const aValues = anatomy.axes[a]?.enabled;
    const bValues = anatomy.axes[b]?.enabled;
    if (aValues === undefined || bValues === undefined) continue;
    for (const av of aValues) {
      for (const bv of bValues) {
        const partial: Selection = { [a]: av, [b]: bv };
        const group = combos.filter((c) => matches(c.selection, partial));
        const classes = uncoveredShared(group);
        if (classes.length === 0) continue;
        assign(group, classes);
        compoundVariants.push({ selection: partial, classes });
      }
    }
  }
  for (const combo of combos) {
    const classes = combo.classes.filter((c) => !combo.covered.has(c));
    if (classes.length > 0) compoundVariants.push({ selection: combo.selection, classes });
  }

  const defaultVariants: Selection = {};
  for (const axis of AXES) {
    const def = anatomy.axes[axis]?.default;
    if (def !== undefined) defaultVariants[axis] = def;
  }

  return { base: [...extraBase, ...base], variants, compoundVariants, defaultVariants };
}

// Class list for a component with no axes.
export function flatClasses(anatomy: Anatomy, part: string, options: PartOptions, extra: string[] = []): string[] {
  return [...extra, ...partClasses(partOf(resolveRecipe(anatomy, {}), anatomy.name, part), options)];
}

// For parts a template renders with a single class string: fails loudly if the part's styling
// varies by axis, rather than silently dropping the variation.
export function flatOnly(config: CvaConfig, component: string, part: string): string[] {
  const varying = Object.entries(config.variants).filter(([, values]) => Object.values(values).some((c) => c.length > 0));
  if (varying.length > 0 || config.compoundVariants.length > 0) {
    const axes = varying.map(([axis]) => axis).join(", ");
    throw new Error(`${component}.${part} varies by ${axes || "axis combination"}, which this template does not support yet`);
  }
  return config.base;
}
