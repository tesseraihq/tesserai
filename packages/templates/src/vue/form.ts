import type { Anatomy } from "@tesserai/core";
import { labelPieces } from "../base-ui/label";
import { textareaPieces } from "../base-ui/textarea";
import { q, unionType } from "../codegen";
import { fieldPieces } from "../field";
import { LUCIDE_PACKAGES } from "../icons";
import { nativeSelectPieces } from "../native-select";
import { inputPieces } from "../radix/input";
import type { GeneratedFile } from "../render";
import { barrel, classList, exportedCva, folder, plain, staticClasses, styled } from "./sfc";

// The form controls: tesserai's own plain inputs take v-model through useVModel (with defaultValue
// for an uncontrolled start), as shadcn-vue's do; Label is Reka's.

// The v-model wiring shadcn-vue's Input and Textarea use: modelValue and update:modelValue, or
// defaultValue left to the element.
const V_MODEL = `const emits = defineEmits<{ (e: "update:modelValue", payload: string | number): void }>();
const modelValue = useVModel(props, "modelValue", emits, { passive: true, defaultValue: props.defaultValue });`;

export function renderInput(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = inputPieces(anatomy);
  const f = folder("input");
  // The native size attribute (a character count) is replaced by the design system's size axis.
  const input = f.file(
    "Input",
    `import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { cn } from "@/lib/utils";
import { inputVariants } from ".";

const props = withDefaults(
  defineProps<{ defaultValue?: string | number; modelValue?: string | number; size?: ${unionType(sizes)}; class?: HTMLAttributes["class"] }>(),
  { size: ${q(defaultSize)} },
);
${V_MODEL}`,
    `<input v-model="modelValue" data-slot="input" :data-size="size" :class="cn(inputVariants({ size }), props.class)" />`,
  );
  return [
    input,
    barrel(
      "input",
      ["Input"],
      `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("inputVariants", slots.input)}

export type InputVariants = VariantProps<typeof inputVariants>;`,
    ),
  ];
}

export function renderTextarea(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = textareaPieces(anatomy);
  const f = folder("textarea");
  const textarea = f.file(
    "Textarea",
    `import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { cn } from "@/lib/utils";

const props = defineProps<{ defaultValue?: string | number; modelValue?: string | number; class?: HTMLAttributes["class"] }>();
${V_MODEL}`,
    `<textarea v-model="modelValue" data-slot="textarea" :class="cn(${classList(slots.textarea)}, props.class)" />`,
  );
  return [textarea, barrel("textarea", ["Textarea"])];
}

export function renderLabel(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = labelPieces(anatomy);
  return [styled(folder("label"), "Label", "Label", "label", classList(slots.label)), barrel("label", ["Label"])];
}

// Field: plain markup around the system's Label, as in shadcn-vue. A checked control inside a
// choice card is found by data-state=checked, as on Radix (Reka marks it the same way).
export function renderField(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = fieldPieces(anatomy);
  const f = folder("field");
  const orientations = Object.keys(slots.field.variants.orientation);

  const legend = f.file(
    "FieldLegend",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; variant?: "legend" | "label" }>(), { variant: "legend" });`,
    `<legend data-slot="field-legend" :data-variant="variant" :class="cn(${classList(slots["field-legend"])}, props.class)">
  <slot />
