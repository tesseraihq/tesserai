import type { Anatomy } from "@tesserai/core";
import { q, unionType } from "../codegen";
import { buttonGroupPieces, emptyPieces, itemPieces, type LocalCva } from "../display";
import type { CvaConfig } from "../factor";
import { LUCIDE_PACKAGES } from "../icons";
import { inputGroupPieces } from "../input-group";
import { inputOtpPieces } from "../input-otp";
import type { GeneratedFile } from "../render";
import { barrel, classList, exportedCva, folder, plain, staticClasses } from "./sfc";

// Button Group, Empty, Item, Input Group and Input OTP: plain markup (Reka's Primitive where the
// React file takes asChild), and vue-input-otp, the input-otp port shadcn-vue builds on. Each
// part's classes are its pieces', as the Radix output prints them; the cvas live in index.ts.

// A cva whose axis is the component's own (an orientation, an alignment), exported as index.ts does.
const exportedLocal = (name: string, config: LocalCva) => exportedCva(name, config as unknown as CvaConfig);

const CVA_IMPORTS = `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";`;

export function renderButtonGroup(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = buttonGroupPieces(anatomy);
  const f = folder("button-group");
  const group = f.file(
    "ButtonGroup",
    `import type { HTMLAttributes } from "vue";
import type { ButtonGroupVariants } from ".";
import { cn } from "@/lib/utils";
import { buttonGroupVariants } from ".";

const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; orientation?: ButtonGroupVariants["orientation"] }>(), { orientation: "horizontal" });`,
    `<div role="group" data-slot="button-group" :data-orientation="orientation" :class="cn(buttonGroupVariants({ orientation }), props.class)">
  <slot />
</div>`,
  );
  // Text or an icon in the group, e.g. "https://" before an input.
  const text = f.file(
    "ButtonGroupText",
    `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { Primitive } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<PrimitiveProps & { class?: HTMLAttributes["class"] }>(), { as: "div" });`,
    `<Primitive data-slot="button-group-text" :as="as" :as-child="asChild" :class="cn(${classList(slots["button-group-text"])}, props.class)">
  <slot />
</Primitive>`,
  );
  const separator = f.file(
    "ButtonGroupSeparator",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; orientation?: "horizontal" | "vertical" }>(), { orientation: "vertical" });`,
    `<div role="separator" :aria-orientation="orientation" :data-orientation="orientation" data-slot="button-group-separator" :class="cn(${classList(slots["button-group-separator"])}, props.class)" />`,
  );
  const index = `${CVA_IMPORTS}

${exportedLocal("buttonGroupVariants", slots["button-group"])}

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>;`;
  return [group, separator, text, barrel("button-group", ["ButtonGroup", "ButtonGroupSeparator", "ButtonGroupText"], index)];
}

export function renderEmpty(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = emptyPieces(anatomy);
  const f = folder("empty");
  // variant="icon" puts the icon on a tile.
  const media = f.file(
    "EmptyMedia",
    `import type { HTMLAttributes } from "vue";
import type { EmptyMediaVariants } from ".";
import { cn } from "@/lib/utils";
import { emptyMediaVariants } from ".";

const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; variant?: EmptyMediaVariants["variant"] }>(), { variant: "default" });`,
    `<div data-slot="empty-icon" :data-variant="variant" :class="cn(emptyMediaVariants({ variant }), props.class)">
  <slot />
</div>`,
  );
  const index = `${CVA_IMPORTS}

${exportedLocal("emptyMediaVariants", slots["empty-icon"])}

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>;`;
  return [
    plain(f, "Empty", "div", "empty", classList(slots.empty)),
    plain(f, "EmptyHeader", "div", "empty-header", classList(slots["empty-header"])),
    media,
    plain(f, "EmptyTitle", "div", "empty-title", classList(slots["empty-title"])),
    plain(f, "EmptyDescription", "div", "empty-description", classList(slots["empty-description"])),
    plain(f, "EmptyContent", "div", "empty-content", classList(slots["empty-content"])),
    barrel("empty", ["Empty", "EmptyContent", "EmptyDescription", "EmptyHeader", "EmptyMedia", "EmptyTitle"], index),
  ];
}

// Item: a row by variant and size, with shadcn's name for the plain one; as a link (as="a", or
// as-child around a router's link) it hovers. In a group, items are list items.
export function renderItem(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, sizes, defaultVariant, defaultSize, aliases } = itemPieces(anatomy);
  const f = folder("item");
  const item = f.file(
    "Item",
    `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { ItemVariantProps } from ".";
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { cn } from "@/lib/utils";
import { injectItemGroupContext, itemVariants, resolveItemAxes } from ".";

