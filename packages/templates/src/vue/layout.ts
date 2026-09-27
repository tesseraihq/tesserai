import type { Anatomy } from "@tesserai/core";
import type { GeneratedFile } from "../render";
import { RESIZABLE_MARKS, resizablePieces } from "../resizable";
import { scrollAreaPieces } from "../scroll-area";
import { barrel, classList, folder, passthrough, staticClasses } from "./sfc";
import { REKA_STATES } from "./states";

// Aspect Ratio, Scroll Area, Resizable and Direction on Reka's parts: AspectRatio, ScrollArea*,
// Splitter* (as shadcn-vue's resizable) and ConfigProvider.

// Reka's AspectRatio keeps the shape with an inline padding, as Radix's does; it takes no classes.
export function renderAspectRatio(): GeneratedFile[] {
  const f = folder("aspect-ratio");
  return [passthrough(f, "AspectRatio", "AspectRatio", "aspect-ratio", { slotProps: true }), barrel("aspect-ratio", ["AspectRatio"])];
}

// A vertical bar comes with every ScrollArea; add <ScrollBar orientation="horizontal" /> to scroll
// sideways. The viewport is focusable so the keyboard can scroll it.
export function renderScrollArea(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = scrollAreaPieces(anatomy, REKA_STATES);
  const f = folder("scroll-area");
  const area = f.file(
    "ScrollArea",
    `import type { ScrollAreaRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport } from "reka-ui";
import { cn } from "@/lib/utils";
import ScrollBar from "./ScrollBar.vue";

const props = defineProps<ScrollAreaRootProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");`,
    `<ScrollAreaRoot data-slot="scroll-area" v-bind="delegatedProps" :class="cn(${classList(slots["scroll-area"])}, props.class)">
  <ScrollAreaViewport data-slot="scroll-area-viewport" :tabindex="0" ${staticClasses(slots["scroll-area-viewport"])}>
    <slot />
  </ScrollAreaViewport>
  <ScrollBar />
  <ScrollAreaCorner />
</ScrollAreaRoot>`,
  );
  const bar = f.file(
    "ScrollBar",
    `import type { ScrollAreaScrollbarProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ScrollAreaScrollbar, ScrollAreaThumb } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<ScrollAreaScrollbarProps & { class?: HTMLAttributes["class"] }>(), { orientation: "vertical" });
const delegatedProps = reactiveOmit(props, "class");`,
    `<ScrollAreaScrollbar data-slot="scroll-area-scrollbar" :data-orientation="orientation" v-bind="delegatedProps" :class="cn(${classList(slots["scroll-area-scrollbar"])}, props.class)">
  <ScrollAreaThumb data-slot="scroll-area-thumb" ${staticClasses(slots["scroll-area-thumb"])} />
</ScrollAreaScrollbar>`,
  );
  return [area, bar, barrel("scroll-area", ["ScrollArea", "ScrollBar"])];
}

// Resizable panels on Reka's Splitter, as shadcn-vue's: the group takes direction ("horizontal" or
// "vertical"), a panel its default-size as a percentage. Reka writes the group's direction on the
// group and each handle as data-orientation, which the classes read.
export function renderResizable(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = resizablePieces(anatomy, RESIZABLE_MARKS.reka);
  const f = folder("resizable");
  const group = f.file(
    "ResizablePanelGroup",
    `import type { SplitterGroupEmits, SplitterGroupProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { SplitterGroup, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<SplitterGroupProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<SplitterGroupEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<SplitterGroup v-slot="slotProps" data-slot="resizable-panel-group" v-bind="forwarded" :class="cn(${classList(slots["resizable-panel-group"])}, props.class)">
  <slot v-bind="slotProps" />
</SplitterGroup>`,
  );
  const panel = f.file(
    "ResizablePanel",
    `import type { SplitterPanelEmits, SplitterPanelProps } from "reka-ui";
import { SplitterPanel, useForwardExpose, useForwardPropsEmits } from "reka-ui";

const props = defineProps<SplitterPanelProps>();
const emits = defineEmits<SplitterPanelEmits>();
const forwarded = useForwardPropsEmits(props, emits);
const { forwardRef } = useForwardExpose();`,
    `<SplitterPanel :ref="forwardRef" v-slot="slotProps" data-slot="resizable-panel" v-bind="forwarded">
  <slot v-bind="slotProps" />
</SplitterPanel>`,
  );
  // with-handle shows a grip on the divider.
  const handle = f.file(
    "ResizableHandle",
    `import type { SplitterResizeHandleEmits, SplitterResizeHandleProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { SplitterResizeHandle, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<SplitterResizeHandleProps & { class?: HTMLAttributes["class"]; withHandle?: boolean }>();
const emits = defineEmits<SplitterResizeHandleEmits>();
const delegatedProps = reactiveOmit(props, "class", "withHandle");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<SplitterResizeHandle data-slot="resizable-handle" v-bind="forwarded" :class="cn(${classList(slots["resizable-handle"])}, props.class)">
  <div v-if="props.withHandle" ${staticClasses(slots["resizable-handle:grip"])} />
</SplitterResizeHandle>`,
  );
  return [group, handle, panel, barrel("resizable", ["ResizableHandle", "ResizablePanel", "ResizablePanelGroup"])];
}

// DirectionProvider sets the reading direction for every Reka part inside it (Reka's
// ConfigProvider); dir or direction, as React's takes either. useDirection reads it.
export function renderDirection(): GeneratedFile[] {
  const f = folder("direction");
  const provider = f.file(
    "DirectionProvider",
    `import type { ConfigProviderProps } from "reka-ui";
import { reactiveOmit } from "@vueuse/core";
import { ConfigProvider } from "reka-ui";

const props = defineProps<ConfigProviderProps & { direction?: ConfigProviderProps["dir"] }>();
const delegatedProps = reactiveOmit(props, "dir", "direction");`,
    `<ConfigProvider v-bind="delegatedProps" :dir="props.direction ?? props.dir">
  <slot />
</ConfigProvider>`,
  );
  return [provider, barrel("direction", ["DirectionProvider"], `export { useDirection } from "reka-ui";`)];
}
