import { defaultIntentFor, type Anatomy, type Base } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { cvaSource, q, unionType } from "./codegen";
import { factorClasses, type CvaConfig } from "./factor";
import { LABEL_TRUNCATES, TEXT_IN_SPAN } from "./label";

// A badge keeps its size in a row (shrink-0) but never outgrows its container: a label too long
// for it ends in an ellipsis (see label.ts).
const ROOT_BASE = ["inline-flex", "w-fit", "shrink-0", "max-w-full", "items-center", "justify-center", "gap-1", "overflow-hidden", "whitespace-nowrap", ...LABEL_TRUNCATES, "leading-none", "outline-none", "[&>svg]:pointer-events-none", "[&>svg]:size-[1em]"];

// A badge is static unless it is rendered as a link, so hover only applies to links, as in shadcn.
const BADGE_STATES: StatePrefixes = { ...NATIVE_STATES, hover: ["[a&]:hover:"] };

// How each library lets a badge render as something else: Base UI's render prop, Radix's asChild,
// or a render function (shadcn's React Aria badge).
const ELEMENT: Record<Base, { imports: string; props: string; destructure: string; body: (attrs: string, className: string) => string }> = {
  "base-ui": {
    imports: `import { mergeProps } from "@base-ui/react/merge-props";\nimport { useRender } from "@base-ui/react/use-render";`,
    props: `useRender.ComponentProps<"span">`,
    destructure: "render, ",
    body: (attrs, className) => `return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">({ className: ${className}, children: label(children) }, props),
    render,
    // Base UI writes state out as data attributes: data-slot, data-variant and so on.
    state: { slot: "badge", variant: axes.variant, intent: axes.intent, size },
  });`,
  },
  radix: {
    imports: `import { Slot } from "radix-ui";`,
    props: `React.ComponentProps<"span"> & { asChild?: boolean }`,
    destructure: "asChild = false, ",
    body: (attrs, className) => `const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp className={${className}} {...{ ${attrs} }} {...props}>
      {label(children)}
    </Comp>
  );`,
  },
  "react-aria": {
    imports: "",
    props: `React.HTMLAttributes<HTMLSpanElement> & { render?: (props: React.HTMLAttributes<HTMLSpanElement>) => React.ReactNode }`,
    destructure: "render, ",
    body: (attrs, className) => `const merged = { className: ${className}, ${attrs}, ...props, children: label(children) };
  return render ? render(merged) : <span {...merged} />;`,
  },
};

// Variant names follow the system; shadcn's names (default, secondary, destructive, outline, ghost,
// link) keep working as aliases for a variant and intent.
const ALIASES: Record<string, { variant: string; intent: string }> = {
  default: { variant: "solid", intent: "primary" },
  secondary: { variant: "soft", intent: "neutral" },
  destructive: { variant: "solid", intent: "danger" },
};

export type BadgePieces = {
  slots: { badge: CvaConfig };
  variants: string[];
  intents: string[];
  sizes: string[];
  defaultVariant: string;
  defaultSize: string;
  // shadcn names the system doesn't use itself, and the variant + intent pair each stands for.
  aliases: [string, { variant: string; intent: string }][];
  // The intent a variant takes when none is given.
  defaultIntent: Record<string, string>;
};

// Badge's classes and axes, which every framework's shell prints from.
export function badgePieces(anatomy: Anatomy, states: StatePrefixes = BADGE_STATES): BadgePieces {
  const variants = anatomy.axes.variant?.enabled ?? [];
  const intents = anatomy.axes.intent?.enabled ?? [];
  const aliases = Object.entries(ALIASES).filter(([name, a]) => !variants.includes(name) && variants.includes(a.variant) && intents.includes(a.intent));
  return {
    slots: { badge: factorClasses(anatomy, "root", { states, label: true }, ROOT_BASE) },
    variants: [...variants],
    intents: [...intents],
    sizes: [...(anatomy.axes.size?.enabled ?? [])],
    defaultVariant: anatomy.axes.variant?.default ?? "soft",
    defaultSize: anatomy.axes.size?.default ?? "md",
    aliases: aliases.map(([name, a]) => [name, { variant: a.variant, intent: a.intent }]),
    defaultIntent: Object.fromEntries(variants.map((v) => [v, defaultIntentFor(v, anatomy.axes.intent?.default ?? intents[0] ?? "neutral")])),
  };
}

export function badgeTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots, variants, intents, sizes, defaultVariant, defaultSize, aliases, defaultIntent } = badgePieces(anatomy);
    const el = ELEMENT[base];
    const attrs = `"data-slot": "badge", "data-variant": axes.variant, "data-intent": axes.intent, "data-size": size`;
    return `import * as React from "react";
${el.imports}
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("badgeVariants", slots.badge)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};

const aliases = {
${aliases.map(([name, a]) => `${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} }`).join(",\n")}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

// A variant chosen without an intent takes the intent shadcn gives that variant.
const defaultIntent: Record<Variant, Intent> = {
${variants.map((v) => `${q(v)}: ${q(defaultIntent[v]!)}`).join(",\n")}
};

export type BadgeProps = ${el.props} & {
  variant?: Variant | Alias | undefined;
  intent?: Intent | undefined;
  size?: ${unionType(sizes)} | undefined;
};

function resolveAxes(variant: Variant | Alias, intent: Intent | undefined) {
  if (variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: variant as Variant, intent: intent ?? defaultIntent[variant as Variant] };
}

${TEXT_IN_SPAN}

function Badge({
  className,
  variant = ${q(defaultVariant)},
  intent,
  size = ${q(defaultSize)},
  ${el.destructure}children,
  ...props
}: BadgeProps) {
  const axes = resolveAxes(variant, intent);
  ${el.body(attrs, "cn(badgeVariants({ ...axes, size }), className)")}
}

export { Badge, badgeVariants };
export type BadgeVariants = VariantProps<typeof badgeVariants>;
`;
  };
}