const props = withDefaults(
  defineProps<PrimitiveProps & { class?: HTMLAttributes["class"]; variant?: ItemVariantProps["variant"]; size?: ItemVariantProps["size"] }>(),
  { as: "div", variant: undefined, size: undefined },
);
const axes = computed(() => resolveItemAxes(props.variant, props.size));
// Reka's inject throws on a missing context unless the fallback is null; an Item stands alone too.
const inGroup = injectItemGroupContext(null);`,
    `<Primitive
  data-slot="item"
  :data-variant="axes.variant"
  :data-size="axes.size"
  :role="inGroup ? 'listitem' : undefined"
  :as="as"
  :as-child="asChild"
  :class="cn(itemVariants(axes), props.class)"
>
  <slot />
</Primitive>`,
  );
  // A group is a list, so the items in it are list items.
  const group = f.file(
    "ItemGroup",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { provideItemGroupContext } from ".";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
provideItemGroupContext(true);`,
    `<div role="list" data-slot="item-group" :class="cn(${classList(slots["item-group"])}, props.class)">
  <slot />
</div>`,
  );
  // variant="icon" sizes an icon; variant="image" crops a picture to a square.
  const media = f.file(
    "ItemMedia",
    `import type { HTMLAttributes } from "vue";
import type { ItemMediaVariants } from ".";
import { cn } from "@/lib/utils";
import { itemMediaVariants } from ".";

const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; variant?: ItemMediaVariants["variant"] }>(), { variant: "default" });`,
    `<div data-slot="item-media" :data-variant="variant" :class="cn(itemMediaVariants({ variant }), props.class)">
  <slot />
</div>`,
  );
  const index = `${CVA_IMPORTS}
import { createContext } from "reka-ui";

${exportedCva("itemVariants", slots.item)}

${exportedLocal("itemMediaVariants", slots["item-media"])}

type Variant = ${unionType(variants)};
type Size = ${unionType(sizes)};
// shadcn's names keep working.
const aliases = { ${aliases.map(([n, v]) => `${q(n)}: ${q(v)}`).join(", ")} } as const;
type Alias = keyof typeof aliases;

export type ItemVariantProps = { variant?: Variant | Alias | undefined; size?: Size | "default" | undefined };
export type ItemVariants = VariantProps<typeof itemVariants>;
export type ItemMediaVariants = VariantProps<typeof itemMediaVariants>;

// The variant and size an item's props come to; Item writes them as data attributes.
export function resolveItemAxes(variant: Variant | Alias | undefined, size: Size | "default" | undefined) {
  const v = variant === undefined ? ${q(defaultVariant)} : variant in aliases ? aliases[variant as Alias] : (variant as Variant);
  return { variant: v, size: size === undefined || size === "default" ? ${q(defaultSize)} : size };
}

// Whether an item sits in an ItemGroup.
export const [injectItemGroupContext, provideItemGroupContext] = createContext<boolean>("ItemGroup");`;
  return [
    item,
    media,
    plain(f, "ItemContent", "div", "item-content", classList(slots["item-content"])),
    plain(f, "ItemTitle", "div", "item-title", classList(slots["item-title"])),
    plain(f, "ItemDescription", "p", "item-description", classList(slots["item-description"])),
    plain(f, "ItemActions", "div", "item-actions", classList(slots["item-actions"])),
    group,
    // Decorative: it sits between list items, where only items belong.
    plain(f, "ItemSeparator", "div", "item-separator", classList(slots["item-separator"]), `role="none" data-orientation="horizontal"`),
    plain(f, "ItemHeader", "div", "item-header", classList(slots["item-header"])),
    plain(f, "ItemFooter", "div", "item-footer", classList(slots["item-footer"])),
    barrel("item", ["Item", "ItemActions", "ItemContent", "ItemDescription", "ItemFooter", "ItemGroup", "ItemHeader", "ItemMedia", "ItemSeparator", "ItemTitle"], index),
  ];
}

// The v-model wiring of tesserai's plain inputs: modelValue and update:modelValue, or defaultValue
// left to the element.
const V_MODEL = `const emits = defineEmits<{ (e: "update:modelValue", payload: string | number): void }>();
const modelValue = useVModel(props, "modelValue", emits, { passive: true, defaultValue: props.defaultValue });`;

