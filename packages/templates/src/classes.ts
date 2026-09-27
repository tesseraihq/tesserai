import { z } from "zod";
import {
  ComponentState,
  cssVarName,
  ENUM_PROPS,
  isEnumProp,
  refPath,
  StyleProps,
  type EnumProp,
  type ResolvedPart,
} from "@tesserai/core";

// Typed key lists from the schemas, so iteration needs no casts.
const PROP_KEYS = StyleProps.keyof().options;
const STATE_KEYS = ComponentState.options;

// Class prefixes per abstract state. Native elements expose pseudo-classes; Base UI parts expose
// data attributes. A template picks the map that matches what the part renders.
export type StatePrefixes = Record<ComponentState, string[]>;
const StatePrefixesSchema = z.record(ComponentState, z.array(z.string()));

// Builds a complete prefix map from a function of the state, checked to cover every state.
export function mapStates(f: (state: ComponentState) => string[]): StatePrefixes {
  return StatePrefixesSchema.parse(Object.fromEntries(STATE_KEYS.map((state) => [state, f(state)])));
}

// Orientation is read from data-orientation on every library (the presentational templates set it).
const ORIENTATION = { horizontal: ["data-[orientation=horizontal]:"], vertical: ["data-[orientation=vertical]:"] };

export const NATIVE_STATES: StatePrefixes = {
  hover: ["hover:"],
  "focus-visible": ["focus-visible:"],
  pressed: ["active:"],
  disabled: ["disabled:"],
  invalid: ["aria-invalid:"],
  selected: ["aria-selected:"],
  highlighted: ["data-highlighted:"],
  "read-only": ["read-only:"],
  loading: ["data-loading:"],
  open: ["aria-expanded:"],
  indeterminate: ["indeterminate:"],
  current: ["aria-[current=page]:"],
  dragging: ["active:"],
  placeholder: ["placeholder-shown:"],
  ...ORIENTATION,
};

export const BASE_UI_STATES: StatePrefixes = {
  hover: ["hover:"],
  "focus-visible": ["focus-visible:"],
  pressed: ["active:"],
  disabled: ["data-disabled:"],
  invalid: ["data-invalid:"],
  selected: ["data-checked:"],
  highlighted: ["data-highlighted:"],
  "read-only": ["data-readonly:"],
  loading: ["data-loading:"],
  // Popups and panels say data-open; a template overrides this for triggers (data-popup-open).
  open: ["data-open:"],
  indeterminate: ["data-indeterminate:"],
  current: ["aria-[current=page]:"],
  dragging: ["data-dragging:"],
  placeholder: ["data-placeholder:"],
  ...ORIENTATION,
};

type Prop = (typeof PROP_KEYS)[number];

// Returns the key inside a Tailwind theme namespace when the variable lives there, e.g.
// ("--color-primary-solid", "color") -> "primary-solid".
function themed(name: string, namespace: string): string | undefined {
  const prefix = `--${namespace}-`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : undefined;
}

function colorUtility(util: string, name: string): string {
  const key = themed(name, "color");
  return key === undefined ? `${util}-(color:${name})` : `${util}-${key}`;
}

const ENUM_UTILITIES: { [P in EnumProp]: Record<(typeof ENUM_PROPS)[P][number], string> } = {
  textDecoration: { none: "no-underline", underline: "underline" },
  cursor: { default: "cursor-default", pointer: "cursor-pointer", "not-allowed": "cursor-not-allowed", text: "cursor-text" },
  textTransform: { none: "normal-case", uppercase: "uppercase", lowercase: "lowercase", capitalize: "capitalize" },
  fontStyle: { normal: "not-italic", italic: "italic" },
  textAlign: { start: "text-start", center: "text-center", end: "text-end" },
  textOverflow: { wrap: "whitespace-normal", truncate: "truncate", "clamp-2": "line-clamp-2", "clamp-3": "line-clamp-3" },
  borderStyle: { solid: "border-solid", dashed: "border-dashed", dotted: "border-dotted", none: "border-none" },
  objectFit: { cover: "object-cover", contain: "object-contain", fill: "object-fill" },
  animation: { none: "animate-none", pulse: "animate-pulse", spin: "animate-spin" },
};

function enumUtility<P extends EnumProp>(prop: P, value: string): string {
  const table: Record<string, string> = ENUM_UTILITIES[prop];
  const util = table[value];
  if (util === undefined) throw new Error(`${prop} has no value "${value}"`);
  return util;
}

