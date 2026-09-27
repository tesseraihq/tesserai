import { componentName } from "../component-groups";
import { resolveRecipe } from "../components";
import { contrastRatio } from "../color";
import { checkContrast } from "../contrast";
import { applyChangeset } from "../ops/changeset";
import { PRESETS } from "../presets";
import type { ColorValue } from "../tokens";
import { DEFAULT_MODE, type ModeContext } from "../modes";
import { resolveToken } from "../resolve";
import { includedComponents, type DesignSystem } from "../system";
import { flattenTokens, type Token } from "../tokens";
import { guideline, type GuidelineSource } from "./content";
import { KEEPABLE } from "./keepable";
export { KEEPABLE };

// What a change does against the measurable guidelines: only what it introduces (the defaults
// already sit below some of them, on purpose, for dense desktop UI), so a note always points at
// something this change did. The AI's reply is built from these, and the person sees them under
// the proposal with a way to take the recommended value instead.

export type GuidelineNote = {
  guideline: string;
  level: "must" | "should";
  title: string;
  // What this change did, in plain words with the numbers.
  detail: string;
  sources: GuidelineSource[];
  // A request the person can send to take the recommendation instead.
  recommend?: string;
  // Which rule found it, for keeping a convention its own way (guideline.keep).
  rule?: string;
};

const MAX_NOTES = 3;
// The stock palettes, to tell a status color someone chose from one left as it came.
const PRESET_STATUS = PRESETS[0]!.build();
export const TOUCH: ModeContext = { ...DEFAULT_MODE, touch: true };

export type Flat = Map<string, Token>;
export function value(flat: Flat, path: string, mode: ModeContext = DEFAULT_MODE): unknown {
  try {
    return resolveToken(flat, path, mode).$value;
  } catch {
    return undefined;
  }
}
// Dimensions and durations in px and ms.
export function px(v: unknown): number | undefined {
  if (v === null || typeof v !== "object" || !("value" in v) || !("unit" in v)) return undefined;
  const d = v as { value: number; unit: string };
  return d.unit === "rem" ? d.value * 16 : d.unit === "px" ? d.value : undefined;
}
export function ms(v: unknown): number | undefined {
  if (v === null || typeof v !== "object" || !("value" in v) || !("unit" in v)) return undefined;
  const d = v as { value: number; unit: string };
  return d.unit === "ms" ? d.value : d.unit === "s" ? d.value * 1000 : undefined;
}
export const round = (n: number) => Math.round(n * 10) / 10;
// `level` overrides the guideline's own when this finding is the softer part of it (a thin focus
// ring is visible but short of WCAG's AAA thickness).
function note(id: string, detail: string, recommend?: string, level?: GuidelineNote["level"]): GuidelineNote {
  const g = guideline(id)!;
  return { guideline: id, level: level ?? g.level, title: g.title, detail, sources: g.sources, ...(recommend === undefined ? {} : { recommend }) };
}

// What each component renders, per size and part: its height and text size, on desktop and on
// touch screens, whether they come from a size token or a style set on the component itself (which
// is stored as a token the component owns), with the token each comes from. Keyed
// "component|size|part".
export type Measure = {
  label: string;
  component: string;
  size: string | undefined;
  part: string;
  height: number | undefined;
  touchHeight: number | undefined;
  text: number | undefined;
  touchText: number | undefined;
  heightRef: string | undefined;
  textRef: string | undefined;
};
// Not targets: indicators and decoration, and controls whose label is part of the target.
const NOT_TARGET = new Set(["badge", "progress", "kbd", "avatar", "switch", "checkbox", "radio-group", "slider", "textarea", "table", "drawer", "sheet", "separator", "skeleton", "spinner", "input-otp", "scroll-area", "aspect-ratio", "chart", "empty", "item"]);
const NOT_TARGET_PART = /indicator|track|thumb|handle|separator|bar$|popup|list|content|viewport|caret|chip/;
// A component's root, or a part that's pressed on its own (a trigger, an item, a tab, an action);
// never decoration (a rule, an indicator).
const TARGET_PART = /^(root|trigger|item|tab|action|button|close|link|option)$|-(trigger|item|tab|action|button|close|link)$/;
export const isTarget = (m: Measure) => !NOT_TARGET.has(m.component) && !NOT_TARGET_PART.test(m.part) && TARGET_PART.test(m.part);
const INPUT_LIKE = new Set(["input", "textarea", "select", "native-select", "combobox", "input-group", "field"]);
const SIZE_ORDER = ["xs", "sm", "md", "lg", "xl", "2xl"];

