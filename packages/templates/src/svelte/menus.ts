import type { Anatomy } from "@tesserai/core";
import { contextMenuPieces } from "../radix/context-menu";
import { RADIX_MENU_MOTION } from "../radix/dropdown-menu";
import { menubarPieces } from "../radix/menubar";
import type { GeneratedFile } from "../render";
import { elementPart } from "./elements";
import { bitsImport, indexFile, indexParts, lucideImport, partFile, quoted, svelteFile, UTILS_IMPORT, type PartFile } from "./emit";

// Context Menu and Menubar on Bits. Their rows are Dropdown Menu's (Bits' menu parts, marked as
// Radix marks them: data-highlighted, data-disabled, data-state=open on a submenu's trigger), under
// each menu's prefix; a label is a plain div, as in shadcn-svelte, with Bits' GroupHeading beside it.

type Slots = Record<string, string[]>;

// A Bits part of the menu `namespace` (ContextMenu), in `folder`.
function primitives(folder: string, namespace: string) {
  const local = `${namespace}Primitive`;
  return (file: string, part: string, extra: Partial<PartFile> = {}) =>
    partFile({ path: `${folder}/${file}`, imports: [bitsImport(namespace)], props: `${local}.${part}Props`, tag: `${local}.${part}`, ...extra });
}

// The floating panel in its portal (portalProps={{ disabled: true }} renders it in place), with the
// React file's defaults.
function menuContent(folder: string, namespace: string, slot: string, classes: string[], defaults: Record<string, string>): GeneratedFile {
  const local = `${namespace}Primitive`;
  const Portal = `${namespace}Portal`;
  const props = Object.entries(defaults);
  return svelteFile(`${folder}/${folder}-content.svelte`, {
    script: `${bitsImport(namespace)}
import type { ComponentProps } from "svelte";
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import ${Portal} from "./${folder}-portal.svelte";

const classes = ${quoted(classes)};

let {
  ref = $bindable(null),
  class: className,
${props.map(([name, value]) => `  ${name} = ${value},`).join("\n")}
  portalProps,
  ...restProps
}: ${local}.ContentProps & {
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof ${Portal}>>;
} = $props();`,
    markup: `<${Portal} {...portalProps}>
  <${local}.Content bind:ref data-slot="${slot}"${props.map(([name]) => ` {${name}}`).join("")} class={cn(classes, className)} {...restProps} />
</${Portal}>`,
  });
}

