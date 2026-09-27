import type { Anatomy } from "@tesserai/core";
import { mapStates } from "../classes";
import { commandPieces, type CommandFlavor } from "../command";
import type { GeneratedFile } from "../render";
import { elementPart } from "./elements";
import { bitsImport, indexFile, indexParts, lucideImport, partFile, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";

// Bits' Command is cmdk's port: it marks the highlighted row data-selected and a disabled one
// data-disabled (present or absent, where cmdk writes "true" or "false"), and a group's heading
// data-command-group-heading, which the group's classes style it through.
export const BITS_COMMAND: CommandFlavor = {
  item: { ...mapStates(() => []), highlighted: ["data-selected:"], disabled: ["data-disabled:"] },
  heading: "**:[[data-command-group-heading]]:",
};

// Command on Bits' Command, laid out as shadcn-svelte's, with the React file's parts: a search row,
// the list, groups with a heading, rows and shortcuts; CommandDialog puts one in the system's Dialog.
export function commandFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = commandPieces(anatomy, BITS_COMMAND);
  const part = (file: string, name: string, extra: object = {}) =>
    partFile({ path: `command/${file}`, imports: [bitsImport("Command")], props: `CommandPrimitive.${name}Props`, tag: `CommandPrimitive.${name}`, ...extra });
  return [
    part("command.svelte", "Root", { slot: "command", classes: quoted(slots.command), bindable: { value: `""` } }),
    // A command palette in the system's own Dialog; the Command goes inside, as in React.
    svelteFile("command/command-dialog.svelte", {
      script: `import type { Dialog as DialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
${uiImport("dialog", ["Dialog", "DialogContent", "DialogDescription", "DialogHeader", "DialogTitle"])}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}

const headerClasses = "sr-only";
const contentClasses = "overflow-hidden p-0";

let {
  open = $bindable(false),
  title = "Command Palette",
  description = "Search for a command to run...",
  class: className,
  showCloseButton = false,
  children,
  ...restProps
}: WithoutChildrenOrChild<DialogPrimitive.RootProps> & { title?: string; description?: string; class?: string; showCloseButton?: boolean; children: Snippet } = $props();`,
      markup: `<Dialog bind:open {...restProps}>
  <DialogHeader class={headerClasses}>
    <DialogTitle>{title}</DialogTitle>
    <DialogDescription>{description}</DialogDescription>
  </DialogHeader>
  <DialogContent class={cn(contentClasses, className)} {showCloseButton}>
    {@render children()}
  </DialogContent>
</Dialog>`,
    }),
    // A placeholder is not a label: the field is named after it unless given its own.
    svelteFile("command/command-input.svelte", {
      script: `${bitsImport("Command")}
${lucideImport("SearchIcon")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["command-input"])};
const wrapperClasses = ${quoted(slots["command-input-wrapper"])};

let { ref = $bindable(null), value = $bindable(""), class: className, ...restProps }: CommandPrimitive.InputProps = $props();`,
      markup: `<div data-slot="command-input-wrapper" class={wrapperClasses}>
  <SearchIcon />
  <CommandPrimitive.Input bind:ref bind:value data-slot="command-input" aria-label={restProps["aria-label"] ?? restProps.placeholder ?? "Search"} class={cn(classes, className)} {...restProps} />
</div>`,
    }),
    part("command-list.svelte", "List", { slot: "command-list", classes: quoted(slots["command-list"]) }),
    part("command-empty.svelte", "Empty", { slot: "command-empty", classes: quoted(slots["command-empty"]) }),
    svelteFile("command/command-group.svelte", {
      script: `import { Command as CommandPrimitive, useId } from "bits-ui";
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["command-group"])};

let { ref = $bindable(null), class: className, heading, value, children, ...restProps }: CommandPrimitive.GroupProps & { heading?: string } = $props();`,
      markup: `<CommandPrimitive.Group bind:ref data-slot="command-group" value={value ?? heading ?? \`----\${useId()}\`} class={cn(classes, className)} {...restProps}>
  {#if heading}
    <CommandPrimitive.GroupHeading>{heading}</CommandPrimitive.GroupHeading>
  {/if}
  <CommandPrimitive.GroupItems>
    {@render children?.()}
  </CommandPrimitive.GroupItems>
</CommandPrimitive.Group>`,
    }),
    // Decorative (a listbox may hold no separator role), and hidden while searching unless
    // alwaysRender is set, as cmdk's is.
    part("command-separator.svelte", "Separator", {
      slot: "command-separator",
      classes: quoted(slots["command-separator"]),
      props: "CommandPrimitive.SeparatorProps & { alwaysRender?: boolean }",
      destructure: ["alwaysRender = false"],
      attrs: ["forceMount={alwaysRender}"],
    }),
    part("command-item.svelte", "Item", { slot: "command-item", classes: quoted(slots["command-item"]) }),
    elementPart("command/command-shortcut.svelte", "span", "command-shortcut", quoted(slots["command-shortcut"])),
    indexFile(
      "command/index.ts",
      indexParts([
        ["command.svelte", "Root", "Command"],
        ["command-dialog.svelte", "Dialog", "CommandDialog"],
        ["command-input.svelte", "Input", "CommandInput"],
        ["command-list.svelte", "List", "CommandList"],
        ["command-empty.svelte", "Empty", "CommandEmpty"],
        ["command-group.svelte", "Group", "CommandGroup"],
        ["command-separator.svelte", "Separator", "CommandSeparator"],
        ["command-item.svelte", "Item", "CommandItem"],
        ["command-shortcut.svelte", "Shortcut", "CommandShortcut"],
      ]),
    ),
  ];
}
