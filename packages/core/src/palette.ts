// A palette is a subset of one canonical 12-step curve (the Radix layout: 1-2 backgrounds, 3-5
// fills, 6-8 borders, 9-10 solids, 11-12 text). A palette with fewer steps keeps the most important
// canonical steps, in this order, so a 6-step palette is still background, fill, strong border,
// solid, solid hover and text: the steps an interface cannot do without. Every role then reads the
// nearest step the palette kept. At 9 steps every intent role has its own step; the 10th is the
// subtle background that separates cards from the page in dark mode, which is why 10 is the default.
// Canonical 5 (pressed fill) and 6 (subtle border) are read by no role by default.

export const CANONICAL_STEPS = 12;
export const MIN_STEPS = 3;

// Most important first. The first three (background, solid, strong text) are the minimum palette.
export const STEP_PRIORITY = [1, 9, 12, 8, 10, 3, 11, 7, 4, 2, 5, 6] as const;

// What new systems start with; saved systems keep the size they have.
export const DEFAULT_STEPS = 10;

export type CanonicalStep = number;

export function clampSteps(steps: number | undefined): number {
  if (steps === undefined || !Number.isFinite(steps)) return CANONICAL_STEPS;
  return Math.min(CANONICAL_STEPS, Math.max(MIN_STEPS, Math.round(steps)));
}

// The canonical steps an n-step palette keeps, in order. Its step k (1-based) is keptSteps(n)[k-1].
export function keptSteps(steps: number | undefined): CanonicalStep[] {
  const n = clampSteps(steps);
  return [...STEP_PRIORITY.slice(0, n)].sort((a, b) => a - b);
}

// The palette step (1..n) that plays a canonical role. Ties between two kept steps go toward the
// stronger end for border and text roles (7 and up) and toward the lighter end for fills, so a
// reduced palette never weakens a contrast-bearing role.
export function stepFor(canonical: CanonicalStep, steps: number | undefined): number {
  const kept = keptSteps(steps);
  let best = 0;
  let bestDistance = Infinity;
  kept.forEach((c, i) => {
    const distance = Math.abs(c - canonical);
    const better = distance < bestDistance || (distance === bestDistance && (canonical >= 7 ? c > (kept[best] ?? 0) : c < (kept[best] ?? 0)));
    if (better) {
      best = i;
      bestDistance = distance;
    }
  });
  return best + 1;
}

// The canonical role behind a palette step, so references can be carried across a change of size.
export function canonicalOf(step: number, steps: number | undefined): CanonicalStep | undefined {
  return keptSteps(steps)[step - 1];
}

// Where a reference to step `step` of an `from`-step palette should point in a `to`-step palette.
export function remapStep(step: number, from: number | undefined, to: number | undefined): number | undefined {
  const canonical = canonicalOf(step, from);
  return canonical === undefined ? undefined : stepFor(canonical, to);
}

export const CANONICAL_ROLES: Record<CanonicalStep, { band: string; use: string }> = {
  1: { band: "Background", use: "Page background" },
  2: { band: "Background", use: "Subtle background" },
  3: { band: "Background", use: "Element background" },
  4: { band: "Background", use: "Hovered element" },
  5: { band: "Background", use: "Pressed or selected element" },
  6: { band: "Border", use: "Subtle border" },
  7: { band: "Border", use: "Border" },
  8: { band: "Border", use: "Strong border" },
  9: { band: "Solid", use: "Solid background" },
  10: { band: "Solid", use: "Hovered solid" },
  11: { band: "Text", use: "Secondary text" },
  12: { band: "Text", use: "Primary text" },
};