// The rows, their index entries by short and full name (P is the full names' prefix: ContextMenu).
function menuRows(folder: string, namespace: string, P: string, slot: string, slots: Slots): { files: GeneratedFile[]; index: [string, string, string][] } {
  const local = `${namespace}Primitive`;
  const part = primitives(folder, namespace);
  const inset = { destructure: ["inset"], attrs: ["data-inset={inset}"] };
  const insetProps = (props: string) => `${props} & { inset?: boolean | undefined }`;
  const choice = (file: string, bitsPart: "CheckboxItem" | "RadioItem", s: string, bind: string[], state: string, icon: string, iconClasses: string | null) =>
    svelteFile(`${folder}/${file}`, {
      script: `${bitsImport(namespace)}
${lucideImport(icon)}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import type { Snippet } from "svelte";

const classes = ${quoted(slots[s]!)};
const indicatorClasses = ${quoted(slots[`${s}:indicator`]!)};
${iconClasses === null ? "" : `const iconClasses = ${iconClasses};\n`}
let {
  ref = $bindable(null),
${bind.map((b) => `  ${b} = $bindable(false),`).join("\n")}
  class: className,
  children: childrenProp,
  ...restProps
}: WithoutChildrenOrChild<${local}.${bitsPart}Props> & { children?: Snippet } = $props();`,
      markup: `<${local}.${bitsPart} bind:ref ${bind.map((b) => `bind:${b}`).join(" ")} data-slot="${s}" class={cn(classes, className)} {...restProps}>
  {#snippet children({ ${bind.length === 0 ? "checked" : bind.join(", ")} })}
    <span class={indicatorClasses}>
      {#if ${state === "checkbox" ? "checked || indeterminate" : "checked"}}
        <span data-state=${state === "checkbox" ? `{indeterminate ? "indeterminate" : "checked"}` : `"checked"`}>
          <${icon} ${iconClasses === null ? "" : "class={iconClasses} "}/>
        </span>
      {/if}
    </span>
    {@render childrenProp?.()}
  {/snippet}
</${local}.${bitsPart}>`,
    });
  const files = [
    part(`${folder}-sub-content.svelte`, "SubContent", { slot: `${slot}-sub-content`, classes: quoted(slots[`${slot}-sub-content`]!) }),
    part(`${folder}-group.svelte`, "Group", { slot: `${slot}-group` }),
    elementPart(`${folder}/${folder}-label.svelte`, "div", `${slot}-label`, quoted(slots[`${slot}-label`]!), { propsExtra: "{ inset?: boolean | undefined }", ...inset }),
    part(`${folder}-group-heading.svelte`, "GroupHeading", { slot: `${slot}-group-heading`, classes: quoted(slots[`${slot}-label`]!), props: insetProps(`${local}.GroupHeadingProps`), ...inset }),
    part(`${folder}-item.svelte`, "Item", {
      slot: `${slot}-item`,
      classes: quoted(slots[`${slot}-item`]!),
      props: `${local}.ItemProps & { inset?: boolean | undefined; variant?: "default" | "destructive" | undefined }`,
      destructure: ["inset", `variant = "default"`],
      attrs: ["data-inset={inset}", "data-variant={variant}"],
    }),
    choice(`${folder}-checkbox-item.svelte`, "CheckboxItem", `${slot}-checkbox-item`, ["checked", "indeterminate"], "checkbox", "CheckIcon", null),
    part(`${folder}-checkbox-group.svelte`, "CheckboxGroup", { slot: `${slot}-checkbox-group`, bindable: { value: "[]" } }),
    part(`${folder}-radio-group.svelte`, "RadioGroup", { slot: `${slot}-radio-group`, bindable: { value: `""` } }),
    choice(`${folder}-radio-item.svelte`, "RadioItem", `${slot}-radio-item`, [], "radio", "CircleIcon", quoted(slots[`${slot}-radio-item:dot`]!)),
    part(`${folder}-separator.svelte`, "Separator", { slot: `${slot}-separator`, classes: quoted(slots[`${slot}-separator`]!) }),
    elementPart(`${folder}/${folder}-shortcut.svelte`, "span", `${slot}-shortcut`, quoted(slots[`${slot}-shortcut`]!)),
    part(`${folder}-sub.svelte`, "Sub", { ref: false, bindable: { open: "false" } }),
    svelteFile(`${folder}/${folder}-sub-trigger.svelte`, {
      script: `${bitsImport(namespace)}
${lucideImport("ChevronRightIcon")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots[`${slot}-sub-trigger`]!)};
const chevronClasses = ${quoted(slots[`${slot}-sub-trigger:chevron`]!)};

let { ref = $bindable(null), class: className, inset, children, ...restProps }: ${insetProps(`${local}.SubTriggerProps`)} = $props();`,
      markup: `<${local}.SubTrigger bind:ref data-slot="${slot}-sub-trigger" data-inset={inset} class={cn(classes, className)} {...restProps}>
  {@render children?.()}
  <ChevronRightIcon class={chevronClasses} />
</${local}.SubTrigger>`,
    }),
  ];
  const index: [string, string, string][] = [
    [`${folder}-group.svelte`, "Group", `${P}Group`],
    [`${folder}-label.svelte`, "Label", `${P}Label`],
    [`${folder}-group-heading.svelte`, "GroupHeading", `${P}GroupHeading`],
    [`${folder}-item.svelte`, "Item", `${P}Item`],
    [`${folder}-checkbox-item.svelte`, "CheckboxItem", `${P}CheckboxItem`],
    [`${folder}-checkbox-group.svelte`, "CheckboxGroup", `${P}CheckboxGroup`],
    [`${folder}-radio-group.svelte`, "RadioGroup", `${P}RadioGroup`],
    [`${folder}-radio-item.svelte`, "RadioItem", `${P}RadioItem`],
    [`${folder}-separator.svelte`, "Separator", `${P}Separator`],
    [`${folder}-shortcut.svelte`, "Shortcut", `${P}Shortcut`],
    [`${folder}-sub.svelte`, "Sub", `${P}Sub`],
    [`${folder}-sub-trigger.svelte`, "SubTrigger", `${P}SubTrigger`],
    [`${folder}-sub-content.svelte`, "SubContent", `${P}SubContent`],
  ];
  return { files, index };
}

