import type { Anatomy } from "@tesserai/core";
import { LUCIDE_PACKAGES } from "../icons";
import { dropdownMenuPieces } from "../radix/dropdown-menu";
import type { GeneratedFile } from "../render";
import { portalContent } from "./popups";
import { barrel, classList, folder, passthrough, plain, staticClasses, styled } from "./sfc";

// Dropdown Menu on Reka's parts. Reka marks rows as Radix does (data-highlighted, data-disabled,
// data-state on a checked row and an open submenu's trigger), so the classes are the Radix output's.
export function renderDropdownMenu(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = dropdownMenuPieces(anatomy);
  const f = folder("dropdown-menu");

  // A row with the inset and variant data attributes; inset is left off unless set, as in React.
  const row = (file: string, reka: string, slot: string, classes: string[], options: { variant?: boolean; chevron?: boolean; emits?: boolean }) =>
    f.file(
      file,
      `import type { ${options.emits ? `${reka}Emits, ` : ""}${reka}Props } from "reka-ui";
import type { HTMLAttributes } from "vue";
${options.chevron ? `import { ChevronRightIcon } from "${LUCIDE_PACKAGES.vue}";\n` : ""}import { reactiveOmit } from "@vueuse/core";
import { ${reka}, ${options.emits ? "useForwardPropsEmits" : "useForwardProps"} } from "reka-ui";
import { cn } from "@/lib/utils";

const props = ${options.variant ? `withDefaults(defineProps<${reka}Props & { class?: HTMLAttributes["class"]; inset?: boolean; variant?: "default" | "destructive" }>(), { variant: "default" })` : `defineProps<${reka}Props & { class?: HTMLAttributes["class"]; inset?: boolean }>()`};
${options.emits ? `const emits = defineEmits<${reka}Emits>();\n` : ""}const delegatedProps = reactiveOmit(props, "class", "inset"${options.variant ? `, "variant"` : ""});
const forwarded = ${options.emits ? "useForwardPropsEmits(delegatedProps, emits)" : "useForwardProps(delegatedProps)"};`,
      `<${reka} data-slot="${slot}" :data-inset="inset || undefined"${options.variant ? ` :data-variant="variant"` : ""} v-bind="forwarded" :class="cn(${classList(classes)}, props.class)">
  <slot />${options.chevron ? `\n  <ChevronRightIcon ${staticClasses(slots["dropdown-menu-sub-trigger:chevron"])} />` : ""}
</${reka}>`,
    );

  // Checkbox and radio rows: the indicator in the space at the row's start.
  const choice = (file: string, reka: string, slot: string, icon: string, emits: boolean) =>
    f.file(
      file,
      `import type { ${emits ? `${reka}Emits, ` : ""}${reka}Props } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { ${icon} } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { ${reka}, DropdownMenuItemIndicator, ${emits ? "useForwardPropsEmits" : "useForwardProps"} } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<${reka}Props & { class?: HTMLAttributes["class"] }>();
${emits ? `const emits = defineEmits<${reka}Emits>();\n` : ""}const delegatedProps = reactiveOmit(props, "class");
const forwarded = ${emits ? "useForwardPropsEmits(delegatedProps, emits)" : "useForwardProps(delegatedProps)"};`,
      `<${reka} data-slot="${slot}" v-bind="forwarded" :class="cn(${classList(slots[slot as "dropdown-menu-checkbox-item"])}, props.class)">
  <span ${staticClasses(slots[`${slot}:indicator` as "dropdown-menu-checkbox-item:indicator"])}>
    <DropdownMenuItemIndicator>
      <${icon}${icon === "CircleIcon" ? ` ${staticClasses(slots["dropdown-menu-radio-item:dot"])}` : ""} />
    </DropdownMenuItemIndicator>
  </span>
  <slot />
</${reka}>`,
    );

  return [
    passthrough(f, "DropdownMenu", "DropdownMenuRoot", "dropdown-menu", { emits: true, slotProps: true }),
    // Reka's portal renders no element, as Radix's doesn't: no data-slot to carry.
    passthrough(f, "DropdownMenuPortal", "DropdownMenuPortal", null),
    passthrough(f, "DropdownMenuTrigger", "DropdownMenuTrigger", "dropdown-menu-trigger"),
    portalContent(f, "DropdownMenuContent", { portal: "DropdownMenuPortal", content: "DropdownMenuContent" }, "dropdown-menu-content", classList(slots["dropdown-menu-content"]), "sideOffset: 4"),
    styled(f, "DropdownMenuSubContent", "DropdownMenuSubContent", "dropdown-menu-sub-content", classList(slots["dropdown-menu-sub-content"]), { emits: true }),
    passthrough(f, "DropdownMenuGroup", "DropdownMenuGroup", "dropdown-menu-group"),
    row("DropdownMenuLabel", "DropdownMenuLabel", "dropdown-menu-label", slots["dropdown-menu-label"], {}),
    row("DropdownMenuItem", "DropdownMenuItem", "dropdown-menu-item", slots["dropdown-menu-item"], { variant: true, emits: true }),
    choice("DropdownMenuCheckboxItem", "DropdownMenuCheckboxItem", "dropdown-menu-checkbox-item", "CheckIcon", true),
    passthrough(f, "DropdownMenuRadioGroup", "DropdownMenuRadioGroup", "dropdown-menu-radio-group", { emits: true }),
    choice("DropdownMenuRadioItem", "DropdownMenuRadioItem", "dropdown-menu-radio-item", "CircleIcon", true),
    styled(f, "DropdownMenuSeparator", "DropdownMenuSeparator", "dropdown-menu-separator", classList(slots["dropdown-menu-separator"])),
    plain(f, "DropdownMenuShortcut", "span", "dropdown-menu-shortcut", classList(slots["dropdown-menu-shortcut"])),
    passthrough(f, "DropdownMenuSub", "DropdownMenuSub", "dropdown-menu-sub", { emits: true, slotProps: true }),
    row("DropdownMenuSubTrigger", "DropdownMenuSubTrigger", "dropdown-menu-sub-trigger", slots["dropdown-menu-sub-trigger"], { chevron: true }),
    barrel("dropdown-menu", [
      "DropdownMenu",
      "DropdownMenuCheckboxItem",
      "DropdownMenuContent",
      "DropdownMenuGroup",
      "DropdownMenuItem",
      "DropdownMenuLabel",
      "DropdownMenuPortal",
      "DropdownMenuRadioGroup",
      "DropdownMenuRadioItem",
      "DropdownMenuSeparator",
      "DropdownMenuShortcut",
      "DropdownMenuSub",
      "DropdownMenuSubContent",
      "DropdownMenuSubTrigger",
      "DropdownMenuTrigger",
    ]),
  ];
}
