import type { Anatomy } from "@tesserai/core";
import type { GeneratedFile } from "../render";
import { RESIZABLE_MARKS, resizablePieces } from "../resizable";
import { scrollAreaPieces } from "../scroll-area";
import { bitsImport, indexFile, indexParts, partFile, quoted, svelteFile, UTILS_IMPORT } from "./emit";
import { BITS_STATES } from "./states";

// Aspect Ratio and Scroll Area on Bits UI, and Resizable on paneforge, as shadcn-svelte builds them.

// Bits' AspectRatio keeps the shape with an inline padding, as Radix's does; it takes no classes.
export function aspectRatioFiles(): GeneratedFile[] {
  return [
    partFile({ path: "aspect-ratio/aspect-ratio.svelte", imports: [bitsImport("AspectRatio")], props: "AspectRatioPrimitive.RootProps", tag: "AspectRatioPrimitive.Root", slot: "aspect-ratio" }),
    indexFile("aspect-ratio/index.ts", indexParts([["aspect-ratio.svelte", "Root", "AspectRatio"]])),
  ];
}

// shadcn-svelte's scroll area: orientation says which scrollbars it has ("vertical", as React's
// always has, "horizontal" or "both"); the viewport is focusable so the keyboard can scroll it.
export function scrollAreaFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = scrollAreaPieces(anatomy, BITS_STATES);
  return [
    svelteFile("scroll-area/scroll-area.svelte", {
      script: `${bitsImport("ScrollArea")}
${UTILS_IMPORT(["cn", "type WithoutChild"])}
import Scrollbar from "./scroll-area-scrollbar.svelte";

const classes = ${quoted(slots["scroll-area"])};
const viewportClasses = ${quoted(slots["scroll-area-viewport"])};

let {
  ref = $bindable(null),
  viewportRef = $bindable(null),
  class: className,
  orientation = "vertical",
  scrollbarXClasses = "",
  scrollbarYClasses = "",
  children,
  ...restProps
}: WithoutChild<ScrollAreaPrimitive.RootProps> & {
  orientation?: "vertical" | "horizontal" | "both" | undefined;
  scrollbarXClasses?: string | undefined;
  scrollbarYClasses?: string | undefined;
  viewportRef?: HTMLElement | null;
} = $props();`,
      markup: `<ScrollAreaPrimitive.Root bind:ref data-slot="scroll-area" class={cn(classes, className)} {...restProps}>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <ScrollAreaPrimitive.Viewport bind:ref={viewportRef} data-slot="scroll-area-viewport" tabindex={0} class={viewportClasses}>
    {@render children?.()}
  </ScrollAreaPrimitive.Viewport>
  {#if orientation === "vertical" || orientation === "both"}
    <Scrollbar orientation="vertical" class={scrollbarYClasses} />
  {/if}
  {#if orientation === "horizontal" || orientation === "both"}
    <Scrollbar orientation="horizontal" class={scrollbarXClasses} />
  {/if}
  <ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>`,
    }),
    svelteFile("scroll-area/scroll-area-scrollbar.svelte", {
      script: `${bitsImport("ScrollArea")}
${UTILS_IMPORT(["cn", "type WithoutChild"])}

const classes = ${quoted(slots["scroll-area-scrollbar"])};
const thumbClasses = ${quoted(slots["scroll-area-thumb"])};

let { ref = $bindable(null), class: className, orientation = "vertical", children, ...restProps }: WithoutChild<ScrollAreaPrimitive.ScrollbarProps> = $props();`,
      markup: `<ScrollAreaPrimitive.Scrollbar bind:ref data-slot="scroll-area-scrollbar" data-orientation={orientation} {orientation} class={cn(classes, className)} {...restProps}>
  {@render children?.()}
  <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" class={thumbClasses} />
</ScrollAreaPrimitive.Scrollbar>`,
    }),
    {
      path: "scroll-area/index.ts",
      source: `import Scrollbar from "./scroll-area-scrollbar.svelte";
import Root from "./scroll-area.svelte";

export {
  Root,
  Scrollbar,
  //
  Root as ScrollArea,
  Scrollbar as ScrollAreaScrollbar,
  Scrollbar as ScrollBar,
};
`,
    },
  ];
}

// Resizable panes on paneforge, as shadcn-svelte's: the group takes a direction ("horizontal" or
// "vertical"), a pane its defaultSize as a percentage. Paneforge writes the group's direction on the
// group and each handle as data-direction, which the classes read. The parts keep React's
// data-slots; they're exported by shadcn-svelte's names and React's.
export function resizableFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = resizablePieces(anatomy, RESIZABLE_MARKS.paneforge);
  const PANEFORGE = `import * as ResizablePrimitive from "paneforge";`;
  return [
    svelteFile("resizable/resizable-pane-group.svelte", {
      script: `${PANEFORGE}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["resizable-panel-group"])};

let {
  ref = $bindable(null),
  this: paneGroup = $bindable(),
  class: className,
  ...restProps
}: ResizablePrimitive.PaneGroupProps & { this?: ResizablePrimitive.PaneGroup } = $props();`,
      markup: `<ResizablePrimitive.PaneGroup bind:ref bind:this={paneGroup} data-slot="resizable-panel-group" class={cn(classes, className)} {...restProps} />`,
    }),
    svelteFile("resizable/resizable-pane.svelte", {
      script: `${PANEFORGE}

let { ref = $bindable(null), this: pane = $bindable(), ...restProps }: ResizablePrimitive.PaneProps & { this?: ResizablePrimitive.Pane } = $props();`,
      markup: `<ResizablePrimitive.Pane bind:ref bind:this={pane} data-slot="resizable-panel" {...restProps} />`,
    }),
    // withHandle shows a grip on the divider.
    svelteFile("resizable/resizable-handle.svelte", {
      script: `${PANEFORGE}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}

const classes = ${quoted(slots["resizable-handle"])};
const gripClasses = ${quoted(slots["resizable-handle:grip"])};

let {
  ref = $bindable(null),
  class: className,
  withHandle = false,
  ...restProps
}: WithoutChildrenOrChild<ResizablePrimitive.PaneResizerProps> & { withHandle?: boolean } = $props();`,
      markup: `<ResizablePrimitive.PaneResizer bind:ref data-slot="resizable-handle" class={cn(classes, className)} {...restProps}>
  {#if withHandle}
    <div class={gripClasses}></div>
  {/if}
</ResizablePrimitive.PaneResizer>`,
    }),
    {
      path: "resizable/index.ts",
      source: `import Handle from "./resizable-handle.svelte";
import PaneGroup from "./resizable-pane-group.svelte";
import Pane from "./resizable-pane.svelte";

export {
  PaneGroup,
  Pane,
  Handle,
  //
  PaneGroup as ResizablePaneGroup,
  Pane as ResizablePane,
  Handle as ResizableHandle,
  // React's names.
  PaneGroup as ResizablePanelGroup,
  Pane as ResizablePanel,
};
`,
    },
  ];
}
