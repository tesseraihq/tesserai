import type { Anatomy } from "@tesserai/core";
import { cardPieces } from "../base-ui/card";
import { tablePieces } from "../base-ui/table";
import { q, unionType } from "../codegen";
import { alertPieces, avatarPieces, kbdPieces, progressPieces, separatorPieces, skeletonPieces, spinnerPieces, typographyPieces } from "../display";
import { LUCIDE_PACKAGES } from "../icons";
import type { GeneratedFile } from "../render";
import { barrel, classList, exportedCva, folder, plain, staticClasses, styled } from "./sfc";

// The display components: plain markup, and Reka's Separator, Avatar and Progress where the React
// file uses Radix's. Each part's classes are its pieces', as the Radix output prints them.

export function renderCard(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = cardPieces(anatomy);
  const f = folder("card");
  // With sizes, a size prop ("default" is the system's default) and a cva; without, flat classes.
  const card = Array.isArray(slots.card)
    ? plain(f, "Card", "div", "card", classList(slots.card))
    : f.file(
        "Card",
        `import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { cardVariants } from ".";

const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; size?: ${unionType(sizes)} | "default" }>(), { size: "default" });
const resolved = computed(() => (props.size === "default" ? ${q(defaultSize)} : props.size));`,
        `<div data-slot="card" :data-size="resolved" :class="cn(cardVariants({ size: resolved }), props.class)">
  <slot />
</div>`,
      );
  const index = Array.isArray(slots.card) ? "" : `import { cva } from "class-variance-authority";\n\n${exportedCva("cardVariants", slots.card)}`;
  return [
    card,
    plain(f, "CardHeader", "div", "card-header", classList(slots["card-header"])),
    plain(f, "CardTitle", "div", "card-title", classList(slots["card-title"])),
    plain(f, "CardDescription", "div", "card-description", classList(slots["card-description"])),
    plain(f, "CardAction", "div", "card-action", classList(slots["card-action"])),
    plain(f, "CardContent", "div", "card-content", classList(slots["card-content"])),
    plain(f, "CardFooter", "div", "card-footer", classList(slots["card-footer"])),
    barrel("card", ["Card", "CardAction", "CardContent", "CardDescription", "CardFooter", "CardHeader", "CardTitle"], index),
  ];
}

// Decorative by default, as in shadcn; :decorative="false" announces it.
export function renderSeparator(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = separatorPieces(anatomy);
  const f = folder("separator");
  const separator = f.file(
    "Separator",
    `import type { SeparatorProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { Separator } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<SeparatorProps & { class?: HTMLAttributes["class"] }>(), { orientation: "horizontal", decorative: true });
const delegatedProps = reactiveOmit(props, "class");`,
    `<Separator data-slot="separator" v-bind="delegatedProps" :class="cn(${classList(slots.separator)}, props.class)" />`,
  );
  return [separator, barrel("separator", ["Separator"])];
}

export function renderSkeleton(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = skeletonPieces(anatomy);
  return [plain(folder("skeleton"), "Skeleton", "div", "skeleton", classList(slots.skeleton)), barrel("skeleton", ["Skeleton"])];
}

// The spinner is the Loader2 icon itself.
export function renderSpinner(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = spinnerPieces(anatomy);
  const spinner = folder("spinner").file(
    "Spinner",
    `import type { HTMLAttributes } from "vue";
import { Loader2Icon } from "${LUCIDE_PACKAGES.vue}";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<Loader2Icon data-slot="spinner" role="status" aria-label="Loading" :class="cn(${classList(slots.spinner)}, props.class)" />`,
  );
  return [spinner, barrel("spinner", ["Spinner"])];
}

export function renderKbd(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = kbdPieces(anatomy);
  const f = folder("kbd");
  return [plain(f, "Kbd", "kbd", "kbd", classList(slots.kbd)), plain(f, "KbdGroup", "kbd", "kbd-group", classList(slots["kbd-group"])), barrel("kbd", ["Kbd", "KbdGroup"])];
}

// Alert: variant and intent, with shadcn's names (default, destructive) as aliases.
export function renderAlert(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, intents, defaultVariant, defaultIntent, aliases } = alertPieces(anatomy);
  const f = folder("alert");
  const alert = f.file(
    "Alert",
    `import type { HTMLAttributes } from "vue";
import type { AlertVariantProps } from ".";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { alertVariants, resolveAlertAxes } from ".";

const props = defineProps<{ class?: HTMLAttributes["class"]; variant?: AlertVariantProps["variant"]; intent?: AlertVariantProps["intent"] }>();
const axes = computed(() => resolveAlertAxes(props.variant, props.intent));`,
    `<div data-slot="alert" role="alert" :data-variant="axes.variant" :data-intent="axes.intent" :class="cn(alertVariants(axes), props.class)">
  <slot />
</div>`,
  );
  const index = `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("alertVariants", slots.alert)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};

// shadcn's names keep working.
const aliases = {
${aliases.map(([name, a]) => `  ${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} },`).join("\n")}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

export type AlertVariantProps = { variant?: Variant | Alias | undefined; intent?: Intent | undefined };
export type AlertVariants = VariantProps<typeof alertVariants>;

// The variant and intent an alert's props come to; Alert writes them as data attributes.
export function resolveAlertAxes(variant: Variant | Alias | undefined, intent: Intent | undefined) {
  if (variant !== undefined && variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: (variant as Variant | undefined) ?? ${q(defaultVariant)}, intent: intent ?? ${q(defaultIntent)} };
}`;
  return [
    alert,
    plain(f, "AlertTitle", "div", "alert-title", classList(slots["alert-title"])),
    plain(f, "AlertDescription", "div", "alert-description", classList(slots["alert-description"])),
    plain(f, "AlertAction", "div", "alert-action", classList(slots["alert-action"])),
    barrel("alert", ["Alert", "AlertAction", "AlertDescription", "AlertTitle"], index),
  ];
}