// Input Group: its control and button are parts of its own, bare inside the group (see the React
// template). Clicking an addon (outside a button in it) focuses the control.
export function renderInputGroup(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = inputGroupPieces(anatomy);
  const f = folder("input-group");
  const control = slots["input-group-control"];
  const addon = f.file(
    "InputGroupAddon",
    `import type { HTMLAttributes } from "vue";
import type { InputGroupVariants } from ".";
import { cn } from "@/lib/utils";
import { inputGroupAddonVariants } from ".";

const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; align?: InputGroupVariants["align"] }>(), { align: "inline-start" });

function focusControl(event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest("button") !== null) return;
  const control = (event.currentTarget as HTMLElement).parentElement?.querySelector("input, textarea");
  if (control instanceof HTMLElement) control.focus();
}`,
    `<div role="group" data-slot="input-group-addon" :data-align="align" :class="cn(inputGroupAddonVariants({ align }), props.class)" @click="focusControl">
  <slot />
</div>`,
  );
  const button = f.file(
    "InputGroupButton",
    `import type { HTMLAttributes } from "vue";
import type { InputGroupButtonVariants } from ".";
import { cn } from "@/lib/utils";
import { inputGroupButtonVariants } from ".";

const props = withDefaults(
  defineProps<{ class?: HTMLAttributes["class"]; size?: InputGroupButtonVariants["size"]; type?: "button" | "submit" | "reset" }>(),
  { size: "xs", type: "button" },
);`,
    `<button :type="type" data-slot="input-group-button" :data-size="size" :class="cn(inputGroupButtonVariants({ size }), props.class)">
  <slot />
</button>`,
  );
  const text = f.file(
    "InputGroupText",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<span :class="cn(${classList(slots["input-group-addon:text"])}, props.class)">
  <slot />
</span>`,
  );
  const field = (name: string, tag: "input" | "textarea", classes: string) =>
    f.file(
      name,
      `import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { cn } from "@/lib/utils";

const props = defineProps<{ defaultValue?: string | number; modelValue?: string | number; class?: HTMLAttributes["class"] }>();
${V_MODEL}`,
      `<${tag} v-model="modelValue" data-slot="input-group-control" :class="cn(${classes}, props.class)" />`,
    );
  const index = `${CVA_IMPORTS}

${exportedLocal("inputGroupAddonVariants", slots["input-group-addon"])}

${exportedLocal("inputGroupButtonVariants", slots["input-group-button"])}

export type InputGroupVariants = VariantProps<typeof inputGroupAddonVariants>;
export type InputGroupButtonVariants = VariantProps<typeof inputGroupButtonVariants>;`;
  return [
    plain(f, "InputGroup", "div", "input-group", classList(slots["input-group"]), `role="group"`),
    addon,
    button,
    text,
    field("InputGroupInput", "input", classList(control)),
    field("InputGroupTextarea", "textarea", `${classList(control)}, ${classList(slots["input-group-control:textarea"].slice(control.length))}`),
    barrel("input-group", ["InputGroup", "InputGroupAddon", "InputGroupButton", "InputGroupInput", "InputGroupText", "InputGroupTextarea"], index),
  ];
}

// Input OTP on vue-input-otp, as shadcn-vue's. As in the React file, class goes to the input the
// code is typed into and container-class to the row of slots; v-model and maxlength are
// vue-input-otp's. Each slot reads its character from the input's context by index.
export function renderInputOtp(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = inputOtpPieces(anatomy);
  const f = folder("input-otp");
  const root = f.file(
    "InputOTP",
    `import type { HTMLAttributes } from "vue";
import type { OTPInputEmits, OTPInputProps } from "vue-input-otp";
import { reactiveOmit } from "@vueuse/core";
import { useForwardPropsEmits } from "reka-ui";
import { OTPInput } from "vue-input-otp";
import { cn } from "@/lib/utils";

const props = defineProps<OTPInputProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<OTPInputEmits>();
const delegatedProps = reactiveOmit(props, "class", "containerClass");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<OTPInput
  v-slot="slotProps"
  v-bind="forwarded"
  data-slot="input-otp"
  :container-class="cn(${classList(slots["input-otp:container"])}, props.containerClass)"
  :spellcheck="false"
  :class="cn(${classList(slots["input-otp"])}, props.class)"
>
  <slot v-bind="slotProps" />
</OTPInput>`,
  );
  const slot = f.file(
    "InputOTPSlot",
    `import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { useVueOTPContext } from "vue-input-otp";
import { cn } from "@/lib/utils";

const props = defineProps<{ index: number; class?: HTMLAttributes["class"] }>();
const context = useVueOTPContext();
const slot = computed(() => context?.value.slots[props.index]);`,
    `<div data-slot="input-otp-slot" :data-active="slot?.isActive ?? false" :class="cn(${classList(slots["input-otp-slot"])}, props.class)">
  {{ slot?.char }}
  <div v-if="slot?.hasFakeCaret" ${staticClasses(slots["input-otp-slot:caret-box"])}>
    <div ${staticClasses(slots["input-otp-slot:caret"])} />
  </div>
</div>`,
  );
  const separator = f.file(
    "InputOTPSeparator",
    `import type { HTMLAttributes } from "vue";
import { MinusIcon } from "${LUCIDE_PACKAGES.vue}";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<div data-slot="input-otp-separator" role="separator" :class="cn(${classList(slots["input-otp-separator"])}, props.class)">
  <slot>
    <MinusIcon />
  </slot>
</div>`,
  );
  return [
    root,
    plain(f, "InputOTPGroup", "div", "input-otp-group", classList(slots["input-otp-group"])),
    slot,
    separator,
    barrel("input-otp", ["InputOTP", "InputOTPGroup", "InputOTPSeparator", "InputOTPSlot"]),
  ];
}