export function measure(system: DesignSystem, flat: Flat): Map<string, Measure> {
  const out = new Map<string, Measure>();
  const ref = (v: unknown) => (typeof v === "string" && v.startsWith("{") ? v.slice(1, -1) : undefined);
  const at = (v: unknown, mode: ModeContext) => {
    const r = ref(v);
    return r === undefined ? undefined : px(value(flat, r, mode));
  };
  for (const [name, anatomy] of Object.entries(includedComponents(system))) {
    const sizes: (string | undefined)[] = anatomy.axes.size?.enabled ?? [undefined];
    for (const size of sizes) {
      let recipe;
      try {
        recipe = resolveRecipe(anatomy, size === undefined ? {} : { size });
      } catch {
        continue;
      }
      for (const [part, style] of Object.entries(recipe)) {
        const base = style.base as Record<string, unknown>;
        const m: Measure = {
          label: `${componentName(name)}${size === undefined ? "" : ` ${size}`}${part === "root" ? "" : ` ${part.replace(/-/g, " ")}`}`,
          component: name,
          size,
          part,
          height: at(base.height, DEFAULT_MODE),
          touchHeight: at(base.height, TOUCH),
          text: at(base.fontSize, DEFAULT_MODE),
          touchText: at(base.fontSize, TOUCH),
          heightRef: ref(base.height),
          textRef: ref(base.fontSize),
        };
        if (m.height !== undefined || m.text !== undefined) out.set(`${name}|${size ?? ""}|${part}`, m);
      }
    }
  }
  return out;
}

// A token change that settles a finding: token.set's input.
export type FixOp = { path: string; value: string; mode?: { touch: true } };

// One thing a system does against a guideline. `key` stays the same while it's the same thing
// (the same component, size and rule), so a review can tell what a change introduced. `detail`
// is worded for a system as it is, or ("now") for what a change just did.
type Finding = { key: string; rule: string; guideline: string; level?: GuidelineNote["level"]; detail: (now: boolean) => string; recommend: string; fix?: FixOp[]; example: string };
export const keptRules = (system: DesignSystem): string[] => (system.kept ?? []).map((k) => k.rule);

// Why each rule matters, for a row that sums several findings up.
const REASON: Record<string, string> = {
  focus: "keyboard users need a ring they can find",
  grid: "off the 4px grid",
  motion: "interface motion over about 400ms makes the app feel slow",
  target: "under WCAG's 24px minimum for clickable things",
  touch: "phones and tablets expect 44–48px on touch screens",
  text: "text people must read shouldn't go under 12px",
  zoom: "under 16px on touch screens, so iPhones zoom in when a field is focused",
  order: "each size should be taller than the last",
  lineup: "buttons and inputs of one size should line up in a row",
  "page-text": "text needs 4.5:1 against the page and cards",
  "contrast-text": "text needs 4.5:1 (3:1 when large)",
  "contrast-ui": "borders and focus rings need 3:1",
};