// One Tailwind v4 utility per style property. Theme namespaces give short classes (bg-primary-solid);
// everything else references the variable directly (h-(--button-height-md)).
export function utilityFor(prop: Prop, value: string, borderSides: "all" | "bottom" = "all"): string {
  if (isEnumProp(prop)) return enumUtility(prop, value);
  const name = cssVarName(refPath(value));
  const borderUtil = borderSides === "bottom" ? "border-b" : "border";
  switch (prop) {
    case "background":
      return colorUtility("bg", name);
    case "foreground":
      return colorUtility("text", name);
    case "border":
      return colorUtility(borderUtil, name);
    case "ring":
      return colorUtility("ring", name);
    case "borderWidth":
      return `${borderUtil}-(length:${name})`;
    case "ringWidth":
      return `ring-(length:${name})`;
    case "ringOffset":
      return `ring-offset-(length:${name})`;
    case "ringOffsetColor":
      return colorUtility("ring-offset", name);
    case "shadow": {
      const key = themed(name, "shadow");
      return key === undefined ? `shadow-(${name})` : `shadow-${key}`;
    }
    case "radius": {
      const key = themed(name, "radius");
      return key === undefined ? `rounded-(${name})` : `rounded-${key}`;
    }
    case "fontSize": {
      const key = themed(name, "text");
      return key === undefined ? `text-(length:${name})` : `text-${key}`;
    }
    case "fontWeight": {
      const key = themed(name, "font-weight");
      return key === undefined ? `font-(${name})` : `font-${key}`;
    }
    case "fontFamily": {
      const key = themed(name, "font");
      return key === undefined ? `font-(family-name:${name})` : `font-${key}`;
    }
    case "easing": {
      const key = themed(name, "ease");
      return key === undefined ? `ease-(${name})` : `ease-${key}`;
    }
    case "lineHeight":
      return `leading-(${name})`;
    case "opacity":
      return `opacity-(${name})`;
    case "duration":
      return `duration-(${name})`;
    case "padding":
      return `p-(${name})`;
    case "paddingX":
      return `px-(${name})`;
    case "paddingY":
      return `py-(${name})`;
    case "gap":
      return `gap-(${name})`;
    case "height":
      return `h-(${name})`;
    case "width":
      return `w-(${name})`;
    case "minWidth":
      return `min-w-(${name})`;
    case "maxWidth":
      return `max-w-(${name})`;
    case "size":
      return `size-(${name})`;
    case "minHeight":
      return `min-h-(${name})`;
    case "maxHeight":
      return `max-h-(${name})`;
    case "aspectRatio":
      return `aspect-(${name})`;
    case "letterSpacing":
      return `tracking-(${name})`;
    case "scale":
      return `scale-(${name})`;
    case "backdropBlur":
      return `backdrop-blur-(${name})`;
  }
}

export type PartOptions = {
  states: StatePrefixes;
  // Prefix applied to every class, for parts styled through their parent: "[&_svg]:" or "placeholder:".
  prefix?: string;
  // Which edges a border applies to; the recipe's border and borderWidth then target only those.
  borderSides?: "all" | "bottom";
  // The part is a single-line control whose text sits in a label span (Button, Toggle, a tab, Badge,
  // a date picker's trigger; see label.ts). Its textOverflow styles that span, since a flex box's
  // own text can't end in an ellipsis. A label let wrap or clamp grows the control, so the part's
  // height becomes its minimum; `height` is the variable to keep as the minimum where the part sets
  // no height of its own (a date picker's trigger is a Button, whose height is the Button's).
  label?: true | { height: string };
};

// textOverflow on a control's label span. Wrapping undoes the span's nowrap, and breaks a word
// longer than the control.
const LABEL_OVERFLOW: Record<(typeof ENUM_PROPS)["textOverflow"][number], string[]> = {
  truncate: ["[&>span]:truncate"],
  wrap: ["[&>span]:whitespace-normal", "[&>span]:wrap-break-word"],
  "clamp-2": ["[&>span]:line-clamp-2", "[&>span]:whitespace-normal", "[&>span]:wrap-break-word"],
  "clamp-3": ["[&>span]:line-clamp-3", "[&>span]:whitespace-normal", "[&>span]:wrap-break-word"],
};

function propsToClasses(props: StyleProps, prefix: string, borderSides: "all" | "bottom", label?: PartOptions["label"]): string[] {
  const out: string[] = [];
  // A label on more than one line: the control grows from its height, with a little room above and below.
  const grows = label !== undefined && props.textOverflow !== undefined && props.textOverflow !== "truncate";
  for (const prop of PROP_KEYS) {
    const value = props[prop];
    if (value === undefined) continue;
    if (label !== undefined && prop === "textOverflow") out.push(...LABEL_OVERFLOW[value as keyof typeof LABEL_OVERFLOW].map((c) => prefix + c));
    else if (grows && prop === "height") out.push(`${prefix}min-h-(${cssVarName(refPath(value))})`);
    else out.push(prefix + utilityFor(prop, value, borderSides));
  }
  if (grows) {
    if (props.height === undefined && typeof label === "object") out.push(`${prefix}h-auto`, `${prefix}min-h-(${label.height})`);
    if (props.padding === undefined && props.paddingY === undefined) out.push(`${prefix}py-1`);
  }
  return out;
}

export function partClasses(part: ResolvedPart, options: PartOptions): string[] {
  const prefix = options.prefix ?? "";
  const sides = options.borderSides ?? "all";
  const out = propsToClasses(part.base, prefix, sides, options.label);
  for (const state of STATE_KEYS) {
    const props = part.states[state];
    if (props === undefined) continue;
    for (const statePrefix of options.states[state]) {
      out.push(...propsToClasses(props, prefix + statePrefix, sides, options.label));
    }
  }
  return out;
}
