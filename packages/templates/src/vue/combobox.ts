import type { Anatomy } from "@tesserai/core";
import { mapStates } from "../classes";
import { comboboxPieces, type ComboboxFlavor } from "../combobox";
import { LUCIDE_PACKAGES } from "../icons";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, staticClasses, styled } from "./sfc";

// Reka's combobox rows are its Listbox's: data-highlighted and data-disabled as Base UI's, but the
// chosen one data-state=checked where Base UI says data-selected. The list is as wide as the field
// (--reka-combobox-trigger-width, the anchor's width) and opens and closes with Radix's keyframes
// on data-state, from --reka-combobox-content-transform-origin: Reka waits for an animation, not a
// transition, before it unmounts the list, so Base UI's starting- and ending-style transition has
// no Reka counterpart.
export const REKA_COMBOBOX: ComboboxFlavor = {
  item: { ...mapStates(() => []), highlighted: ["data-highlighted:"], disabled: ["data-disabled:"], selected: ["data-[state=checked]:"] },
  popup: ["w-(--reka-combobox-trigger-width)", "z-50", "outline-none", "origin-(--reka-combobox-content-transform-origin)", "data-[state=open]:animate-enter", "data-[state=closed]:animate-exit"],
};

// Combobox on Reka's parts, with tesserai's (and shadcn's React) API: ComboboxInput is the field (the
// input, and a button at its end that opens the list and, optionally, one that clears it), and it
// anchors the list; ComboboxContent is the list's popup and ComboboxList its scrolling list. Reka
// filters the rows by their text as you type. For multiple selection, ComboboxChips is the field:
// Reka's TagsInput, one chip per chosen value, and ComboboxChipsInput the text box in it.
export function renderCombobox(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = comboboxPieces(anatomy, REKA_COMBOBOX);
  const f = folder("combobox");

  // The root, which tells the list whether chips anchor it.
  const root = f.file(
    "Combobox",
    `import type { ComboboxRootEmits, ComboboxRootProps } from "reka-ui";
import { ComboboxRoot, useForwardPropsEmits } from "reka-ui";
import { ref } from "vue";
import { provideComboboxChips } from ".";

const props = defineProps<ComboboxRootProps>();
const emits = defineEmits<ComboboxRootEmits>();
const forwarded = useForwardPropsEmits(props, emits);
provideComboboxChips({ chips: ref(false) });`,
    `<ComboboxRoot v-slot="slotProps" v-bind="forwarded">
  <slot v-bind="slotProps" />
</ComboboxRoot>`,
  );

  const trigger = f.file(
    "ComboboxTrigger",
    `import type { ComboboxTriggerProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { ChevronDownIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxTrigger, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ComboboxTriggerProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);`,
    `<ComboboxTrigger data-slot="combobox-trigger" aria-label="Show options" v-bind="forwarded" :class="cn(${classList(slots["combobox-trigger"])}, props.class)">
  <slot />
  <ChevronDownIcon />
</ComboboxTrigger>`,
  );

  // Shown while something is chosen, as Base UI's is; clears the choice and the text.
  const clear = f.file(
    "ComboboxClear",
    `import type { ComboboxCancelProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { XIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxCancel, injectComboboxRootContext, useForwardProps } from "reka-ui";
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<ComboboxCancelProps & { class?: HTMLAttributes["class"]; disabled?: boolean }>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
const root = injectComboboxRootContext();
const chosen = computed(() => {
  const value = root.modelValue.value;
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "";
});
function clear() {
  if (root.disabled.value || props.disabled) return;
  root.modelValue.value = (Array.isArray(root.modelValue.value) ? [] : null) as never;
}`,
    `<ComboboxCancel v-if="chosen" data-slot="combobox-clear" aria-label="Clear" v-bind="forwarded" :disabled="root.disabled.value || props.disabled" :class="cn(${classList(slots["combobox-clear"])}, props.class)" @click="clear">
  <XIcon />
</ComboboxCancel>`,
  );

  // The field: its class goes on the field, everything else on the input.
  const input = f.file(
    "ComboboxInput",
    `import type { ComboboxInputEmits, ComboboxInputProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxAnchor, ComboboxInput, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import ComboboxClear from "./ComboboxClear.vue";
import ComboboxTrigger from "./ComboboxTrigger.vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ComboboxInputProps & { class?: HTMLAttributes["class"]; showTrigger?: boolean; showClear?: boolean }>(), { showTrigger: true, showClear: false });
const emits = defineEmits<ComboboxInputEmits>();
const delegatedProps = reactiveOmit(props, "class", "showTrigger", "showClear");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<ComboboxAnchor data-slot="combobox-input-wrapper" :class="cn(${classList(slots["combobox-input-wrapper"])}, props.class)">
  <ComboboxInput data-slot="combobox-input" v-bind="{ ...$attrs, ...forwarded }" ${staticClasses(slots["combobox-input"])} />
  <ComboboxClear v-if="showClear" :disabled="disabled" />
  <ComboboxTrigger v-if="showTrigger" :disabled="disabled" ${staticClasses(slots["combobox-input-wrapper:trigger"])} />
  <slot />
</ComboboxAnchor>`,
  );

  // The list's popup, under the field (or the chips), as wide as it.
  const content = f.file(
    "ComboboxContent",
    `import type { ComboboxContentEmits, ComboboxContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxContent, ComboboxPortal, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { useComboboxChips } from ".";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ComboboxContentProps & { class?: HTMLAttributes["class"] }>(), { position: "popper", side: "bottom", sideOffset: 6, align: "start", alignOffset: 0 });
const emits = defineEmits<ComboboxContentEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const { chips } = useComboboxChips();`,
    `<ComboboxPortal>
  <ComboboxContent data-slot="combobox-content" :data-chips="chips" v-bind="{ ...$attrs, ...forwarded }" :class="cn(${classList(slots["combobox-content"])}, props.class)">
    <slot />
  </ComboboxContent>
</ComboboxPortal>`,
  );

  const item = f.file(
    "ComboboxItem",
    `import type { ComboboxItemEmits, ComboboxItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { CheckIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxItem, ComboboxItemIndicator, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ComboboxItemProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<ComboboxItemEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<ComboboxItem data-slot="combobox-item" v-bind="forwarded" :class="cn(${classList(slots["combobox-item"])}, props.class)">
  <slot />
  <ComboboxItemIndicator ${staticClasses(slots["combobox-item:indicator"])}>
    <CheckIcon />
  </ComboboxItemIndicator>
</ComboboxItem>`,
  );

  // The chips field for multiple selection: Reka's TagsInput over the combobox's value, anchoring
  // the list.
  const chips = f.file(
    "ComboboxChips",
    `import type { AcceptableInputValue, TagsInputRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxAnchor, injectComboboxRootContext, TagsInputRoot, useForwardProps } from "reka-ui";
import { onMounted } from "vue";
import { cn } from "@/lib/utils";
import { useComboboxChips } from ".";

const props = defineProps<Omit<TagsInputRootProps, "modelValue" | "defaultValue"> & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
const root = injectComboboxRootContext();
const { chips } = useComboboxChips();
onMounted(() => (chips.value = true));

const values = () => (Array.isArray(root.modelValue.value) ? root.modelValue.value : []) as AcceptableInputValue[];
const setValues = (next: AcceptableInputValue[]) => {
  if (!root.disabled.value && !props.disabled) root.modelValue.value = next;
};`,
    `<ComboboxAnchor as-child>
  <TagsInputRoot data-slot="combobox-chips" v-bind="forwarded" :disabled="root.disabled.value || props.disabled" :model-value="values()" :class="cn(${classList(slots["combobox-input-wrapper"])}, 'px-1 py-1', props.class)" @update:model-value="setValues">
    <slot />
  </TagsInputRoot>
</ComboboxAnchor>`,
  );

  const chip = f.file(
    "ComboboxChip",
    `import type { TagsInputItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { XIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { TagsInputItem, TagsInputItemDelete, injectTagsInputRootContext, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<TagsInputItemProps & { class?: HTMLAttributes["class"]; showRemove?: boolean }>(), { showRemove: true });
const delegatedProps = reactiveOmit(props, "class", "showRemove");
const forwarded = useForwardProps(delegatedProps);
const tags = injectTagsInputRootContext();`,
    `<TagsInputItem data-slot="combobox-chip" v-bind="forwarded" :class="cn(${classList(slots["combobox-chip"])}, props.class)">
  <slot />
  <TagsInputItemDelete v-if="showRemove" data-slot="combobox-chip-remove" aria-label="Remove" :disabled="tags.disabled.value || props.disabled" ${staticClasses(slots["combobox-chip-remove"])}>
    <XIcon />
  </TagsInputItemDelete>
</TagsInputItem>`,
  );

  const chipsInput = f.file(
    "ComboboxChipsInput",
    `import type { ComboboxInputEmits, ComboboxInputProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxInput, TagsInputInput, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ComboboxInputProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<ComboboxInputEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<ComboboxInput v-bind="forwarded" as-child>
  <TagsInputInput data-slot="combobox-chip-input" :class="cn(${classList(slots["combobox-input"])}, 'px-1', props.class)" @keydown.enter.prevent />
</ComboboxInput>`,
  );

  // What's chosen, as text (or as the slot draws it).
  const value = f.file(
    "ComboboxValue",
    `import { injectComboboxRootContext } from "reka-ui";
import { computed } from "vue";

const root = injectComboboxRootContext();
const value = computed(() => root.modelValue.value);`,
    `<slot :value="value">{{ Array.isArray(value) ? value.join(", ") : (value ?? "") }}</slot>`,
  );

  return [
    root,
    value,
    trigger,
    clear,
    input,
    content,
    // Base UI's list is a plain element too: here, Reka's viewport, which scrolls the rows.
    styled(f, "ComboboxList", "ComboboxViewport", "combobox-list", classList(slots["combobox-list"])),
    item,
    styled(f, "ComboboxGroup", "ComboboxGroup", "combobox-group", classList(slots["combobox-group"])),
    styled(f, "ComboboxLabel", "ComboboxLabel", "combobox-label", classList(slots["combobox-label"])),
    // Kept in place and empty while rows match (it takes no room then), as Base UI's is: Reka's own
    // leaves the list altogether.
    f.file(
      "ComboboxEmpty",
      `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { injectComboboxRootContext, Primitive } from "reka-ui";
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<PrimitiveProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const root = injectComboboxRootContext();
const empty = computed(() => root.filterState.value.count === 0);`,
      `<Primitive data-slot="combobox-empty" v-bind="delegatedProps" :class="cn(${classList(slots["combobox-empty"])}, props.class)">
  <slot v-if="empty" />
</Primitive>`,
    ),
    styled(f, "ComboboxSeparator", "ComboboxSeparator", "combobox-separator", classList(slots["combobox-separator"])),
    chips,
    chip,
    chipsInput,
    barrel(
      "combobox",
      ["Combobox", "ComboboxChip", "ComboboxChips", "ComboboxChipsInput", "ComboboxClear", "ComboboxContent", "ComboboxEmpty", "ComboboxGroup", "ComboboxInput", "ComboboxItem", "ComboboxLabel", "ComboboxList", "ComboboxSeparator", "ComboboxTrigger", "ComboboxValue"],
      `import type { Ref } from "vue";
import { createContext } from "reka-ui";

// Whether chips anchor the list (it then marks itself data-chips).
export const [useComboboxChips, provideComboboxChips] = createContext<{ chips: Ref<boolean> }>("Combobox");`,
    ),
  ];
}