export function renderAvatar(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = avatarPieces(anatomy);
  const f = folder("avatar");
  const avatar = f.file(
    "Avatar",
    `import type { AvatarRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { computed } from "vue";
import { AvatarRoot } from "reka-ui";
import { cn } from "@/lib/utils";
import { avatarVariants } from ".";

const props = withDefaults(defineProps<AvatarRootProps & { class?: HTMLAttributes["class"]; size?: ${unionType(sizes)} | "default" }>(), { size: "default" });
const delegatedProps = reactiveOmit(props, "class", "size");
const resolved = computed(() => (props.size === "default" ? ${q(defaultSize)} : props.size));`,
    `<AvatarRoot data-slot="avatar" :data-size="resolved" v-bind="delegatedProps" :class="cn(avatarVariants({ size: resolved }), props.class)">
  <slot />
</AvatarRoot>`,
  );
  // Shown until the picture loads, or instead of it: initials, an icon.
  return [
    avatar,
    styled(f, "AvatarImage", "AvatarImage", "avatar-image", classList(slots["avatar-image"]), { emits: true }),
    styled(f, "AvatarFallback", "AvatarFallback", "avatar-fallback", classList(slots["avatar-fallback"])),
    plain(f, "AvatarBadge", "span", "avatar-badge", classList(slots["avatar-badge"])),
    plain(f, "AvatarGroup", "div", "avatar-group", classList(slots["avatar-group"])),
    plain(f, "AvatarGroupCount", "div", "avatar-group-count", classList(slots["avatar-group-count"])),
    barrel("avatar", ["Avatar", "AvatarBadge", "AvatarFallback", "AvatarGroup", "AvatarGroupCount", "AvatarImage"], `import { cva } from "class-variance-authority";\n\n${exportedCva("avatarVariants", slots.avatar)}`),
  ];
}

// shadcn's typography recipes as components, each its own element sharing the data-slot.
export function renderTypography(anatomy: Anatomy): GeneratedFile[] {
  const { slots, elements } = typographyPieces(anatomy);
  const f = folder("typography");
  return [...elements.map(({ name, tag, slot }) => plain(f, name, tag, "typography", classList(slots[slot]))), barrel("typography", elements.map((e) => e.name))];
}

// The scroll container is focusable so a wide table can be scrolled from the keyboard (axe:
// scrollable-region-focusable). The class prop and the other attributes go on the table.
export function renderTable(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = tablePieces(anatomy);
  const f = folder("table");
  const table = f.file(
    "Table",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<div data-slot="table-container" tabindex="0" ${staticClasses(slots["table-container"])}>
  <table v-bind="$attrs" data-slot="table" :class="cn(${classList(slots.table)}, props.class)">
    <slot />
  </table>
</div>`,
  );
  const row = f.file(
    "TableRow",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"]; selected?: boolean }>();`,
    `<tr data-slot="table-row" :data-selected="selected ? '' : undefined" :class="cn(${classList(slots["table-row"])}, props.class)">
  <slot />
</tr>`,
  );
  return [
    table,
    plain(f, "TableHeader", "thead", "table-header", classList(slots["table-header"])),
    plain(f, "TableBody", "tbody", "table-body", classList(slots["table-body"])),
    plain(f, "TableFooter", "tfoot", "table-footer", classList(slots["table-footer"])),
    row,
    plain(f, "TableHead", "th", "table-head", classList(slots["table-head"])),
    plain(f, "TableCell", "td", "table-cell", classList(slots["table-cell"])),
    plain(f, "TableCaption", "caption", "table-caption", classList(slots["table-caption"])),
    barrel("table", ["Table", "TableBody", "TableCaption", "TableCell", "TableFooter", "TableHead", "TableHeader", "TableRow"]),
  ];
}

// modelValue is 0-100; the indicator slides into place with an inline translateX, as on Radix.
export function renderProgress(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = progressPieces(anatomy);
  const progress = folder("progress").file(
    "Progress",
    `import type { ProgressRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ProgressIndicator, ProgressRoot } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ProgressRootProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");`,
    `<ProgressRoot data-slot="progress" v-bind="delegatedProps" :class="cn(${classList(slots.progress)}, props.class)">
  <ProgressIndicator data-slot="progress-indicator" ${staticClasses(slots["progress-indicator"])} :style="{ transform: \`translateX(-\${100 - (props.modelValue ?? 0)}%)\` }" />
</ProgressRoot>`,
  );
  return [progress, barrel("progress", ["Progress"])];
}