// `fixes`: look for the checker's proven contrast fixes (slow: a change's review doesn't need them).
function findings(system: DesignSystem, flat: Flat, fixes = false): Finding[] {
  const out: Finding[] = [];
  const is = (now: boolean) => (now ? "is now" : "is");
  const paths = [...flat.keys()];

  if (paths.includes("focus.width")) {
    const a = px(value(flat, "focus.width"));
    if (a !== undefined && a < 2)
      out.push({ key: "focus", rule: "focus", guideline: "states-focus-visible", level: "should", example: `${round(a)}px`, detail: (now) => `The focus ring ${is(now)} ${round(a)}px; WCAG's focus-appearance guidance asks for at least 2px so keyboard users can find it.`, recommend: "Keep the focus ring at 2px.", fix: [{ path: "focus.width", value: "2px" }] });
  }
  for (const path of paths.filter((p) => /^space\.|padding|(^|\.)gap$/.test(p))) {
    const a = px(value(flat, path));
    const onGrid = (n: number) => Math.abs(n / 2 - Math.round(n / 2)) < 0.01;
    if (a !== undefined && a > 0 && !onGrid(a)) {
      const to = Math.max(2, Math.round(a / 4) * 4 || 2);
      out.push({ key: `grid|${path}`, rule: "grid", guideline: "spacing-grid", example: `${path} ${round(a)}px`, detail: (now) => `${path} ${is(now)} ${round(a)}px, off the 4px grid.`, recommend: `Round ${path} to the nearest step of the 4px grid.`, fix: [{ path, value: `${to}px` }] });
    }
  }
  for (const path of paths.filter((p) => p.startsWith("motion.duration."))) {
    const a = ms(value(flat, path));
    if (a !== undefined && a > 500) out.push({ key: `motion|${path}`, rule: "motion", guideline: "motion-duration", example: `${path} ${a}ms`, detail: (now) => `${path} ${is(now)} ${a}ms; interface motion over about 400ms makes the app feel slow.`, recommend: `Bring ${path} back under 300ms.`, fix: [{ path, value: "300ms" }] });
  }

  // What components render: targets, text, sizes in order, buttons and inputs lining up.
  const measured = measure(system, flat);
  for (const [key, a] of measured) {
    if (isTarget(a) && a.height !== undefined && a.height < 24) {
      out.push({ key: `target|${key}`, rule: "target", guideline: "targets-minimum", example: `${a.label} ${round(a.height)}px`, detail: (now) => `${a.label} ${is(now)} ${round(a.height!)}px tall, under WCAG's 24px minimum for clickable things (a smaller one passes only with space around it).`, recommend: `Keep ${a.label.toLowerCase()} at least 24px tall.`, ...(a.heightRef === undefined ? {} : { fix: [{ path: a.heightRef, value: "24px" }] }) });
    } else if (isTarget(a) && a.touchHeight !== undefined && a.touchHeight < 44) {
      out.push({ key: `touch|${key}`, rule: "touch", guideline: "targets-touch", example: `${a.label} ${round(a.touchHeight)}px`, detail: (now) => `${a.label} on touch screens ${is(now)} ${round(a.touchHeight!)}px; phones and tablets expect 44–48px.`, recommend: `Keep ${a.label.toLowerCase()} 44px tall on touch screens only, and leave desktop as it is now.`, ...(a.heightRef === undefined ? {} : { fix: [{ path: a.heightRef, value: "44px", mode: { touch: true } }] }) });
    }
    if (a.text !== undefined && a.text < 12)
      out.push({ key: `text|${key}`, rule: "text", guideline: "type-min-size", example: `${a.label} ${round(a.text)}px`, detail: (now) => `${a.label} text ${is(now)} ${round(a.text!)}px; text people must read shouldn't go under 12px.`, recommend: `Keep ${a.label.toLowerCase()} text at 12px or more.`, ...(a.textRef === undefined ? {} : { fix: [{ path: a.textRef, value: "12px" }] }) });
    if (INPUT_LIKE.has(a.component) && a.touchText !== undefined && a.touchText < 16)
      out.push({ key: `zoom|${key}`, rule: "zoom", guideline: "type-input-16", example: `${a.label} ${round(a.touchText)}px`, detail: (now) => `${a.label} text on touch screens ${is(now)} ${round(a.touchText!)}px, so iPhones will zoom in when it's focused.`, recommend: `Keep ${a.label.toLowerCase()} text at 16px on touch screens.`, ...(a.textRef === undefined ? {} : { fix: [{ path: a.textRef, value: "16px", mode: { touch: true } }] }) });
  }
  const grows = (list: number[]) => list.every((n, i) => i === 0 || n > list[i - 1]!);
  for (const component of new Set([...measured.values()].map((m) => m.component))) {
    const heights = SIZE_ORDER.flatMap((size) => {
      const h = measured.get(`${component}|${size}|root`)?.height;
      return h === undefined ? [] : [{ size, h }];
    });
    if (heights.length > 1 && !grows(heights.map((x) => x.h)))
      out.push({ key: `order|${component}`, rule: "order", guideline: "sizes-scale", example: componentName(component), detail: (now) => `${componentName(component)} sizes are out of order${now ? " now" : ""}: ${heights.map((x) => `${x.size} ${round(x.h)}px`).join(", ")}.`, recommend: `Put ${componentName(component).toLowerCase()} sizes back in order, each taller than the last.` });
  }
  for (const size of SIZE_ORDER) {
    const b = measured.get(`button|${size}|root`)?.height;
    const i = measured.get(`input|${size}|root`)?.height;
    if (b !== undefined && i !== undefined && b !== i)
      out.push({ key: `lineup|${size}`, rule: "lineup", guideline: "sizes-scale", example: `${size}: ${round(b)} and ${round(i)}px`, detail: (now) => `Buttons and inputs at ${size} ${now ? "no longer line up" : "don't line up"}: ${round(b)}px and ${round(i)}px, so a button beside a field in a form will look off.`, recommend: `Make ${size} buttons and inputs the same height.` });
  }

  // Good and bad news keep colors of their own, apart from danger's.
  const solid = (meaning: string) => value(flat, `intent.${meaning}.solid`) as { h?: number; c?: number } | undefined;
  const gap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  for (const meaning of ["danger", "warning", "success"]) {
    const c = solid(meaning)?.c;
    if (c !== undefined && c < 0.03)
      out.push({ key: `grey|${meaning}`, rule: `grey-${meaning}`, guideline: "color-palettes-earn-place", level: "must", example: meaning, detail: (now) => `${cap(meaning)} ${is(now)} grey, so its buttons and messages look like any other and stop reading as ${meaning === "success" ? "good" : "bad"} news.`, recommend: `Give ${meaning} a color of its own again, tuned to the brand.` });
  }
  const danger = solid("danger");
  for (const meaning of ["success", "warning"]) {
    const m = solid(meaning);
    if (danger?.h !== undefined && (danger.c ?? 0) >= 0.03 && m?.h !== undefined && (m.c ?? 0) >= 0.03 && gap(danger.h, m.h) < 40)
      out.push({ key: `close|${meaning}`, rule: `close-${meaning}`, guideline: "color-palettes-earn-place", level: "must", example: meaning, detail: (now) => `${cap(meaning)} ${is(now)} close to danger's color (${Math.round(gap(danger.h!, m.h!))}° apart), so a ${meaning === "success" ? "\"saved\"" : "warning"} message can read as an error.`, recommend: `Give ${meaning} its own ${meaning === "success" ? "muted green" : "amber"}, tuned to the brand.` });
  }

  // The type scale grows at every step.
  const steps = paths
    .filter((p) => /^font\.size\.\d+$/.test(p))
    .sort((x, y) => Number(x.split(".")[2]) - Number(y.split(".")[2]))
    .map((p) => px(value(flat, p)) ?? 0);
  if (!grows(steps)) out.push({ key: "type-scale", rule: "type-scale", guideline: "type-scale-ratio", example: "type scale", detail: (now) => `A step of the type scale ${is(now)} no larger than the one below it, so headings and text stop reading as a hierarchy.`, recommend: "Make every step of the type scale larger than the one below it." });

  // Page text on the page and on cards, in light and dark (the components' checks don't cover the
  // page itself).
  for (const scheme of ["light", "dark"] as const)
    for (const surface of ["surface.page", "surface.card"] as const)
      for (const text of ["intent.neutral.text-strong", "intent.neutral.text"] as const) {
        const mode = { ...DEFAULT_MODE, colorScheme: scheme };
        const fg = value(flat, text, mode) as ColorValue | undefined;
        const bg = value(flat, surface, mode) as ColorValue | undefined;
        const ratio = fg === undefined || bg === undefined ? undefined : contrastRatio(fg, bg);
        if (ratio !== undefined && ratio < 4.5) {
          const where = surface === "surface.page" ? "page" : "cards";
          out.push({ key: `page-text|${scheme}|${surface}|${text}`, rule: "page-text", guideline: "contrast-text", example: `${where} in ${scheme} ${ratio.toFixed(1)}:1`, detail: (now) => `Text on the ${where} in ${scheme} mode ${is(now)} ${ratio.toFixed(1)}:1, where 4.5:1 is needed.`, recommend: `Make text readable on the page and cards in ${scheme} mode: light text on dark surfaces, dark text on light ones.` });
        }
      }

  // Components' contrast, with the checker's own proven fixes.
  for (const c of checkContrast(includedComponents(system), flat, undefined, { fixes }).filter((c) => !c.passes && !c.exempt)) {
    const text = c.kind === "text";
    out.push({
      key: `contrast|${c.component}|${c.part}|${c.state}|${JSON.stringify(c.selection)}|${c.colorScheme}|${c.kind}`,
      rule: text ? "contrast-text" : "contrast-ui",
      guideline: text ? "contrast-text" : "contrast-ui",
      example: `${c.component} ${c.part}${c.state === undefined ? "" : ` (${c.state})`} in ${c.colorScheme} ${c.ratio.toFixed(2)}:1`,
      detail: (now) => `${c.component} ${c.part}${c.state === undefined ? "" : ` (${c.state})`} in ${c.colorScheme} ${is(now)} ${c.ratio.toFixed(2)}:1 where ${c.required}:1 is needed.`,
      recommend: "Fix the contrast failures, keeping the look as close as you can.",
      ...(c.fix === undefined ? {} : { fix: [{ path: c.fix.token, value: c.fix.value }] }),
    });
  }
  return out;
}
const cap = (w: string) => `${w[0]!.toUpperCase()}${w.slice(1)}`;

