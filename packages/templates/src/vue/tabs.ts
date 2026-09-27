import type { Anatomy } from "@tesserai/core";
import { q, unionType } from "../codegen";
import { accordionPieces, collapsiblePieces } from "../disclosure";
import { LUCIDE_PACKAGES } from "../icons";
import { RADIX_STATES } from "../radix/states";
import { RADIX_TOGGLE_STATES } from "../radix/toggle";
import type { GeneratedFile } from "../render";
import { tabsPieces } from "../tabs-shared";
import { togglePieces, toggleGroupPieces } from "../toggle-shared";
import { barrel, classList, exportedCva, folder, passthrough, staticClasses, styled } from "./sfc";

// Tabs, Accordion, Collapsible, Toggle and Toggle Group on Reka's parts. Reka marks them as Radix
// does (data-state=active|open|on, data-orientation), so the classes are the Radix output's.

export function renderTabs(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, defaultVariant, aliases } = tabsPieces(anatomy);
  const f = folder("tabs");
  const list = f.file(
    "TabsList",
    `import type { TabsListProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { TabsListVariant } from ".";
import { reactiveOmit } from "@vueuse/core";
import { computed } from "vue";
import { TabsList } from "reka-ui";
import { cn } from "@/lib/utils";
import { resolveTabsListVariant, tabsListVariants } from ".";

const props = defineProps<TabsListProps & { class?: HTMLAttributes["class"]; variant?: TabsListVariant }>();
const delegatedProps = reactiveOmit(props, "class", "variant");
const resolved = computed(() => resolveTabsListVariant(props.variant));`,
    `<TabsList data-slot="tabs-list" :data-variant="resolved" v-bind="delegatedProps" :class="cn(tabsListVariants({ variant: resolved }), props.class)">
  <slot />
</TabsList>`,
  );
  const index = `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("tabsListVariants", slots["tabs-list"])}

type Variant = ${unionType(variants)};
${"default" in aliases ? `// shadcn's name for the segmented look.\nconst aliases = { default: "segmented" } as const;` : "const aliases = {} as const;"}
type Alias = keyof typeof aliases;
export type TabsListVariant = Variant | Alias;
export type TabsListVariants = VariantProps<typeof tabsListVariants>;

export function resolveTabsListVariant(variant: TabsListVariant | undefined): Variant {
  if (variant === undefined) return ${q(defaultVariant)};
  return variant in aliases ? aliases[variant as Alias] : (variant as Variant);
}`;
  return [
    styled(f, "Tabs", "TabsRoot", "tabs", classList(slots.tabs), { emits: true, slotProps: true }),
    list,
    styled(f, "TabsTrigger", "TabsTrigger", "tabs-trigger", classList(slots["tabs-trigger"])),
    styled(f, "TabsContent", "TabsContent", "tabs-content", classList(slots["tabs-content"])),
    barrel("tabs", ["Tabs", "TabsContent", "TabsList", "TabsTrigger"], index),
  ];
}

// type="single" (with collapsible to allow closing) or type="multiple"; v-model or defaultValue.
export function renderAccordion(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = accordionPieces(anatomy);
  const f = folder("accordion");
  const trigger = f.file(
    "AccordionTrigger",
    `import type { AccordionTriggerProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { ChevronDownIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { AccordionHeader, AccordionTrigger } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<AccordionTriggerProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");`,
    `<AccordionHeader ${staticClasses(slots["accordion-trigger:header"])}>
  <AccordionTrigger data-slot="accordion-trigger" v-bind="delegatedProps" :class="cn(${classList(slots["accordion-trigger"])}, props.class)">
    <slot />
    <slot name="icon">
      <ChevronDownIcon data-slot="accordion-trigger-icon" aria-hidden="true" ${staticClasses(slots["accordion-trigger-icon"])} />
    </slot>
  </AccordionTrigger>
</AccordionHeader>`,
  );
  // The class prop goes on the padded inner element, as in the React file; the content itself
  // only animates its height.
  const content = f.file(
    "AccordionContent",
    `import type { AccordionContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { AccordionContent } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<AccordionContentProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");`,
    `<AccordionContent data-slot="accordion-content" v-bind="delegatedProps" ${staticClasses(slots["accordion-content"])}>
  <div :class="cn(${classList(slots["accordion-content:inner"])}, props.class)">
    <slot />
  </div>
</AccordionContent>`,
  );
  return [
    // Radix writes the root's orientation; Reka only its items', so it's written here too.
    styled(f, "Accordion", "AccordionRoot", "accordion", classList(slots.accordion), { emits: true, slotProps: true, attrs: `:data-orientation="props.orientation ?? 'vertical'"` }),
    styled(f, "AccordionItem", "AccordionItem", "accordion-item", classList(slots["accordion-item"]), { slotProps: true }),
    trigger,
    content,
    barrel("accordion", ["Accordion", "AccordionContent", "AccordionItem", "AccordionTrigger"]),
  ];
}

// v-model:open or defaultOpen control it.
export function renderCollapsible(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = collapsiblePieces(anatomy);
  const f = folder("collapsible");
  return [
    passthrough(f, "Collapsible", "CollapsibleRoot", "collapsible", { emits: true, slotProps: true }),
    passthrough(f, "CollapsibleTrigger", "CollapsibleTrigger", "collapsible-trigger"),
    styled(f, "CollapsibleContent", "CollapsibleContent", "collapsible-content", classList(slots["collapsible-content"]), { emits: true }),
    barrel("collapsible", ["Collapsible", "CollapsibleContent", "CollapsibleTrigger"]),
  ];
}

