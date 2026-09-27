import type { Anatomy } from "@tesserai/core";
import { modalClasses } from "../modal";
import type { GeneratedFile } from "../render";
import { attributesOf } from "./elements";
import { indexFile, indexParts, lucideImport, partFile, svelteFile, uiImport, UTILS_IMPORT, type PartFile } from "./emit";

const DIV = attributesOf("div");

// A Bits part of a modal, and its plain div parts (header, footer, media).
function parts(folder: string, namespace: string, local: string) {
  const bits = `import { ${namespace} as ${local} } from "bits-ui";`;
  return {
    bits,
    primitive: (file: string, part: string, extra: Partial<PartFile> = {}) => partFile({ path: `${folder}/${file}`, imports: [bits], props: `${local}.${part}Props`, tag: `${local}.${part}`, ...extra }),
    div: (file: string, slot: string, classes: string) =>
      partFile({ path: `${folder}/${file}`, imports: [DIV.import], utils: ["type WithElementRef"], props: `WithElementRef<${DIV.type}>`, tag: "div", element: true, slot, classes }),
  };
}

// Alert Dialog on Bits, with the classes and slots of the Radix output. Its content is a cva by size;
// Action and Cancel close it and render as the system's Button (Bits' child snippet, React's asChild).
export function alertDialogFiles(anatomy: Anatomy): GeneratedFile[] {
  const c = modalClasses(anatomy, "alert-dialog", "bits-ui");
  const { bits, primitive, div } = parts("alert-dialog", "AlertDialog", "AlertDialogPrimitive");
  const closer = (file: string, part: "Action" | "Cancel", slot: string) =>
    svelteFile(`alert-dialog/${file}`, {
      script: `${bits}
${uiImport("button", ["Button", "type ButtonVariantProps"])}

let {
  ref = $bindable(null),
  class: className,
  variant${part === "Cancel" ? ` = "outline"` : ""},
  size,
  intent,
  children,
  ...restProps
}: AlertDialogPrimitive.${part}Props & ButtonVariantProps = $props();`,
      markup: `<AlertDialogPrimitive.${part} bind:ref data-slot="${slot}" {...restProps}>
  {#snippet child({ props })}
    <Button {...props} {variant} {size} {intent} class={className}>
      {@render children?.()}
    </Button>
  {/snippet}
</AlertDialogPrimitive.${part}>`,
    });
  return [
    primitive("alert-dialog.svelte", "Root", { ref: false, bindable: { open: "false" } }),
    primitive("alert-dialog-trigger.svelte", "Trigger", { slot: "alert-dialog-trigger" }),
    primitive("alert-dialog-portal.svelte", "Portal", { ref: false }),
    primitive("alert-dialog-overlay.svelte", "Overlay", { slot: "alert-dialog-overlay", classes: c.backdrop }),
    svelteFile("alert-dialog/alert-dialog-content.svelte", {
      module: `import { cva } from "class-variance-authority";

${c.popupCva}

export type AlertDialogContentSize = ${c.sizes};`,
      script: `${bits}
import type { ComponentProps } from "svelte";
${UTILS_IMPORT(["cn", "type WithoutChild", "type WithoutChildrenOrChild"])}
import AlertDialogOverlay from "./alert-dialog-overlay.svelte";
import AlertDialogPortal from "./alert-dialog-portal.svelte";

let {
  ref = $bindable(null),
  class: className,
  size = ${c.defaultSize},
  portalProps,
  ...restProps
}: WithoutChild<AlertDialogPrimitive.ContentProps> & {
  size?: AlertDialogContentSize | undefined;
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof AlertDialogPortal>>;
} = $props();`,
      markup: `<AlertDialogPortal {...portalProps}>
  <AlertDialogOverlay />
  <AlertDialogPrimitive.Content bind:ref data-slot="alert-dialog-content" data-size={size} class={cn(alertDialogContentVariants({ size }), className)} {...restProps} />
</AlertDialogPortal>`,
    }),
    div("alert-dialog-header.svelte", "alert-dialog-header", c.header),
    div("alert-dialog-footer.svelte", "alert-dialog-footer", c.footer),
    div("alert-dialog-media.svelte", "alert-dialog-media", c.media),
    primitive("alert-dialog-title.svelte", "Title", { slot: "alert-dialog-title", classes: c.title }),
    primitive("alert-dialog-description.svelte", "Description", { slot: "alert-dialog-description", classes: c.description }),
    closer("alert-dialog-action.svelte", "Action", "alert-dialog-action"),
    closer("alert-dialog-cancel.svelte", "Cancel", "alert-dialog-cancel"),
    indexFile(
      "alert-dialog/index.ts",
      indexParts([
        ["alert-dialog.svelte", "Root", "AlertDialog"],
        ["alert-dialog-trigger.svelte", "Trigger", "AlertDialogTrigger"],
        ["alert-dialog-portal.svelte", "Portal", "AlertDialogPortal"],
        ["alert-dialog-overlay.svelte", "Overlay", "AlertDialogOverlay"],
        ["alert-dialog-content.svelte", "Content", "AlertDialogContent"],
        ["alert-dialog-header.svelte", "Header", "AlertDialogHeader"],
        ["alert-dialog-footer.svelte", "Footer", "AlertDialogFooter"],
        ["alert-dialog-media.svelte", "Media", "AlertDialogMedia"],
        ["alert-dialog-title.svelte", "Title", "AlertDialogTitle"],
        ["alert-dialog-description.svelte", "Description", "AlertDialogDescription"],
        ["alert-dialog-action.svelte", "Action", "AlertDialogAction"],
        ["alert-dialog-cancel.svelte", "Cancel", "AlertDialogCancel"],
      ]),
    ),
  ];
}