// A guideline finding, for people: the note, and a fix when it's mechanical (token.set operations).
export type StandingFinding = GuidelineNote & { rule: string; count: number; fix?: FixOp[] };

// Everything a system does against the measurable guidelines as it stands, one row per rule (a
// count and examples, and the fixes together), standards first.
export function standingFindings(system: DesignSystem): StandingFinding[] {
  const kept = new Set(keptRules(system));
  const all = findings(system, flattenTokens(system.tokens), true).filter((f) => !kept.has(f.rule));
  const known = new Set(all.map((f) => f.key));
  // A fix is offered only when it settles its row without making anything else fail (raising a
  // step of the shared type scale for one component's small text would flatten the scale).
  const safe = (fix: FixOp[]) => {
    const tried = applyChangeset(system, { ops: fix.map((f) => ({ op: "token.set", input: { path: f.path, value: f.value, ...(f.mode === undefined ? {} : { mode: f.mode }) } })) });
    return tried.ok && findings(tried.system, flattenTokens(tried.system.tokens)).every((f) => known.has(f.key));
  };
  const byRule = new Map<string, Finding[]>();
  for (const f of all) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  const rows: StandingFinding[] = [];
  for (const group of byRule.values()) {
    const first = group[0]!;
    const reason = REASON[first.rule];
    const detail =
      group.length === 1 || reason === undefined
        ? first.detail(false)
        : `${group.length} places (${group
            .slice(0, 3)
            .map((f) => f.example)
            .join(", ")}${group.length > 3 ? ", …" : ""}): ${reason}.`;
    // A fix for the row only when every finding in it has one; shared tokens are set once.
    const fixable = group.every((f) => f.fix !== undefined);
    const unique = [...new Map(group.flatMap((f) => f.fix ?? []).map((f) => [`${f.path}|${JSON.stringify(f.mode ?? null)}`, f])).values()];
    rows.push({ ...note(first.guideline, detail, first.recommend, first.level), rule: first.rule, count: group.length, ...(fixable && unique.length > 0 && safe(unique) ? { fix: unique } : {}) });
  }
  return rows.sort((x, y) => (x.level === y.level ? y.count - x.count : x.level === "must" ? -1 : 1));
}

