import type { Anatomy } from "@tesserai/core";
import { badgePieces } from "../badge";
import { q, unionType } from "../codegen";
import type { GeneratedFile } from "../render";
import { barrel, exportedCva, folder } from "./sfc";

// Badge on Reka's Primitive: a span by default, `as` and `as-child` for links. The classes, axes and
// shadcn aliases are Badge's pieces, as the React badge prints them; index.ts holds them.
export function renderBadge(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, intents, sizes, defaultVariant, defaultSize, aliases, defaultIntent } = badgePieces(anatomy);
  const f = folder("badge");

  const index = `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("badgeVariants", slots.badge)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};

// shadcn variant names keep working; they map to a variant + intent pair.
const aliases = {
${aliases.map(([name, a]) => `${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} }`).join(",\n")}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

// A variant chosen without an intent takes the intent shadcn gives that variant.
const defaultIntent: Record<Variant, Intent> = {
${variants.map((v) => `${q(v)}: ${q(defaultIntent[v]!)}`).join(",\n")}
};

export type BadgeVariantProps = {
  variant?: Variant | Alias | undefined;
  intent?: Intent | undefined;
  size?: ${unionType(sizes)} | undefined;
};
export type BadgeVariants = VariantProps<typeof badgeVariants>;

// The variant and intent a badge's props come to; Badge writes them as data attributes.
export function resolveBadgeAxes(variant: Variant | Alias, intent: Intent | undefined) {
  if (variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: variant as Variant, intent: intent ?? defaultIntent[variant as Variant] };
}`;

  const badge = f.file(
    "Badge",
    `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { BadgeVariantProps } from ".";
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { cn } from "@/lib/utils";
import { badgeVariants, resolveBadgeAxes } from ".";

interface Props extends PrimitiveProps {
  variant?: BadgeVariantProps["variant"];
  intent?: BadgeVariantProps["intent"];
  size?: BadgeVariantProps["size"];
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { as: "span", variant: ${q(defaultVariant)}, size: ${q(defaultSize)} });
const axes = computed(() => resolveBadgeAxes(props.variant, props.intent));`,
    `<Primitive
  data-slot="badge"
  :data-variant="axes.variant"
  :data-intent="axes.intent"
  :data-size="size"
  :as="as"
  :as-child="asChild"
  :class="cn(badgeVariants({ ...axes, size }), props.class)"
>
  <slot />
</Primitive>`,
  );

  return [badge, barrel("badge", ["Badge"], index)];
}
