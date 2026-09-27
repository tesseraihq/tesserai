import type { Anatomy } from "@tesserai/core";
import { buttonPieces } from "../button-shared";
import { NATIVE_STATES } from "../classes";
import { cvaSource, q, unionType } from "../codegen";
import type { GeneratedFile } from "../render";
import { partExports, sfc } from "./sfc";
import { rekaVars } from "./states";

// Button on Reka's Primitive: a native button (so native states, as on Radix), `as` and `as-child`
// for links and router links. The classes, axes, aliases and square sizes are Button's pieces, the
// same ones the React button prints; index.ts holds them, as shadcn-vue's barrel holds its cva.
export function renderButton(anatomy: Anatomy): GeneratedFile[] {
  const { root, variants, intents, sizes, defaultVariant, defaultSize, aliases, defaultIntent, iconSizes } = buttonPieces(anatomy, NATIVE_STATES);
  const aliasEntries = aliases.map(([name, a]) => `${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} }`).join(",\n");
  const iconEntries = iconSizes.map(([name, size]) => `${q(name)}: ${q(size)}`).join(", ");

  const index = `import type { HTMLAttributes } from "vue";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

${partExports(["Button"])}

${rekaVars(cvaSource("variantClasses", root))}

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

// Icon-only buttons are the same heights made square; "icon" is the default height.
const iconSizes = { ${iconEntries} } as const satisfies Record<string, Size>;
type SizeName = Size | "default" | keyof typeof iconSizes;

export type ButtonVariantProps = {
  variant?: Variant | Alias | undefined;
  intent?: Intent | undefined;
  size?: SizeName | undefined;
};
// shadcn-vue's name for the same props, so code written against it keeps compiling.
export type ButtonVariants = ButtonVariantProps;

function isAlias(value: Variant | Alias): value is Alias {
  return value in aliases;
}

// The variant, intent and height a button's props come to; Button writes them as data attributes.
export function resolveButtonAxes({ variant, intent, size }: ButtonVariantProps) {
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
export function buttonVariants({ class: className, ...props }: ButtonVariantProps & { class?: HTMLAttributes["class"] } = {}) {
  const { square, ...axes } = resolveButtonAxes(props);
  return cn(variantClasses(axes), square && "aspect-square shrink-0 px-0", className);
}
`;

  const script = `import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { Primitive, type PrimitiveProps } from "reka-ui";
import { buttonVariants, resolveButtonAxes, type ButtonVariantProps } from ".";

interface Props extends PrimitiveProps {
  variant?: ButtonVariantProps["variant"];
  intent?: ButtonVariantProps["intent"];
  size?: ButtonVariantProps["size"];
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { as: "button", size: "default" });
const axes = computed(() => resolveButtonAxes(props));`;

  const template = `<Primitive
  data-slot="button"
  :data-variant="axes.variant"
  :data-intent="axes.intent"
  :data-size="props.size === 'default' ? axes.size : props.size"
  :as="as"
  :as-child="asChild"
  :class="buttonVariants({ variant, intent, size, class: props.class })"
>
  <slot />
</Primitive>`;

  return [sfc("button/Button.vue", script, template), { path: "button/index.ts", source: index }];
}
