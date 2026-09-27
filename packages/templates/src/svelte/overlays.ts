import type { Anatomy } from "@tesserai/core";
import { drawerPieces } from "../radix/drawer";
import { HOVER_CARD_MOTION, hoverCardPieces } from "../radix/hover-card";
import type { GeneratedFile } from "../render";
import { elementPart } from "./elements";
import { bitsImport, indexFile, indexParts, partFile, quoted, svelteFile, UTILS_IMPORT } from "./emit";
import { BITS_STATES } from "./states";

// Bits calls a hover card a link preview, and names its transform origin after that:
// --bits-link-preview-content-transform-origin.
export const LINK_PREVIEW_MOTION = HOVER_CARD_MOTION.map((c) => c.replace("--radix-hover-card-", "--bits-link-preview-"));

// Hover Card on Bits' LinkPreview (shadcn-svelte's local name for it is HoverCardPrimitive): a card
// that opens while its trigger is hovered or focused, marked open and closed as Radix's is.
export function hoverCardFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = hoverCardPieces(anatomy, { states: BITS_STATES, motion: LINK_PREVIEW_MOTION });
  const part = (file: string, name: string, extra: object = {}) =>
    partFile({ path: `hover-card/${file}`, imports: [bitsImport("LinkPreview", "HoverCardPrimitive")], props: `HoverCardPrimitive.${name}Props`, tag: `HoverCardPrimitive.${name}`, ...extra });
  return [
    part("hover-card.svelte", "Root", { ref: false, bindable: { open: "false" } }),
    part("hover-card-trigger.svelte", "Trigger", { slot: "hover-card-trigger" }),
    part("hover-card-portal.svelte", "Portal", { ref: false }),
    svelteFile("hover-card/hover-card-content.svelte", {
      script: `${bitsImport("LinkPreview", "HoverCardPrimitive")}
import type { ComponentProps } from "svelte";
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import HoverCardPortal from "./hover-card-portal.svelte";

const classes = ${quoted(slots["hover-card-content"])};

let {
  ref = $bindable(null),
  class: className,
  side = "bottom",
  align = "center",
  sideOffset = 4,
  portalProps,
  ...restProps
}: HoverCardPrimitive.ContentProps & {
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof HoverCardPortal>>;
} = $props();`,
      markup: `<!-- Under its trigger unless told otherwise, as Radix's (Bits' opens above). -->
<HoverCardPortal {...portalProps}>
  <HoverCardPrimitive.Content bind:ref data-slot="hover-card-content" {side} {align} {sideOffset} class={cn(classes, className)} {...restProps} />
</HoverCardPortal>`,
    }),
    indexFile(
      "hover-card/index.ts",
      indexParts([
        ["hover-card.svelte", "Root", "HoverCard"],
        ["hover-card-trigger.svelte", "Trigger", "HoverCardTrigger"],
        ["hover-card-content.svelte", "Content", "HoverCardContent"],
        ["hover-card-portal.svelte", "Portal", "HoverCardPortal"],
      ]),
    ),
  ];
}

// Drawer on vaul-svelte (its Svelte 5 line, 1.0.0-next), Vaul's port, which the React Radix
// output uses: the same parts, `direction` and data-vaul-drawer-direction, so the classes are the
// Radix output's. Its trigger, title, description and close are Bits' Dialog parts.
export function drawerFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = drawerPieces(anatomy);
  const vaul = `import { Drawer as DrawerPrimitive } from "vaul-svelte";`;
  const part = (file: string, name: string, extra: object = {}) =>
    partFile({ path: `drawer/${file}`, imports: [vaul], props: `DrawerPrimitive.${name}Props`, tag: `DrawerPrimitive.${name}`, ...extra });
  return [
    part("drawer.svelte", "Root", { ref: false, bindable: { open: "false", activeSnapPoint: "null" } }),
    part("drawer-nested.svelte", "NestedRoot", { ref: false, bindable: { open: "false", activeSnapPoint: "null" } }),
    part("drawer-trigger.svelte", "Trigger", { slot: "drawer-trigger" }),
    part("drawer-portal.svelte", "Portal", { ref: false }),
    part("drawer-close.svelte", "Close", { slot: "drawer-close" }),
    part("drawer-overlay.svelte", "Overlay", { slot: "drawer-overlay", classes: quoted(slots["drawer-overlay"]) }),
    svelteFile("drawer/drawer-content.svelte", {
      script: `${vaul}
import type { ComponentProps } from "svelte";
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import DrawerOverlay from "./drawer-overlay.svelte";
import DrawerPortal from "./drawer-portal.svelte";

const classes = ${quoted(slots["drawer-content"])};
const handleClasses = ${quoted(slots["drawer-content:handle"])};

let {
  ref = $bindable(null),
  class: className,
  portalProps,
  children,
  ...restProps
}: DrawerPrimitive.ContentProps & {
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DrawerPortal>>;
} = $props();`,
      markup: `<DrawerPortal {...portalProps}>
  <DrawerOverlay />
  <DrawerPrimitive.Content bind:ref data-slot="drawer-content" class={cn(classes, className)} {...restProps}>
    <div aria-hidden="true" class={handleClasses}></div>
    {@render children?.()}
  </DrawerPrimitive.Content>
</DrawerPortal>`,
    }),
    elementPart("drawer/drawer-header.svelte", "div", "drawer-header", quoted(slots["drawer-header"])),
    elementPart("drawer/drawer-footer.svelte", "div", "drawer-footer", quoted(slots["drawer-footer"])),
    part("drawer-title.svelte", "Title", { slot: "drawer-title", classes: quoted(slots["drawer-title"]) }),
    part("drawer-description.svelte", "Description", { slot: "drawer-description", classes: quoted(slots["drawer-description"]) }),
    indexFile(
      "drawer/index.ts",
      indexParts([
        ["drawer.svelte", "Root", "Drawer"],
        ["drawer-nested.svelte", "NestedRoot", "DrawerNestedRoot"],
        ["drawer-trigger.svelte", "Trigger", "DrawerTrigger"],
        ["drawer-portal.svelte", "Portal", "DrawerPortal"],
        ["drawer-close.svelte", "Close", "DrawerClose"],
        ["drawer-overlay.svelte", "Overlay", "DrawerOverlay"],
        ["drawer-content.svelte", "Content", "DrawerContent"],
        ["drawer-header.svelte", "Header", "DrawerHeader"],
        ["drawer-footer.svelte", "Footer", "DrawerFooter"],
        ["drawer-title.svelte", "Title", "DrawerTitle"],
        ["drawer-description.svelte", "Description", "DrawerDescription"],
      ]),
    ),
  ];
}
