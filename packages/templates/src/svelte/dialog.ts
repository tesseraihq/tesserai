import type { Anatomy } from "@tesserai/core";
import { modalClasses } from "../modal";
import type { GeneratedFile } from "../render";
import { indexFile, lucideImport, partFile, UTILS_IMPORT, type PartFile } from "./emit";

const BITS = `import { Dialog as DialogPrimitive } from "bits-ui";`;
const DIV_PROPS = `WithElementRef<HTMLAttributes<HTMLDivElement>>`;
const DIV_IMPORTS = [`import type { HTMLAttributes } from "svelte/elements";`];

// Dialog on Bits UI, in shadcn-svelte's files and names, with the same classes and slots as the
// Radix output (modalClasses). The content renders its own portal and overlay, as in React; the
// footer's showCloseButton adds an unstyled Close, as in React.
export function dialogFiles(anatomy: Anatomy): GeneratedFile[] {
  const c = modalClasses(anatomy, "dialog", "bits-ui");
  const primitive = (file: string, part: string, extra: Partial<PartFile> = {}) =>
    partFile({ path: `dialog/${file}`, imports: [BITS], props: `DialogPrimitive.${part}Props`, tag: `DialogPrimitive.${part}`, ...extra });

  const content: GeneratedFile = {
    path: "dialog/dialog-content.svelte",
    source: `<script lang="ts">
  ${BITS}
  import type { ComponentProps, Snippet } from "svelte";
  ${lucideImport("XIcon")}
  ${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
  import DialogOverlay from "./dialog-overlay.svelte";
  import DialogPortal from "./dialog-portal.svelte";

  const classes = ${c.popup};
  const closeClasses = ${c.close};
  const labelClasses = "sr-only";

  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    showCloseButton = true,
    ...restProps
  }: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
    children: Snippet;
    showCloseButton?: boolean;
  } = $props();
</script>

<DialogPortal {...portalProps}>
  <DialogOverlay />
  <DialogPrimitive.Content bind:ref data-slot="dialog-content" class={cn(classes, className)} {...restProps}>
    {@render children?.()}
    {#if showCloseButton}
      <DialogPrimitive.Close data-slot="dialog-close" class={closeClasses}>
        <XIcon aria-hidden="true" />
        <span class={labelClasses}>Close</span>
      </DialogPrimitive.Close>
    {/if}
  </DialogPrimitive.Content>
</DialogPortal>
`,
  };

  const footer: GeneratedFile = {
    path: "dialog/dialog-footer.svelte",
    source: `<script lang="ts">
  ${BITS}
  import type { HTMLAttributes } from "svelte/elements";
  ${UTILS_IMPORT(["cn", "type WithElementRef"])}

  const classes = ${c.footer};

  let {
    ref = $bindable(null),
    class: className,
    showCloseButton = false,
    children,
    ...restProps
  }: ${DIV_PROPS} & { showCloseButton?: boolean } = $props();
</script>

<div bind:this={ref} data-slot="dialog-footer" class={cn(classes, className)} {...restProps}>
  {@render children?.()}
  {#if showCloseButton}
    <DialogPrimitive.Close>Close</DialogPrimitive.Close>
  {/if}
</div>
`,
  };

  const files = [
    primitive("dialog.svelte", "Root", { ref: false, bindable: { open: "false" } }),
    primitive("dialog-trigger.svelte", "Trigger", { slot: "dialog-trigger" }),
    primitive("dialog-portal.svelte", "Portal", { ref: false }),
    primitive("dialog-close.svelte", "Close", { slot: "dialog-close" }),
    primitive("dialog-overlay.svelte", "Overlay", { slot: "dialog-overlay", classes: c.backdrop }),
    content,
    partFile({ path: "dialog/dialog-header.svelte", imports: DIV_IMPORTS, utils: ["type WithElementRef"], props: DIV_PROPS, tag: "div", element: true, slot: "dialog-header", classes: c.header }),
    footer,
    primitive("dialog-title.svelte", "Title", { slot: "dialog-title", classes: c.title }),
    primitive("dialog-description.svelte", "Description", { slot: "dialog-description", classes: c.description }),
  ];
  const parts = [
    ["dialog.svelte", "Root", "Dialog"],
    ["dialog-trigger.svelte", "Trigger", "DialogTrigger"],
    ["dialog-portal.svelte", "Portal", "DialogPortal"],
    ["dialog-close.svelte", "Close", "DialogClose"],
    ["dialog-overlay.svelte", "Overlay", "DialogOverlay"],
    ["dialog-content.svelte", "Content", "DialogContent"],
    ["dialog-header.svelte", "Header", "DialogHeader"],
    ["dialog-footer.svelte", "Footer", "DialogFooter"],
    ["dialog-title.svelte", "Title", "DialogTitle"],
    ["dialog-description.svelte", "Description", "DialogDescription"],
  ].map(([file, short, full]) => ({ file: file!, short: short!, full: full! }));
  return [...files, indexFile("dialog/index.ts", parts)];
}
