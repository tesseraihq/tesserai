// What the parity tests compare: every element that carries a data-slot, in document order, with
// its tag, its classes (as a set: order never matters to CSS) and its data attributes. A tokenizer
// for server-rendered HTML is enough: React and Svelte both write double-quoted attributes.
export type SlotElement = { slot: string; tag: string; classes: string[]; data: Record<string, string> };

const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?>/g;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function slotElements(html: string): SlotElement[] {
  const out: SlotElement[] = [];
  for (const [, tag, attrs] of html.matchAll(TAG)) {
    const values = new Map<string, string>();
    for (const m of (attrs ?? "").matchAll(ATTR)) values.set(m[1]!.toLowerCase(), decode(m[2] ?? m[3] ?? m[4] ?? ""));
    const slot = values.get("data-slot");
    if (slot === undefined) continue;
    const classes = withoutLibraryClasses(slot, [...new Set((values.get("class") ?? "").split(/\s+/).filter(Boolean))]).sort();
    const data = Object.fromEntries([...values].filter(([name]) => name.startsWith("data-") && name !== "data-slot").sort(([a], [b]) => a.localeCompare(b)));
    out.push({ slot, tag: tag!.toLowerCase(), classes, data });
  }
  return out;
}

// An accepted difference between the React (Radix) and Svelte (Bits UI) output, and why: a data
// attribute, the tag, classes written with another state prefix or variable name, or an element (or
// a styled part) one side has and the other doesn't.
export type Allowed = { slot: string; reason: string } & (
  | { attribute: string }
  | { tag: { react: string; svelte: string } }
  | { classes: { react: string; svelte: string } }
  | { extraClass: string }
  | { only: "react" | "svelte" }
  // The element's classes are written on another element that styles it (heldBy says which), so in
  // Svelte it has none of its own.
  | { heldBy: string }
);

// The two lists with the elements only one side may render taken out of it. The other side must
// render none of that slot, or the allowance would hide a real difference.
export function withoutOneSided(allowed: Allowed[], react: SlotElement[], svelte: SlotElement[], used: Set<Allowed>): { react: SlotElement[]; svelte: SlotElement[] } {
  let r = react;
  let s = svelte;
  for (const a of allowed) {
    if (!("only" in a)) continue;
    const extra = a.only === "react" ? r : s;
    if (!extra.some((e) => e.slot === a.slot)) continue;
    const other = a.only === "react" ? s : r;
    if (other.some((e) => e.slot === a.slot)) throw new Error(`${a.slot} is allowed on the ${a.only} side only, but both render it`);
    used.add(a);
    if (a.only === "react") r = r.filter((e) => e.slot !== a.slot);
    else s = s.filter((e) => e.slot !== a.slot);
  }
  return { react: r, svelte: s };
}

// Svelte's classes for a slot as React's output writes them (another state prefix, a --bits-
// variable for a --radix- one, less a class a Svelte package adds of its own).
export function asReactClasses(allowed: Allowed[], slot: string, classes: string[], used: Set<Allowed>): string[] {
  let out = classes;
  for (const a of allowed) {
    if (a.slot !== slot) continue;
    if ("extraClass" in a) {
      if (out.includes(a.extraClass)) used.add(a);
      out = out.filter((c) => c !== a.extraClass);
    }
    if (!("classes" in a)) continue;
    const next = out.map((c) => c.replaceAll(a.classes.svelte, a.classes.react));
    if (next.some((c, i) => c !== out[i])) used.add(a);
    out = next;
  }
  return [...new Set(out)].sort();
}

// The Svelte element with the allowed differences taken back to React's, so what's left must match.
// Entries that made a difference are added to `used`, so a stale entry can be found and removed.
export function allowing(allowed: Allowed[], react: SlotElement, svelte: SlotElement, used: Set<Allowed>): SlotElement {
  const data = { ...svelte.data };
  let tag = svelte.tag;
  for (const a of allowed) {
    if (a.slot !== svelte.slot) continue;
    if ("attribute" in a) {
      if (data[a.attribute] === react.data[a.attribute]) continue;
      delete data[a.attribute];
      if (a.attribute in react.data) data[a.attribute] = react.data[a.attribute]!;
      used.add(a);
    } else if ("tag" in a && tag === a.tag.svelte && react.tag === a.tag.react) {
      tag = react.tag;
      used.add(a);
    }
  }
  let classes = asReactClasses(allowed, svelte.slot, svelte.classes, used);
  for (const a of allowed) {
    if (a.slot !== svelte.slot || !("heldBy" in a) || classes.length > 0 || react.classes.length === 0) continue;
    classes = react.classes;
    used.add(a);
  }
  return { ...svelte, tag, data, classes };
}

// The one part a library draws into, where each output's classes reach into its own library's
// markup: those are left out on both sides (neither library's selectors can match the other's
// markup), and what's left is compared. Each with the reason, and where the rest is held.
export type LibraryClasses = { slot: string; react: RegExp; svelte: RegExp; why: string };
export const LIBRARY_CLASSES: LibraryClasses[] = [
  {
    slot: "chart",
    // A class prefix (tw:) comes first.
    react: /^(\w+:)?\[&_\.recharts-/,
    svelte: /^(\w+:)?\[&_\.lc-/,
    why: "React's chart is Recharts', Svelte's LayerChart's (shadcn-svelte's): each is themed through selectors on its own SVG's classes. The system's color for each role (axis, grid, cursor) is the same token in both, which the templates' pieces test holds; the layout and type size are compared here, and the tooltip and legend in chart-parity.test.ts",
  },
];
export const seenLibrary = new Set<LibraryClasses>();

export function withoutLibraryClasses(slot: string, classes: string[]): string[] {
  let out = classes;
  for (const l of LIBRARY_CLASSES) {
    if (l.slot !== slot) continue;
    const kept = out.filter((c) => !l.react.test(c) && !l.svelte.test(c));
    if (kept.length !== out.length) seenLibrary.add(l);
    out = kept;
  }
  return out;
}