// Right-click (or long-press) an area for its menu, which opens at the pointer.
export function contextMenuFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = contextMenuPieces(anatomy, { motion: RADIX_MENU_MOTION });
  const part = primitives("context-menu", "ContextMenu");
  const rows = menuRows("context-menu", "ContextMenu", "ContextMenu", "context-menu", slots);
  return [
    part("context-menu.svelte", "Root", { ref: false, bindable: { open: "false" } }),
    part("context-menu-portal.svelte", "Portal", { ref: false }),
    // An inline span, as Radix's trigger is (Bits' is a div), unless the page gives its own element
    // through the child snippet.
    svelteFile("context-menu/context-menu-trigger.svelte", {
      script: `${bitsImport("ContextMenu")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["context-menu-trigger"])};

let { ref = $bindable(null), class: className, child: childProp, children, ...restProps }: ContextMenuPrimitive.TriggerProps = $props();`,
      markup: `<ContextMenuPrimitive.Trigger bind:ref data-slot="context-menu-trigger" class={cn(classes, className)} {...restProps}>
  {#snippet child({ props })}
    {#if childProp}
      {@render childProp({ props })}
    {:else}
      <span {...props}>{@render children?.()}</span>
    {/if}
  {/snippet}
</ContextMenuPrimitive.Trigger>`,
    }),
    // Positioned at the pointer, so it takes no side or offset.
    menuContent("context-menu", "ContextMenu", "context-menu-content", slots["context-menu-content"], {}),
    ...rows.files,
    indexFile(
      "context-menu/index.ts",
      indexParts([
        ["context-menu.svelte", "Root", "ContextMenu"],
        ["context-menu-portal.svelte", "Portal", "ContextMenuPortal"],
        ["context-menu-trigger.svelte", "Trigger", "ContextMenuTrigger"],
        ["context-menu-content.svelte", "Content", "ContextMenuContent"],
        ...rows.index,
      ]),
    ),
  ];
}

// An app's menu bar: each Menu is a trigger in the bar and the menu it opens.
export function menubarFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = menubarPieces(anatomy, { motion: RADIX_MENU_MOTION });
  const part = primitives("menubar", "Menubar");
  const rows = menuRows("menubar", "Menubar", "Menubar", "menubar", slots);
  return [
    part("menubar.svelte", "Root", { slot: "menubar", classes: quoted(slots.menubar), bindable: { value: `""` } }),
    // Renders no element of its own, as Radix's doesn't: no data-slot to carry.
    part("menubar-menu.svelte", "Menu", { ref: false }),
    part("menubar-portal.svelte", "Portal", { ref: false }),
    part("menubar-trigger.svelte", "Trigger", { slot: "menubar-trigger", classes: quoted(slots["menubar-trigger"]) }),
    // Opens under its trigger, aligned to its start, as in React.
    menuContent("menubar", "Menubar", "menubar-content", slots["menubar-content"], { align: `"start"`, alignOffset: "-4", sideOffset: "8" }),
    ...rows.files,
    indexFile(
      "menubar/index.ts",
      indexParts([
        ["menubar.svelte", "Root", "Menubar"],
        ["menubar-menu.svelte", "Menu", "MenubarMenu"],
        ["menubar-portal.svelte", "Portal", "MenubarPortal"],
        ["menubar-trigger.svelte", "Trigger", "MenubarTrigger"],
        ["menubar-content.svelte", "Content", "MenubarContent"],
        ...rows.index,
      ]),
    ),
  ];
}
