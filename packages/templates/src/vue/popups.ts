import type { Anatomy } from "@tesserai/core";
import { hoverCardPieces } from "../radix/hover-card";
import { popoverPieces } from "../radix/popover";
import { tooltipPieces } from "../radix/tooltip";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, passthrough, plain, staticClasses, type Folder } from "./sfc";

// Tooltip and Popover on Reka's parts. Reka marks them as Radix does (a tooltip opens with
// data-state=delayed-open) and names its CSS variables --reka-*, so the classes are the Radix
// output's with the variables renamed.

// A popup's content: portalled, the page's attributes on the popup itself (not the portal), Reka's
// props with the React file's defaults, its class merged with cn.
export function portalContent(f: Folder, file: string, reka: { portal: string; content: string }, slot: string, classes: string, defaults: string, inner = "<slot />"): GeneratedFile {
  return f.file(
    file,
    `import type { ${reka.content}Emits, ${reka.content}Props } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ${[reka.content, reka.portal, "useForwardPropsEmits", ...(/TooltipArrow/.test(inner) ? ["TooltipArrow"] : [])].sort().join(", ")} } from "reka-ui";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = ${defaults === "" ? `defineProps<${reka.content}Props & { class?: HTMLAttributes["class"] }>()` : `withDefaults(defineProps<${reka.content}Props & { class?: HTMLAttributes["class"] }>(), { ${defaults} })`};
const emits = defineEmits<${reka.content}Emits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<${reka.portal}>
  <${reka.content} data-slot="${slot}" v-bind="{ ...$attrs, ...forwarded }" :class="cn(${classes}, props.class)">
    ${inner}
  </${reka.content}>
</${reka.portal}>`,
  );
}

export function renderTooltip(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = tooltipPieces(anatomy);
  const f = folder("tooltip");
  // Tooltips open at once by default, as in shadcn; pass delay-duration to wait.
  const provider = f.file(
    "TooltipProvider",
    `import type { TooltipProviderProps } from "reka-ui";
import { TooltipProvider } from "reka-ui";

const props = withDefaults(defineProps<TooltipProviderProps>(), { delayDuration: 0 });`,
    `<TooltipProvider data-slot="tooltip-provider" v-bind="props">
  <slot />
</TooltipProvider>`,
  );
  // Brings its own provider, so a tooltip works without one at the app's root (as shadcn's once did).
  const tooltip = f.file(
    "Tooltip",
    `import type { TooltipRootEmits, TooltipRootProps } from "reka-ui";
import { TooltipRoot, useForwardPropsEmits } from "reka-ui";
import TooltipProvider from "./TooltipProvider.vue";

const props = defineProps<TooltipRootProps>();
const emits = defineEmits<TooltipRootEmits>();
const forwarded = useForwardPropsEmits(props, emits);`,
    `<TooltipProvider>
  <TooltipRoot v-slot="slotProps" data-slot="tooltip" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </TooltipRoot>
</TooltipProvider>`,
  );
  const content = portalContent(
    f,
    "TooltipContent",
    { portal: "TooltipPortal", content: "TooltipContent" },
    "tooltip-content",
    classList(slots["tooltip-content"]),
    "sideOffset: 6",
    `<slot />
    <TooltipArrow data-slot="tooltip-arrow" ${staticClasses(slots["tooltip-arrow"])} />`,
  );
  // The trigger is Reka's own, unmarked, as the React file's is Radix's.
  return [provider, tooltip, passthrough(f, "TooltipTrigger", "TooltipTrigger", null), content, barrel("tooltip", ["Tooltip", "TooltipContent", "TooltipProvider", "TooltipTrigger"])];
}

// A card that opens while its trigger (a link, a name) is hovered or focused. Reka's content takes
// no emits of its own.
export function renderHoverCard(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = hoverCardPieces(anatomy);
  const f = folder("hover-card");
  const content = f.file(
    "HoverCardContent",
    `import type { HoverCardContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { HoverCardContent, HoverCardPortal, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<HoverCardContentProps & { class?: HTMLAttributes["class"] }>(), { align: "center", sideOffset: 4 });
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);`,
    `<HoverCardPortal>
  <HoverCardContent data-slot="hover-card-content" v-bind="{ ...$attrs, ...forwarded }" :class="cn(${classList(slots["hover-card-content"])}, props.class)">
    <slot />
  </HoverCardContent>
</HoverCardPortal>`,
  );
  return [
    passthrough(f, "HoverCard", "HoverCardRoot", "hover-card", { emits: true, slotProps: true }),
    passthrough(f, "HoverCardTrigger", "HoverCardTrigger", "hover-card-trigger"),
    content,
    barrel("hover-card", ["HoverCard", "HoverCardContent", "HoverCardTrigger"]),
  ];
}

export function renderPopover(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = popoverPieces(anatomy);
  const f = folder("popover");
  return [
    passthrough(f, "Popover", "PopoverRoot", "popover", { emits: true, slotProps: true }),
    passthrough(f, "PopoverTrigger", "PopoverTrigger", "popover-trigger"),
    passthrough(f, "PopoverAnchor", "PopoverAnchor", "popover-anchor"),
    portalContent(f, "PopoverContent", { portal: "PopoverPortal", content: "PopoverContent" }, "popover-content", classList(slots["popover-content"]), `align: "center", sideOffset: 4`),
    plain(f, "PopoverHeader", "div", "popover-header", classList(slots["popover-header"])),
    plain(f, "PopoverTitle", "h2", "popover-title", classList(slots["popover-title"])),
    plain(f, "PopoverDescription", "p", "popover-description", classList(slots["popover-description"])),
    barrel("popover", ["Popover", "PopoverAnchor", "PopoverContent", "PopoverDescription", "PopoverHeader", "PopoverTitle", "PopoverTrigger"]),
  ];
}
