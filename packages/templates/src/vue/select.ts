import type { Anatomy } from "@tesserai/core";
import { q, unionType } from "../codegen";
import { LUCIDE_PACKAGES } from "../icons";
import { selectPieces } from "../radix/select";
import type { GeneratedFile } from "../render";
import { barrel, classList, exportedCva, folder, passthrough, staticClasses, styled } from "./sfc";

// Select on Reka's parts; v-model is the chosen value. Reka positions and marks it as Radix does:
// by default the list opens over the trigger with the chosen item lined up with it, as native
// menus do; position="popper" drops it below instead.
export function renderSelect(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = selectPieces(anatomy);
  const f = folder("select");

  const trigger = f.file(
    "SelectTrigger",
    `import type { SelectTriggerProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { ChevronDownIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { computed } from "vue";
import { SelectIcon, SelectTrigger, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";
import { selectTriggerVariants } from ".";

const props = withDefaults(defineProps<SelectTriggerProps & { class?: HTMLAttributes["class"]; size?: ${unionType(sizes)} | "default" }>(), { size: "default" });
const delegatedProps = reactiveOmit(props, "class", "size");
const forwarded = useForwardProps(delegatedProps);
const resolved = computed(() => (props.size === "default" ? ${q(defaultSize)} : props.size));`,
    `<SelectTrigger data-slot="select-trigger" :data-size="resolved" v-bind="forwarded" :class="cn(selectTriggerVariants({ size: resolved }), props.class)">
  <slot />
  <SelectIcon as-child>
    <ChevronDownIcon data-slot="select-icon" aria-hidden="true" ${staticClasses(slots["select-icon"])} />
  </SelectIcon>
</SelectTrigger>`,
  );

  const content = f.file(
    "SelectContent",
    `import type { SelectContentEmits, SelectContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { computed } from "vue";
import { SelectContent, SelectPortal, SelectViewport, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import SelectScrollDownButton from "./SelectScrollDownButton.vue";
import SelectScrollUpButton from "./SelectScrollUpButton.vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SelectContentProps & { class?: HTMLAttributes["class"] }>(), { position: "item-aligned", align: "center" });
const emits = defineEmits<SelectContentEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
// Only a list dropped below its trigger sits away from it.
const bound = computed(() => (props.position === "popper" ? { ...forwarded.value, sideOffset: props.sideOffset ?? 4 } : forwarded.value));`,
    `<SelectPortal>
  <SelectContent
    data-slot="select-content"
    :data-align-trigger="position === 'item-aligned'"
    v-bind="{ ...$attrs, ...bound }"
    :class="cn(${classList(slots["select-content"])}, props.class)"
  >
    <SelectScrollUpButton />
    <SelectViewport :data-position="position" ${staticClasses(slots["select-content:viewport"])}>
      <slot />
    </SelectViewport>
    <SelectScrollDownButton />
  </SelectContent>
</SelectPortal>`,
  );

  const item = f.file(
    "SelectItem",
    `import type { SelectItemEmits, SelectItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { CheckIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<SelectItemProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<SelectItemEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<SelectItem data-slot="select-item" v-bind="forwarded" :class="cn(${classList(slots["select-item"])}, props.class)">
  <SelectItemText>
    <slot />
  </SelectItemText>
  <SelectItemIndicator data-slot="select-item-indicator" ${staticClasses(slots["select-item-indicator"])}>
    <CheckIcon aria-hidden="true" />
  </SelectItemIndicator>
</SelectItem>`,
  );

  const scroll = (name: "Up" | "Down") =>
    f.file(
      `SelectScroll${name}Button`,
      `import type { SelectScroll${name}ButtonProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { Chevron${name}Icon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { SelectScroll${name}Button, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<SelectScroll${name}ButtonProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);`,
      `<SelectScroll${name}Button data-slot="select-scroll-${name.toLowerCase()}-button" v-bind="forwarded" :class="cn(${classList(slots[`select-scroll-${name === "Up" ? "up" : "down"}-button`])}, props.class)">
  <slot>
    <Chevron${name}Icon aria-hidden="true" />
  </slot>
</SelectScroll${name}Button>`,
    );

  return [
    passthrough(f, "Select", "SelectRoot", "select", { emits: true, slotProps: true }),
    content,
    styled(f, "SelectGroup", "SelectGroup", "select-group", classList(slots["select-group"])),
    item,
    styled(f, "SelectLabel", "SelectLabel", "select-label", classList(slots["select-label"])),
    scroll("Down"),
    scroll("Up"),
    styled(f, "SelectSeparator", "SelectSeparator", "select-separator", classList(slots["select-separator"])),
    trigger,
    passthrough(f, "SelectValue", "SelectValue", "select-value", { slotProps: true }),
    barrel(
      "select",
      ["Select", "SelectContent", "SelectGroup", "SelectItem", "SelectLabel", "SelectScrollDownButton", "SelectScrollUpButton", "SelectSeparator", "SelectTrigger", "SelectValue"],
      `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("selectTriggerVariants", slots["select-trigger"])}

export type SelectTriggerVariants = VariantProps<typeof selectTriggerVariants>;`,
    ),
  ];
}
