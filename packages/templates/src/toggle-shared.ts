import { cssVarName, type Anatomy } from "@tesserai/core";
import { type StatePrefixes } from "./classes";
import { classString, cvaSource, q, unionType } from "./codegen";
import { factorClasses, flatOnly } from "./factor";
import { LABEL_TRUNCATES, SHRINKS, TEXT_IN_SPAN } from "./label";

const ROOT_BASE = [
  "inline-flex",
  "items-center",
  "justify-center",
  "whitespace-nowrap",
  ...SHRINKS,
  ...LABEL_TRUNCATES,
  "outline-none",
  "transition-[color,background-color,border-color,box-shadow,opacity]",
  "[&_svg]:pointer-events-none",
  "[&_svg]:shrink-0",
];

// Toggle's classes and axes, which every framework's shell prints from. Icon styling rides on the
// root through [&_svg], as on Button. Radix marks a pressed toggle data-state=on.
export function togglePieces(anatomy: Anatomy, states: StatePrefixes) {
  const root = factorClasses(anatomy, "root", { states, label: true }, ROOT_BASE);
  const icon = factorClasses(anatomy, "icon", { states, prefix: "[&_svg]:" });
  root.base.push(...flatOnly(icon, anatomy.name, "icon"));
  const variants = anatomy.axes.variant?.enabled ?? [];
  const defaultVariant = anatomy.axes.variant?.default ?? variants[0] ?? "ghost";
  return {
    slots: { toggle: root },
    variants: [...variants],
    sizes: [...(anatomy.axes.size?.enabled ?? [])],
    defaultVariant,
    defaultSize: anatomy.axes.size?.default ?? "md",
    // shadcn's `default` toggle is the transparent one: ghost when it is enabled, else the default.
    aliases: { default: variants.includes("ghost") ? "ghost" : defaultVariant },
  };
}

// The toggle's cva and its alias handling, shared by every library's Toggle.
export function toggleSource(anatomy: Anatomy, states: StatePrefixes): string {
  const { slots, variants, sizes, defaultVariant: def, aliases } = togglePieces(anatomy, states);
  const alias = aliases.default;
  return `${cvaSource("toggleVariants", slots.toggle)}

export type ToggleVariant = ${unionType(variants)};
export type ToggleSize = ${unionType(sizes)};

// shadcn calls the transparent toggle "default"; it maps to ${q(alias)} here.
function toggleVariant(variant: ToggleVariant | "default" | undefined): ToggleVariant {
  return variant === undefined ? ${q(def)} : variant === "default" ? ${q(alias)} : variant;
}

${TEXT_IN_SPAN}`;
}

export const toggleSizeDefault = (anatomy: Anatomy) => q(anatomy.axes.size?.default ?? "md");

// Classes a Toggle Group item adds on top of the Toggle's: when the group is joined (spacing 0)
// items lose their inner corners and, for outline, share borders.
function joinedItem(): string[] {
  const radius = cssVarName("toggle.radius");
  const width = cssVarName("border.width");
  const g = "group-data-[spacing=0]/toggle-group";
  const h = "group-data-[orientation=horizontal]/toggle-group";
  const v = "group-data-[orientation=vertical]/toggle-group";
  return [
    "shrink-0",
    "focus:z-10",
    "focus-visible:z-10",
    `${g}:rounded-none`,
    `${g}:${h}:first:rounded-s-(${radius})`,
    `${g}:${h}:last:rounded-e-(${radius})`,
    `${g}:${v}:first:rounded-t-(${radius})`,
    `${g}:${v}:last:rounded-b-(${radius})`,
    `${g}:${h}:data-[variant=outline]:border-s-0`,
    `${g}:${h}:data-[variant=outline]:first:border-s-(length:${width})`,
    `${g}:${v}:data-[variant=outline]:border-t-0`,
    `${g}:${v}:data-[variant=outline]:first:border-t-(length:${width})`,
  ];
}

export function joinedItemClasses(): string {
  return classString(joinedItem());
}

// Toggle Group's classes, which every framework's shell prints from. An item is the Toggle's cva
// (toggleVariants, imported from the toggle component) plus these classes; the item reads the
// group's data-spacing and data-orientation, and its own data-variant.
export function toggleGroupPieces(anatomy: Anatomy, states: StatePrefixes) {
  const group = flatOnly(factorClasses(anatomy, "group", { states }), anatomy.name, "group");
  return {
    slots: {
      "toggle-group": [
        "group/toggle-group",
        "flex",
        "w-fit",
        "flex-row",
        "items-center",
        "data-[orientation=vertical]:flex-col",
        "data-[orientation=vertical]:items-stretch",
        ...group,
        "data-[spacing=0]:gap-0",
      ],
      "toggle-group-item": joinedItem(),
    },
  };
}

export function groupClasses(anatomy: Anatomy, states: StatePrefixes): string {
  return classString(toggleGroupPieces(anatomy, states).slots["toggle-group"]);
}

// The group's shared settings, and the inline gap for an explicit spacing (in Tailwind spacing units).
export const GROUP_CONTEXT = `type GroupSettings = { variant?: ToggleVariant | "default" | undefined; size?: ToggleSize | undefined; spacing?: number | undefined };

const ToggleGroupContext = React.createContext<GroupSettings>({});

function spacingStyle(spacing: number | undefined, style: React.CSSProperties | undefined): React.CSSProperties | undefined {
  if (spacing === undefined || spacing === 0) return style;
  return { ...style, gap: \`calc(var(--spacing) * \${spacing})\` };
}`;
