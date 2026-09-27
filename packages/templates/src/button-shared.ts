import { SHADCN_VARIANT_ALIASES, type Anatomy } from "@tesserai/core";
import type { StatePrefixes } from "./classes";
import { cvaSource, q, unionType } from "./codegen";
import { factorClasses, flatOnly, type CvaConfig } from "./factor";
import { LABEL_TRUNCATES, SHRINKS, TEXT_IN_SPAN } from "./label";

const ROOT_BASE = [
  "inline-flex",
  "items-center",
  "justify-center",
  "whitespace-nowrap",
  ...SHRINKS,
  ...LABEL_TRUNCATES,
  "select-none",
  "outline-none",
  "transition-[color,background-color,border-color,box-shadow,opacity]",
  "[&_svg]:pointer-events-none",
  "[&_svg]:shrink-0",
];

// What differs between the libraries: the element, its props, and how className composes.
export type ButtonFlavor = {
  states: StatePrefixes;
  imports: string;
  // Props type of the element, without variant props.
  props: string;
  // Extra destructured props and the lines before the return.
  destructure?: string;
  prelude?: string;
  element: string;
  // Wraps the class expression; React Aria's className may be a function of render state.
  className: (expr: string) => string;
  // Anything after Button, e.g. React Aria's LinkButton, and extra exports.
  extra?: string;
  exports?: string[];
};

// Everything about Button that isn't a framework's: its classes as a cva config (the root, with the
// icon's size classes riding along), its axes and defaults, the shadcn aliases, and the square icon
// sizes. React, Vue and Svelte shells all print from this, so a style change lands in each at once.
export type ButtonPieces = {
  root: CvaConfig;
  variants: string[];
  intents: string[];
  sizes: string[];
  defaultVariant: string;
  defaultSize: string;
  // shadcn variant names and the variant + intent pair each stands for.
  aliases: [string, { variant: string; intent: string }][];
  // The intent a variant takes when none is given: shadcn's for that variant.
  defaultIntent: Record<string, string>;
  // "icon" and "icon-<size>" to the height they're square at.
  iconSizes: [string, string][];
};

export function buttonPieces(anatomy: Anatomy, states: StatePrefixes): ButtonPieces {
  const root = factorClasses(anatomy, "root", { states, label: true }, ROOT_BASE);
  const icon = factorClasses(anatomy, "icon", { states, prefix: "[&_svg]:" });
  // Icon styling rides along on the root element: it may vary by size only.
  const { size: iconSizes, ...otherIconAxes } = icon.variants;
  flatOnly({ ...icon, variants: otherIconAxes }, anatomy.name, "icon");
  for (const [size, classes] of Object.entries(iconSizes ?? {})) {
    root.variants.size ??= {};
    root.variants.size[size] = [...(root.variants.size[size] ?? []), ...classes];
  }
  root.base.push(...icon.base);

  const variants = anatomy.axes.variant?.enabled ?? [];
  const intents = anatomy.axes.intent?.enabled ?? [];
  const sizes = anatomy.axes.size?.enabled ?? [];
  const defaultSize = anatomy.axes.size?.default ?? sizes[0] ?? "md";
  const aliases = Object.entries(SHADCN_VARIANT_ALIASES).filter(([, a]) => variants.includes(a.variant) && intents.includes(a.intent));
  return {
    root,
    variants: [...variants],
    intents: [...intents],
    sizes: [...sizes],
    defaultVariant: anatomy.axes.variant?.default ?? variants[0] ?? "solid",
    defaultSize,
    aliases: aliases.map(([name, a]) => [name, { variant: a.variant, intent: a.intent }]),
    defaultIntent: Object.fromEntries(variants.map((v) => [v, aliases.find(([, a]) => a.variant === v)?.[1].intent ?? anatomy.axes.intent?.default ?? intents[0] ?? "primary"])),
    iconSizes: [["icon", defaultSize], ...sizes.map((s): [string, string] => [`icon-${s}`, s])],
  };
}

// Button, following shadcn's API on every library: variant names (default, destructive, secondary,
// outline, ghost, link), size default / xs / sm / lg and the square icon sizes, and buttonVariants
// that accepts the same names for styling links as buttons.
export function buttonSource(anatomy: Anatomy, flavor: ButtonFlavor): string {
  const { root, variants, intents, sizes, defaultVariant, defaultSize, aliases, defaultIntent, iconSizes } = buttonPieces(anatomy, flavor.states);
  const aliasEntries = aliases.map(([name, a]) => `${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} }`).join(",\n");
  const iconEntries = iconSizes.map(([name, size]) => `${q(name)}: ${q(size)}`).join(", ");

  return `import * as React from "react";
${flavor.imports}
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("variantClasses", root)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};
type Size = ${unionType(sizes)};

// shadcn variant names keep working; they map to a variant + intent pair.
const aliases = {
${aliasEntries}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

// A variant chosen without an intent takes the intent shadcn gives that variant.
const defaultIntent: Record<Variant, Intent> = {
${variants.map((v) => `${q(v)}: ${q(defaultIntent[v]!)}`).join(",\n")}
};

// Icon-only buttons are the same heights made square; "icon" is the default height. Having no
// label to shorten, they don't shrink.
const iconSizes = { ${iconEntries} } as const satisfies Record<string, Size>;
type SizeName = Size | "default" | keyof typeof iconSizes;

export type ButtonVariantProps = {
  variant?: Variant | Alias | undefined;
  intent?: Intent | undefined;
  size?: SizeName | undefined;
};

function isAlias(value: Variant | Alias): value is Alias {
  return value in aliases;
}

function resolveAxes({ variant, intent, size }: ButtonVariantProps) {
  const s = size === undefined || size === "default" ? ${q(defaultSize)} : size;
  const square = s in iconSizes;
  const height: Size = square ? iconSizes[s as keyof typeof iconSizes] : (s as Size);
  if (variant !== undefined && isAlias(variant)) {
    const alias = aliases[variant];
    return { variant: alias.variant, intent: intent ?? alias.intent, size: height, square };
  }
  const v: Variant = variant ?? ${q(defaultVariant)};
  return { variant: v, intent: intent ?? defaultIntent[v], size: height, square };
}

// Classes for anything that should look like a button, such as a link.
function buttonVariants({ className, ...props }: ButtonVariantProps & { className?: string | undefined } = {}) {
  const { square, ...axes } = resolveAxes(props);
  return cn(variantClasses(axes), square && "aspect-square shrink-0 px-0", className);
}

export type ButtonProps = ${flavor.props} & ButtonVariantProps;

${TEXT_IN_SPAN}

function Button({ className, variant, intent, size = "default", ${flavor.destructure ?? ""}children, ...props }: ButtonProps) {
  const axes = resolveAxes({ variant, intent, size });${flavor.prelude ?? ""}
  return (
    <${flavor.element}
      data-slot="button"
      data-variant={axes.variant}
      data-intent={axes.intent}
      data-size={size === "default" ? axes.size : size}
      className={${flavor.className("buttonVariants({ variant, intent, size, className })")}}
      {...props}
    >
      {label(children)}
    </${flavor.element}>
  );
}
${flavor.extra ?? ""}
export { ${["Button", ...(flavor.exports ?? []), "buttonVariants"].join(", ")} };
`;
}