export function reviewChange(before: DesignSystem, after: DesignSystem): GuidelineNote[] {
  const was = flattenTokens(before.tokens);
  const now = flattenTokens(after.tokens);
  const known = new Set(findings(before, was).map((f) => f.key));
  const kept = new Set(keptRules(after));
  const introduced = findings(after, now).filter((f) => !known.has(f.key) && !kept.has(f.rule));
  const notes: GuidelineNote[] = [];
  // Contrast is summed up, with one example.
  const contrast = introduced.filter((f) => f.rule === "contrast-text" || f.rule === "contrast-ui");
  for (const f of introduced) {
    if (f.rule === "contrast-text" || f.rule === "contrast-ui") continue;
    notes.push({ ...note(f.guideline, f.detail(true), f.recommend, f.level), rule: f.rule });
  }
  if (contrast.length > 0) {
    const first = contrast[0]!;
    notes.push(note(first.guideline, `${contrast.length === 1 ? "One pair" : `${contrast.length} pairs`} now fail${contrast.length === 1 ? "s" : ""} contrast, for example ${first.example} where more is needed.`, "Fix the contrast failures this change introduced, keeping the look as close as you can."));
  }

  // A new brand with the stock status palettes left as they were: they're tesserai's defaults, not
  // the look's. Said once, naming them, with the way to settle it.
  const seed = (system: DesignSystem, name: string) => JSON.stringify((system.generators[name]?.config as { seed?: unknown } | undefined)?.seed);
  const configOf = (system: DesignSystem, name: string) => JSON.stringify(system.generators[name]?.config);
  if (!kept.has("stock") && after.generators["brand"] !== undefined && seed(before, "brand") !== seed(after, "brand")) {
    const stock = ["green", "blue", "amber"].filter((p) => after.generators[p] !== undefined && before.generators[p] !== undefined && configOf(before, p) === configOf(after, p) && seed(after, p) === seed(PRESET_STATUS, p));
    if (stock.length > 0) {
      notes.push({ ...note("color-palettes-earn-place", `The brand changed but ${stock.join(", ")} ${stock.length === 1 ? "is" : "are"} still tesserai's stock ${stock.length === 1 ? "color" : "colors"}, which can look pasted in beside it.`, "Remove the status palettes this look doesn't use (moving their meanings to the brand) and tune the rest to the brand."), rule: "stock" });
    }
  }

  // One note per guideline, the standards first.
  const seen = new Set<string>();
  return notes
    .filter((n) => (seen.has(n.guideline) ? false : (seen.add(n.guideline), true)))
    .sort((x, y) => (x.level === y.level ? 0 : x.level === "must" ? -1 : 1))
    .slice(0, MAX_NOTES);
}
