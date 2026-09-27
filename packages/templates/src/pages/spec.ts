import { z } from "zod";

// A page, in json-render's spec format (github.com/vercel-labs/json-render): a flat map of elements
// by key, each naming a catalog type with its props, its children's keys and named slots. Flat
// keeps a streamed spec renderable at every step and lets a model edit one element by key.
//
// tesserai supports a subset for now: no `visible`, `on`, `repeat`, `watch` or `$state` bindings.
// Interactivity comes from uncontrolled components (defaultChecked, overlays that open themselves)
// and from components that keep their own state in the printed code (a table's selection).
export const PageElement = z
  .object({
    type: z.string().min(1),
    props: z.record(z.string(), z.unknown()).default({}),
    children: z.array(z.string()).optional(),
    slots: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strict();
export type PageElement = z.infer<typeof PageElement>;

export const PageSpec = z
  .object({
    root: z.string().min(1),
    elements: z.record(z.string(), PageElement),
  })
  .strict()
  .superRefine((spec, ctx) => {
    if (!(spec.root in spec.elements)) {
      ctx.addIssue({ code: "custom", message: `the root "${spec.root}" isn't an element` });
      return;
    }
    // Every child exists, and no element is its own ancestor.
    const walk = (key: string, path: string[]) => {
      if (path.includes(key)) {
        ctx.addIssue({ code: "custom", message: `"${key}" contains itself (${[...path, key].join(" > ")})` });
        return;
      }
      const el = spec.elements[key];
      if (el === undefined) {
        ctx.addIssue({ code: "custom", message: `"${path.at(-1)}" refers to "${key}", which isn't an element` });
        return;
      }
      for (const child of [...(el.children ?? []), ...Object.values(el.slots ?? {}).flat()]) walk(child, [...path, key]);
    };
    walk(spec.root, []);
  });
export type PageSpec = z.infer<typeof PageSpec>;

// Builds a spec in code, one element at a time, with keys made from each element's type. The
// example pages are written with it.
export function specBuilder() {
  const elements: Record<string, PageElement> = {};
  const counts = new Map<string, number>();
  const add = (type: string, props: Record<string, unknown> = {}, children: string[] = [], slots?: Record<string, string[]>): string => {
    const base = type.replace(/[A-Z]/g, (c, i: number) => (i === 0 ? c.toLowerCase() : `-${c.toLowerCase()}`));
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    const key = n === 1 ? base : `${base}-${n}`;
    elements[key] = { type, props, ...(children.length > 0 ? { children } : {}), ...(slots === undefined ? {} : { slots }) };
    return key;
  };
  return { add, spec: (root: string): PageSpec => ({ root, elements }) };
}

// The part of a spec still being written that can already be shown: elements whose type has
// arrived, with references to elements not written yet left out. A reply streams in element by
// element, so the page builds on screen from the top down. Null until the root has arrived.
export function draftSpec(partial: unknown): PageSpec | null {
  if (typeof partial !== "object" || partial === null) return null;
  const { root, elements } = partial as { root?: unknown; elements?: unknown };
  if (typeof root !== "string" || typeof elements !== "object" || elements === null) return null;
  const ready = new Map<string, PageElement>();
  for (const [key, value] of Object.entries(elements as Record<string, unknown>)) {
    const parsed = PageElement.safeParse(value);
    if (parsed.success) ready.set(key, parsed.data);
  }
  if (!ready.has(root)) return null;
  const keep = (keys: string[] | undefined) => keys?.filter((k) => typeof k === "string" && ready.has(k));
  const out: Record<string, PageElement> = {};
  // Only what the root reaches, once each (a half-written reference can't make a loop that way).
  const seen = new Set<string>();
  const visit = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const el = ready.get(key)!;
    const children = keep(el.children);
    const slots = el.slots === undefined ? undefined : Object.fromEntries(Object.entries(el.slots).map(([k, v]) => [k, keep(v) ?? []]));
    out[key] = { ...el, ...(children === undefined ? {} : { children }), ...(slots === undefined ? {} : { slots }) };
    for (const child of [...(children ?? []), ...Object.values(slots ?? {}).flat()]) visit(child);
  };
  visit(root);
  // A child reached twice would make the tree a graph; the second reference is dropped.
  const placed = new Set<string>([root]);
  for (const el of Object.values(out)) {
    if (el.children !== undefined) el.children = el.children.filter((k) => !placed.has(k) && placed.add(k));
    if (el.slots !== undefined) for (const slot of Object.keys(el.slots)) el.slots[slot] = el.slots[slot]!.filter((k) => !placed.has(k) && placed.add(k));
  }
  const spec = PageSpec.safeParse({ root, elements: out });
  return spec.success ? spec.data : null;
}