export function renderToggle(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, sizes, defaultVariant, defaultSize, aliases } = togglePieces(anatomy, RADIX_TOGGLE_STATES);
  const f = folder("toggle");
  const toggle = f.file(
    "Toggle",
    `import type { ToggleEmits, ToggleProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { ToggleSize, ToggleVariant } from ".";
import { reactiveOmit } from "@vueuse/core";
import { computed } from "vue";
import { Toggle, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { toggleVariant, toggleVariants } from ".";

const props = withDefaults(defineProps<ToggleProps & { class?: HTMLAttributes["class"]; variant?: ToggleVariant | "default"; size?: ToggleSize }>(), { size: ${q(defaultSize)} });
const emits = defineEmits<ToggleEmits>();
const delegatedProps = reactiveOmit(props, "class", "size", "variant");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const v = computed(() => toggleVariant(props.variant));`,
    `<Toggle v-slot="slotProps" data-slot="toggle" :data-variant="v" :data-size="size" v-bind="forwarded" :class="cn(toggleVariants({ variant: v, size }), props.class)">
  <slot v-bind="slotProps" />
</Toggle>`,
  );
  const index = `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("toggleVariants", slots.toggle)}

export type ToggleVariant = ${unionType(variants)};
export type ToggleSize = ${unionType(sizes)};
export type ToggleVariants = VariantProps<typeof toggleVariants>;

// shadcn calls the transparent toggle "default"; it maps to "${aliases.default}" here.
export function toggleVariant(variant: ToggleVariant | "default" | undefined): ToggleVariant {
  return variant === undefined ? ${q(defaultVariant)} : variant === "default" ? ${q(aliases.default)} : variant;
}`;
  return [toggle, barrel("toggle", ["Toggle"], index)];
}

// The group's variant, size and spacing reach its items through provide/inject, as React's context.
export function renderToggleGroup(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = toggleGroupPieces(anatomy, RADIX_STATES);
  const f = folder("toggle-group");
  const group = f.file(
    "ToggleGroup",
    `import type { ToggleGroupRootEmits, ToggleGroupRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { ToggleSize, ToggleVariant } from "@/components/ui/toggle";
import { reactiveOmit } from "@vueuse/core";
import { computed, provide } from "vue";
import { ToggleGroupRoot, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { TOGGLE_GROUP } from ".";

const props = withDefaults(
  defineProps<ToggleGroupRootProps & { class?: HTMLAttributes["class"]; variant?: ToggleVariant | "default"; size?: ToggleSize; spacing?: number }>(),
  { orientation: "horizontal" },
);
const emits = defineEmits<ToggleGroupRootEmits>();
const delegatedProps = reactiveOmit(props, "class", "size", "variant", "spacing");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
provide(TOGGLE_GROUP, computed(() => ({ variant: props.variant, size: props.size, spacing: props.spacing })));
const style = computed(() => (props.spacing === undefined || props.spacing === 0 ? undefined : { gap: \`calc(var(--spacing) * \${props.spacing})\` }));`,
    `<ToggleGroupRoot
  v-slot="slotProps"
  data-slot="toggle-group"
  :data-variant="variant"
  :data-size="size"
  :data-spacing="spacing"
  :data-orientation="orientation"
  :style="style"
  v-bind="forwarded"
  :class="cn(${classList(slots["toggle-group"])}, props.class)"
>
  <slot v-bind="slotProps" />
</ToggleGroupRoot>`,
  );
  const item = f.file(
    "ToggleGroupItem",
    `import type { ToggleGroupItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { ToggleSize, ToggleVariant } from "@/components/ui/toggle";
import { reactiveOmit } from "@vueuse/core";
import { computed, inject } from "vue";
import { ToggleGroupItem, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";
import { toggleVariant, toggleVariants } from "@/components/ui/toggle";
import { TOGGLE_GROUP } from ".";

const props = defineProps<ToggleGroupItemProps & { class?: HTMLAttributes["class"]; variant?: ToggleVariant | "default"; size?: ToggleSize }>();
const delegatedProps = reactiveOmit(props, "class", "size", "variant");
const forwarded = useForwardProps(delegatedProps);
const group = inject(TOGGLE_GROUP, undefined);
const v = computed(() => toggleVariant(group?.value.variant ?? props.variant));
const s = computed(() => group?.value.size ?? props.size);`,
    `<ToggleGroupItem
  v-slot="slotProps"
  data-slot="toggle-group-item"
  :data-variant="v"
  :data-size="s"
  :data-spacing="group?.spacing"
  v-bind="forwarded"
  :class="cn(toggleVariants({ variant: v, size: s }), ${classList(slots["toggle-group-item"])}, props.class)"
>
  <slot v-bind="slotProps" />
</ToggleGroupItem>`,
  );
  const index = `import type { ComputedRef, InjectionKey } from "vue";
import type { ToggleSize, ToggleVariant } from "@/components/ui/toggle";

export type ToggleGroupSettings = { variant?: ToggleVariant | "default" | undefined; size?: ToggleSize | undefined; spacing?: number | undefined };

// What a group tells its items.
export const TOGGLE_GROUP: InjectionKey<ComputedRef<ToggleGroupSettings>> = Symbol("ToggleGroup");`;
  return [group, item, barrel("toggle-group", ["ToggleGroup", "ToggleGroupItem"], index)];
}
