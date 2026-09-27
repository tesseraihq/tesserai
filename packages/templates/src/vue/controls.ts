import type { Anatomy } from "@tesserai/core";
import { q, unionType } from "../codegen";
import { LUCIDE_PACKAGES } from "../icons";
import { checkboxPieces } from "../radix/checkbox";
import { radioGroupPieces } from "../radix/radio-group";
import { switchPieces } from "../radix/switch";
import type { GeneratedFile } from "../render";
import { barrel, classList, exportedCva, folder, staticClasses } from "./sfc";

// Checkbox, Switch and Radio Group on Reka's parts, with v-model as Reka defines it (a checkbox's
// modelValue is boolean or "indeterminate"; a radio group's is the chosen value). Classes are the
// Radix output's: Reka marks checked and disabled with the same data attributes.

// The script every sized control shares: Reka's props and emits, a size, a class, forwarded.
const sizedScript = (reka: string, imports: string, sizes: string[], defaultSize: string) => `import type { ${reka}Emits, ${reka}Props } from "reka-ui";
import type { HTMLAttributes } from "vue";
${imports}

const props = withDefaults(defineProps<${reka}Props & { class?: HTMLAttributes["class"]; size?: ${unionType(sizes)} }>(), { size: ${q(defaultSize)} });
const emits = defineEmits<${reka}Emits>();
const delegatedProps = reactiveOmit(props, "class", "size");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`;

export function renderCheckbox(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = checkboxPieces(anatomy);
  const f = folder("checkbox");
  const checkbox = f.file(
    "Checkbox",
    sizedScript(
      "CheckboxRoot",
      `import { CheckIcon, MinusIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { checkboxVariants } from ".";`,
      sizes,
      defaultSize,
    ),
    `<CheckboxRoot v-slot="slotProps" data-slot="checkbox" :data-size="size" v-bind="forwarded" :class="cn(checkboxVariants({ size }), props.class)">
  <CheckboxIndicator data-slot="checkbox-indicator" ${staticClasses(slots["checkbox-indicator"])}>
    <slot v-bind="slotProps">
      <CheckIcon aria-hidden="true" ${staticClasses(slots["checkbox-indicator:check"])} />
      <MinusIcon aria-hidden="true" ${staticClasses(slots["checkbox-indicator:dash"])} />
    </slot>
  </CheckboxIndicator>
</CheckboxRoot>`,
  );
  return [
    checkbox,
    barrel(
      "checkbox",
      ["Checkbox"],
      `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("checkboxVariants", slots.checkbox)}

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;`,
    ),
  ];
}

export function renderSwitch(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = switchPieces(anatomy);
  const f = folder("switch");
  const control = f.file(
    "Switch",
    sizedScript(
      "SwitchRoot",
      `import { reactiveOmit } from "@vueuse/core";
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { switchThumbVariants, switchVariants } from ".";`,
      sizes,
      defaultSize,
    ),
    `<SwitchRoot v-slot="slotProps" data-slot="switch" :data-size="size" v-bind="forwarded" :class="cn(switchVariants({ size }), props.class)">
  <SwitchThumb data-slot="switch-thumb" :class="switchThumbVariants({ size })">
    <slot name="thumb" v-bind="slotProps" />
  </SwitchThumb>
</SwitchRoot>`,
  );
  return [
    control,
    barrel(
      "switch",
      ["Switch"],
      `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("switchVariants", slots.switch)}

${exportedCva("switchThumbVariants", slots["switch-thumb"])}

export type SwitchVariants = VariantProps<typeof switchVariants>;`,
    ),
  ];
}

export function renderRadioGroup(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = radioGroupPieces(anatomy);
  const f = folder("radio-group");
  const group = f.file(
    "RadioGroup",
    `import type { RadioGroupRootEmits, RadioGroupRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { RadioGroupRoot, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<RadioGroupRootProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<RadioGroupRootEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<RadioGroupRoot v-slot="slotProps" data-slot="radio-group" v-bind="forwarded" :class="cn(${classList(slots["radio-group"])}, props.class)">
  <slot v-bind="slotProps" />
</RadioGroupRoot>`,
  );
  const item = f.file(
    "RadioGroupItem",
    `import type { RadioGroupItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { RadioGroupIndicator, RadioGroupItem, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";
import { radioGroupDotVariants, radioGroupItemVariants } from ".";

const props = withDefaults(defineProps<RadioGroupItemProps & { class?: HTMLAttributes["class"]; size?: ${unionType(sizes)} }>(), { size: ${q(defaultSize)} });
const delegatedProps = reactiveOmit(props, "class", "size");
const forwarded = useForwardProps(delegatedProps);`,
    `<RadioGroupItem data-slot="radio-group-item" :data-size="size" v-bind="forwarded" :class="cn(radioGroupItemVariants({ size }), props.class)">
  <RadioGroupIndicator data-slot="radio-group-indicator" ${staticClasses(slots["radio-group-indicator"])}>
    <slot>
      <span :class="radioGroupDotVariants({ size })" />
    </slot>
  </RadioGroupIndicator>
</RadioGroupItem>`,
  );
  return [
    group,
    item,
    barrel(
      "radio-group",
      ["RadioGroup", "RadioGroupItem"],
      `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

${exportedCva("radioGroupItemVariants", slots["radio-group-item"])}

${exportedCva("radioGroupDotVariants", slots["radio-group-indicator:dot"])}

export type RadioGroupItemVariants = VariantProps<typeof radioGroupItemVariants>;`,
    ),
  ];
}