// Sheet: Bits' Dialog on a side, which data-side names, with the Radix output's classes and slots.
export function sheetFiles(anatomy: Anatomy): GeneratedFile[] {
  const c = modalClasses(anatomy, "sheet", "bits-ui");
  const { bits, primitive, div } = parts("sheet", "Dialog", "SheetPrimitive");
  return [
    primitive("sheet.svelte", "Root", { ref: false, bindable: { open: "false" } }),
    primitive("sheet-trigger.svelte", "Trigger", { slot: "sheet-trigger" }),
    primitive("sheet-close.svelte", "Close", { slot: "sheet-close" }),
    primitive("sheet-portal.svelte", "Portal", { ref: false }),
    primitive("sheet-overlay.svelte", "Overlay", { slot: "sheet-overlay", classes: c.backdrop }),
    svelteFile("sheet/sheet-content.svelte", {
      module: `export type SheetSide = "top" | "right" | "bottom" | "left";`,
      script: `${bits}
import type { ComponentProps, Snippet } from "svelte";
${lucideImport("XIcon")}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import SheetOverlay from "./sheet-overlay.svelte";
import SheetPortal from "./sheet-portal.svelte";

const classes = ${c.popup};
const closeClasses = ${c.close};
const labelClasses = "sr-only";

let {
  ref = $bindable(null),
  class: className,
  side = "right",
  showCloseButton = true,
  portalProps,
  children,
  ...restProps
}: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
  side?: SheetSide | undefined;
  showCloseButton?: boolean | undefined;
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SheetPortal>>;
  children?: Snippet;
} = $props();`,
      markup: `<SheetPortal {...portalProps}>
  <SheetOverlay />
  <SheetPrimitive.Content bind:ref data-slot="sheet-content" data-side={side} class={cn(classes, className)} {...restProps}>
    {@render children?.()}
    {#if showCloseButton}
      <SheetPrimitive.Close data-slot="sheet-close" class={closeClasses}>
        <XIcon aria-hidden="true" />
        <span class={labelClasses}>Close</span>
      </SheetPrimitive.Close>
    {/if}
  </SheetPrimitive.Content>
</SheetPortal>`,
    }),
    div("sheet-header.svelte", "sheet-header", c.header),
    div("sheet-footer.svelte", "sheet-footer", c.footer),
    primitive("sheet-title.svelte", "Title", { slot: "sheet-title", classes: c.title }),
    primitive("sheet-description.svelte", "Description", { slot: "sheet-description", classes: c.description }),
    indexFile(
      "sheet/index.ts",
      indexParts([
        ["sheet.svelte", "Root", "Sheet"],
        ["sheet-trigger.svelte", "Trigger", "SheetTrigger"],
        ["sheet-close.svelte", "Close", "SheetClose"],
        ["sheet-portal.svelte", "Portal", "SheetPortal"],
        ["sheet-overlay.svelte", "Overlay", "SheetOverlay"],
        ["sheet-content.svelte", "Content", "SheetContent"],
        ["sheet-header.svelte", "Header", "SheetHeader"],
        ["sheet-footer.svelte", "Footer", "SheetFooter"],
        ["sheet-title.svelte", "Title", "SheetTitle"],
        ["sheet-description.svelte", "Description", "SheetDescription"],
      ]),
    ),
  ];
}
