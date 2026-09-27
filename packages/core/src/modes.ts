import { z } from "zod";

// Axis order is the tie-breaker when two selectors match the same number of axes.
export const MODE_AXES = ["brand", "colorScheme", "density", "touch"] as const;
export type ModeAxis = (typeof MODE_AXES)[number];

// A brand id, or "default" for the shared system (BrandId's shape).
const BrandValue = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/, "a brand id");

export const ModeSelector = z
  .object({
    brand: BrandValue,
    colorScheme: z.enum(["light", "dark"]),
    density: z.enum(["compact", "default", "comfortable"]),
    touch: z.boolean(),
  })
  .partial()
  .strict();
export type ModeSelector = z.infer<typeof ModeSelector>;

export const ModeContext = z.object({
  brand: BrandValue,
  colorScheme: z.enum(["light", "dark"]),
  density: z.enum(["compact", "default", "comfortable"]),
  touch: z.boolean(),
});
export type ModeContext = z.infer<typeof ModeContext>;

export const DEFAULT_MODE: ModeContext = {
  brand: "default",
  colorScheme: "light",
  density: "default",
  touch: false,
};

export function selectorMatches(selector: ModeSelector, context: ModeContext): boolean {
  for (const axis of MODE_AXES) {
    const wanted = selector[axis];
    if (wanted !== undefined && wanted !== context[axis]) return false;
  }
  return true;
}

// Specificity: primary key is how many axes the selector constrains; secondary key is the
// axis order, so a later (more situational) axis beats an earlier one on ties.
export function specificity(selector: ModeSelector): [count: number, weight: number] {
  let count = 0;
  let weight = 0;
  MODE_AXES.forEach((axis, index) => {
    if (selector[axis] !== undefined) {
      count += 1;
      weight |= 1 << index;
    }
  });
  return [count, weight];
}

export function compareSpecificity(a: ModeSelector, b: ModeSelector): number {
  const [ac, aw] = specificity(a);
  const [bc, bw] = specificity(b);
  return ac !== bc ? ac - bc : aw - bw;
}

export function pickMostSpecific<T extends { selector: ModeSelector }>(
  candidates: readonly T[],
  context: ModeContext,
): T | undefined {
  let best: T | undefined;
  for (const candidate of candidates) {
    if (!selectorMatches(candidate.selector, context)) continue;
    if (best === undefined || compareSpecificity(candidate.selector, best.selector) > 0) {
      best = candidate;
    }
  }
  return best;
}

// Relevant finite contexts, including combinations of independently authored axes.
export function modeContexts(selectors: Iterable<ModeSelector>): ModeContext[] {
  const values = new Map<ModeAxis, Set<string | boolean>>(
    MODE_AXES.map((axis) => [axis, new Set([DEFAULT_MODE[axis]])]),
  );
  values.get("colorScheme")!.add("dark");
  for (const selector of selectors)
    for (const axis of MODE_AXES)
      if (selector[axis] !== undefined) values.get(axis)!.add(selector[axis]!);
  let contexts: ModeContext[] = [{ ...DEFAULT_MODE }];
  for (const axis of MODE_AXES)
    contexts = contexts.flatMap((context) =>
      [...values.get(axis)!].map((value) => ({ ...context, [axis]: value })),
    );
  return contexts;
}
