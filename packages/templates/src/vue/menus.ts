import type { Anatomy } from "@tesserai/core";
import { LUCIDE_PACKAGES } from "../icons";
import { contextMenuPieces } from "../radix/context-menu";
import { menubarPieces } from "../radix/menubar";
import type { GeneratedFile } from "../render";
import { portalContent } from "./popups";
import { barrel, classList, folder, passthrough, plain, staticClasses, styled, type Folder } from "./sfc";

// Context Menu and Menubar on Reka's parts. Reka marks rows as Radix does (data-highlighted,
// data-disabled, data-state on a checked row and an open submenu's trigger), so the classes are the
// Radix output's. Their rows are the same set as Dropdown Menu's, under each menu's prefix.

type Slots = Record<string, string[]>;

// The rows every menu shares: `P` is the prefix of the part names (ContextMenu), `slot` of the
// data-slots (context-menu).
function menuRows(f: Folder, P: string, slot: string, slots: Slots): GeneratedFile[] {
  // A row with the inset and variant data attributes; inset is left off unless set, as in React.
  const row = (part: string, classes: string[], options: { variant?: boolean; chevron?: boolean; emits?: boolean }) => {
    const reka = `${P}${part}`;
    return f.file(
      reka,
      `import type { ${options.emits ? `${reka}Emits, ` : ""}${reka}Props } from "reka-ui";
import type { HTMLAttributes } from "vue";
${options.chevron ? `import { ChevronRightIcon } from "${LUCIDE_PACKAGES.vue}";\n` : ""}import { reactiveOmit } from "@vueuse/core";
import { ${reka}, ${options.emits ? "useForwardPropsEmits" : "useForwardProps"} } from "reka-ui";
import { cn } from "@/lib/utils";

const props = ${options.variant ? `withDefaults(defineProps<${reka}Props & { class?: HTMLAttributes["class"]; inset?: boolean; variant?: "default" | "destructive" }>(), { variant: "default" })` : `defineProps<${reka}Props & { class?: HTMLAttributes["class"]; inset?: boolean }>()`};
${options.emits ? `const emits = defineEmits<${reka}Emits>();\n` : ""}const delegatedProps = reactiveOmit(props, "class", "inset"${options.variant ? `, "variant"` : ""});
const forwarded = ${options.emits ? "useForwardPropsEmits(delegatedProps, emits)" : "useForwardProps(delegatedProps)"};`,
      `<${reka} data-slot="${slot}-${kebab(part)}" :data-inset="inset || undefined"${options.variant ? ` :data-variant="variant"` : ""} v-bind="forwarded" :class="cn(${classList(classes)}, props.class)">
  <slot />${options.chevron ? `\n  <ChevronRightIcon ${staticClasses(slots[`${slot}-sub-trigger:chevron`]!)} />` : ""}
</${reka}>`,
    );
  };

  // Checkbox and radio rows: the indicator in the space at the row's start.
  const choice = (part: "CheckboxItem" | "RadioItem", icon: string) => {
    const reka = `${P}${part}`;
    const s = `${slot}-${kebab(part)}`;
    return f.file(
      reka,
      `import type { ${reka}Emits, ${reka}Props } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { ${icon} } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { ${reka}, ${P}ItemIndicator, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<${reka}Props & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<${reka}Emits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
      `<${reka} data-slot="${s}" v-bind="forwarded" :class="cn(${classList(slots[s]!)}, props.class)">
  <span ${staticClasses(slots[`${s}:indicator`]!)}>
    <${P}ItemIndicator>
      <${icon}${icon === "CircleIcon" ? ` ${staticClasses(slots[`${slot}-radio-item:dot`]!)}` : ""} />
    </${P}ItemIndicator>
  </span>
  <slot />
</${reka}>`,
    );
  };

  return [
    styled(f, `${P}SubContent`, `${P}SubContent`, `${slot}-sub-content`, classList(slots[`${slot}-sub-content`]!), { emits: true }),
    passthrough(f, `${P}Group`, `${P}Group`, `${slot}-group`),
    row("Label", slots[`${slot}-label`]!, {}),
    row("Item", slots[`${slot}-item`]!, { variant: true, emits: true }),
    choice("CheckboxItem", "CheckIcon"),
    passthrough(f, `${P}RadioGroup`, `${P}RadioGroup`, `${slot}-radio-group`, { emits: true }),
    choice("RadioItem", "CircleIcon"),
    styled(f, `${P}Separator`, `${P}Separator`, `${slot}-separator`, classList(slots[`${slot}-separator`]!)),
    plain(f, `${P}Shortcut`, "span", `${slot}-shortcut`, classList(slots[`${slot}-shortcut`]!)),
    passthrough(f, `${P}Sub`, `${P}Sub`, `${slot}-sub`, { emits: true, slotProps: true }),
    row("SubTrigger", slots[`${slot}-sub-trigger`]!, { chevron: true }),
  ];
}

const kebab = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const ROW_PARTS = ["CheckboxItem", "Group", "Item", "Label", "RadioGroup", "RadioItem", "Separator", "Shortcut", "Sub", "SubContent", "SubTrigger"];

// Right-click (or long-press) an area for its menu, which opens at the pointer.
export function renderContextMenu(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = contextMenuPieces(anatomy);
  const f = folder("context-menu");
  return [
    passthrough(f, "ContextMenu", "ContextMenuRoot", "context-menu", { emits: true, slotProps: true }),
    styled(f, "ContextMenuTrigger", "ContextMenuTrigger", "context-menu-trigger", classList(slots["context-menu-trigger"])),
    // Reka's portal renders no element, as Radix's doesn't: no data-slot to carry.
    passthrough(f, "ContextMenuPortal", "ContextMenuPortal", null),
    // Positioned at the pointer, so it takes no side or offset.
    portalContent(f, "ContextMenuContent", { portal: "ContextMenuPortal", content: "ContextMenuContent" }, "context-menu-content", classList(slots["context-menu-content"]), ""),
    ...menuRows(f, "ContextMenu", "context-menu", slots),
    barrel("context-menu", ["ContextMenu", "ContextMenuContent", "ContextMenuPortal", "ContextMenuTrigger", ...ROW_PARTS.map((p) => `ContextMenu${p}`)]),
  ];
}

// An app's menu bar: each MenubarMenu is a trigger in the bar and the menu it opens.
export function renderMenubar(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = menubarPieces(anatomy);
  const f = folder("menubar");
  // Opens under its trigger, aligned to its start, as in React.
  const content = f.file(
    "MenubarContent",
    `import type { MenubarContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { MenubarContent, MenubarPortal, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<MenubarContentProps & { class?: HTMLAttributes["class"] }>(), { align: "start", alignOffset: -4, sideOffset: 8 });
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);`,
    `<MenubarPortal>
  <MenubarContent data-slot="menubar-content" v-bind="{ ...$attrs, ...forwarded }" :class="cn(${classList(slots["menubar-content"])}, props.class)">
    <slot />
  </MenubarContent>
</MenubarPortal>`,
  );
  return [
    styled(f, "Menubar", "MenubarRoot", "menubar", classList(slots.menubar), { emits: true }),
    passthrough(f, "MenubarMenu", "MenubarMenu", "menubar-menu"),
    passthrough(f, "MenubarPortal", "MenubarPortal", null),
    styled(f, "MenubarTrigger", "MenubarTrigger", "menubar-trigger", classList(slots["menubar-trigger"])),
    content,
    ...menuRows(f, "Menubar", "menubar", slots),
    barrel("menubar", ["Menubar", "MenubarContent", "MenubarMenu", "MenubarPortal", "MenubarTrigger", ...ROW_PARTS.map((p) => `Menubar${p}`)]),
  ];
}