</legend>`,
  );

  const field = f.file(
    "Field",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { fieldVariants } from ".";

const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; orientation?: ${unionType(orientations)} }>(), { orientation: "vertical" });`,
    `<div role="group" data-slot="field" :data-orientation="orientation" :class="cn(fieldVariants({ orientation }), props.class)">
  <slot />
</div>`,
  );

  const label = f.file(
    "FieldLabel",
    `import type { LabelProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const props = defineProps<LabelProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");`,
    `<Label data-slot="field-label" v-bind="delegatedProps" :class="cn(${classList(slots["field-label"])}, props.class)">
  <slot />
</Label>`,
  );

  const separator = f.file(
    "FieldSeparator",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<div data-slot="field-separator" :data-content="!!$slots.default" :class="cn(${classList(slots["field-separator"])}, props.class)">
  <div aria-hidden="true" ${staticClasses(slots["field-separator:line"])} />
  <span v-if="$slots.default" data-slot="field-separator-content" ${staticClasses(slots["field-separator-content"])}>
    <slot />
  </span>
</div>`,
  );

  // Errors from a form library, or the slot's own message; several are listed.
  const error = f.file(
    "FieldError",
    `import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"]; errors?: Array<string | { message?: string | undefined } | undefined> }>();

const content = computed(() => {
  if (props.errors === undefined || props.errors.length === 0) return null;
  const messages = [...new Set(props.errors.map((error) => (typeof error === "string" ? error : error?.message)).filter((m): m is string => Boolean(m)))];
  if (messages.length === 0) return null;
  return messages.length === 1 ? messages[0]! : messages;
});`,
    `<div v-if="$slots.default || content" role="alert" data-slot="field-error" :class="cn(${classList(slots["field-error"])}, props.class)">
  <slot v-if="$slots.default" />
  <template v-else-if="typeof content === 'string'">{{ content }}</template>
  <ul v-else-if="Array.isArray(content)" ${staticClasses(slots["field-error:list"])}>
    <li v-for="(message, index) in content" :key="index">{{ message }}</li>
  </ul>
</div>`,
  );

  const orientationClasses = Object.entries(slots.field.variants.orientation).map(([name, classes]) => `${q(name)}: ${q(classes.join(" "))}`);
  const index = `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export const fieldVariants = cva(${q(slots.field.base.join(" "))}, {
  variants: { orientation: { ${orientationClasses.join(", ")} } },
  defaultVariants: { orientation: "vertical" },
});

export type FieldVariants = VariantProps<typeof fieldVariants>;`;

  return [
    plain(f, "FieldSet", "fieldset", "field-set", classList(slots["field-set"])),
    legend,
    plain(f, "FieldGroup", "div", "field-group", classList(slots["field-group"])),
    field,
    plain(f, "FieldContent", "div", "field-content", classList(slots["field-content"])),
    label,
    plain(f, "FieldTitle", "div", "field-label", classList(slots["field-label:title"])),
    plain(f, "FieldDescription", "p", "field-description", classList(slots["field-description"])),
    separator,
    error,
    barrel("field", ["Field", "FieldContent", "FieldDescription", "FieldError", "FieldGroup", "FieldLabel", "FieldLegend", "FieldSeparator", "FieldSet", "FieldTitle"], index),
  ];
}

// A native <select> with a chevron. The class prop goes on the wrapper, as in shadcn and the React
// file, so width and margins apply to the whole control; every other attribute goes on the select.
export function renderNativeSelect(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = nativeSelectPieces(anatomy);
  const f = folder("native-select");
  const select = f.file(
    "NativeSelect",
    `import type { AcceptableValue } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { ChevronDownIcon } from "${LUCIDE_PACKAGES.vue}";
import { useVModel } from "@vueuse/core";
import { onMounted, ref } from "vue";
import { cn } from "@/lib/utils";
import { nativeSelectVariants } from ".";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{ modelValue?: AcceptableValue | AcceptableValue[]; defaultValue?: AcceptableValue | AcceptableValue[]; size?: ${unionType(sizes)}; class?: HTMLAttributes["class"] }>(), { size: ${q(defaultSize)} });
const emits = defineEmits<{ "update:modelValue": [value: AcceptableValue | AcceptableValue[]] }>();
const modelValue = useVModel(props, "modelValue", emits, { passive: true, defaultValue: props.defaultValue });

// A select always shows an option. With no value given, it takes the one its markup chooses (a
// selected option, else the first), as the browser does; Vue's v-model would otherwise show none.
const select = ref<HTMLSelectElement>();
onMounted(() => {
  if (modelValue.value !== undefined || select.value === undefined || select.value.multiple) return;
  const option = select.value.querySelector<HTMLOptionElement>("option[selected]") ?? [...select.value.options].find((o) => !o.disabled);
  if (option !== undefined) modelValue.value = "_value" in option ? (option._value as AcceptableValue) : option.value;
});`,
    `<div data-slot="native-select-wrapper" :data-size="size" :class="cn(${classList(slots["native-select-wrapper"])}, props.class)">
  <select ref="select" v-bind="$attrs" v-model="modelValue" data-slot="native-select" :data-size="size" :class="nativeSelectVariants({ size })">
    <slot />
  </select>
  <ChevronDownIcon aria-hidden="true" data-slot="native-select-icon" :class="cn(${classList(slots["native-select-icon"])})" />
</div>`,
  );
  return [
    select,
    plain(f, "NativeSelectOption", "option", "native-select-option", classList(slots["native-select-option"])),
    plain(f, "NativeSelectOptGroup", "optgroup", "native-select-optgroup", classList(slots["native-select-optgroup"])),
    barrel(
      "native-select",
      ["NativeSelect", "NativeSelectOptGroup", "NativeSelectOption"],
      `import { cva } from "class-variance-authority";

${exportedCva("nativeSelectVariants", slots["native-select"])}`,
    ),
  ];
}
