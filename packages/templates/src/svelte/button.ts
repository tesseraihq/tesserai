import type { Anatomy } from "@tesserai/core";
import { buttonPieces } from "../button-shared";
import { NATIVE_STATES } from "../classes";
import { cvaSource, q, unionType } from "../codegen";
import type { GeneratedFile } from "../render";
import { UTILS_IMPORT } from "./emit";

const indent = (text: string, by = "  ") => text.replace(/^(?=.)/gm, by);

// Button in shadcn-svelte's shape (a native button, or a link when given href; class, a bindable
// ref and children as a snippet) with tesserai's design API, printed from the same pieces as React's:
// variant, intent and size, shadcn's variant names as aliases, the square icon sizes, the data-*
// attributes, and buttonVariants for anything else that should look like a button. It's a native
// element, so its states are the native pseudo-classes, as on every React library.
export function buttonFiles(anatomy: Anatomy): GeneratedFile[] {
  const { root, variants, intents, sizes, defaultVariant, defaultSize, aliases, defaultIntent, iconSizes } = buttonPieces(anatomy, NATIVE_STATES);
  const aliasEntries = aliases.map(([name, a]) => `${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} },`).join("\n");
  const iconEntries = iconSizes.map(([name, size]) => `${q(name)}: ${q(size)}`).join(", ");

  const module = `import { cva } from "class-variance-authority";
import type { ClassValue, HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}

${cvaSource("variantClasses", root)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};
type Size = ${unionType(sizes)};

// shadcn variant names keep working; they map to a variant + intent pair.
const aliases = {
${indent(aliasEntries)}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

// A variant chosen without an intent takes the intent shadcn gives that variant.
const defaultIntent: Record<Variant, Intent> = {
${indent(variants.map((v) => `${q(v)}: ${q(defaultIntent[v]!)},`).join("\n"))}
};

// Icon-only buttons are the same heights made square; "icon" is the default height.
const iconSizes = { ${iconEntries} } as const satisfies Record<string, Size>;

export type ButtonVariant = Variant | Alias;
export type ButtonIntent = Intent;
export type ButtonSize = Size | "default" | keyof typeof iconSizes;

export type ButtonVariantProps = {
  variant?: ButtonVariant | undefined;
  intent?: ButtonIntent | undefined;
  size?: ButtonSize | undefined;
};

function isAlias(value: ButtonVariant): value is Alias {
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
export function buttonVariants({ class: className, ...props }: ButtonVariantProps & { class?: ClassValue | null | undefined } = {}) {
  const { square, ...axes } = resolveAxes(props);
  return cn(variantClasses(axes), square && "aspect-square shrink-0 px-0", className);
}

export type ButtonProps = WithElementRef<HTMLButtonAttributes> & WithElementRef<HTMLAnchorAttributes> & ButtonVariantProps;`;

  const button = `<script lang="ts" module>
${indent(module)}
</script>

<script lang="ts">
  let {
    class: className,
    variant,
    intent,
    size = "default",
    ref = $bindable(null),
    href = undefined,
    type = "button",
    disabled,
    children,
    ...restProps
  }: ButtonProps = $props();

  const axes = $derived(resolveAxes({ variant, intent, size }));
  const classes = $derived(buttonVariants({ variant, intent, size, class: className }));
</script>

{#if href}
  <a
    bind:this={ref}
    data-slot="button"
    data-variant={axes.variant}
    data-intent={axes.intent}
    data-size={size === "default" ? axes.size : size}
    class={classes}
    href={disabled ? undefined : href}
    aria-disabled={disabled}
    role={disabled ? "link" : undefined}
    tabindex={disabled ? -1 : undefined}
    {...restProps}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    bind:this={ref}
    data-slot="button"
    data-variant={axes.variant}
    data-intent={axes.intent}
    data-size={size === "default" ? axes.size : size}
    class={classes}
    {type}
    {disabled}
    {...restProps}
  >
    {@render children?.()}
  </button>
{/if}
`;

  const types = ["ButtonProps", "ButtonVariantProps", "ButtonVariant", "ButtonIntent", "ButtonSize"];
  const index = `import Root, { buttonVariants, ${types.map((t) => `type ${t}`).join(", ")} } from "./button.svelte";

export {
  Root,
  type ButtonProps as Props,
  //
  Root as Button,
  buttonVariants,
${types.map((t) => `  type ${t},`).join("\n")}
};
`;
  return [
    { path: "button/button.svelte", source: button },
    { path: "button/index.ts", source: index },
  ];
}
