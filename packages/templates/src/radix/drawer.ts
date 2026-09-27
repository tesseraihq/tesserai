import { type Anatomy } from "@tesserai/core";
import { drawerParts, edgeClasses } from "../base-ui/drawer";
import { classString } from "../codegen";

const CONTENT_LAYOUT = [
  "group/drawer-content fixed z-50 flex h-auto flex-col",
  "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh]",
  "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh]",
  "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:sm:max-w-sm",
  "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:sm:max-w-sm",
].flatMap((classes) => classes.split(" "));

// Drawer's classes on Vaul, which every framework's shell prints from: vaul-vue and vaul-svelte
// are its ports, with the same parts and the same data-vaul-drawer-direction, so these carry over
// unchanged. The panel rounds and borders only the edge facing the page; the handle (an unslotted
// bar at its top) shows on a drawer that comes up from below.
export function drawerPieces(anatomy: Anatomy) {
  const p = drawerParts(anatomy);
  return {
    slots: {
      "drawer-overlay": ["fixed", "inset-0", "z-50", ...p.backdrop],
      "drawer-content": [...CONTENT_LAYOUT, ...p.popup, ...edgeClasses("data-[vaul-drawer-direction", { bottom: "t", top: "b", left: "r", right: "l" })],
      "drawer-content:handle": ["mx-auto", "mt-4", "hidden", "shrink-0", "group-data-[vaul-drawer-direction=bottom]/drawer-content:block", ...p.handle],
      "drawer-header": [...p.header, "group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center", "group-data-[vaul-drawer-direction=top]/drawer-content:text-center"],
      "drawer-footer": p.footer,
      "drawer-title": p.title,
      "drawer-description": p.description,
    },
  };
}

// shadcn's Radix drawer is Vaul (direction: bottom, top, left or right); Vaul animates it.
export function renderDrawer(anatomy: Anatomy): string {
  const { slots } = drawerPieces(anatomy);
  return `import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

function Drawer(props: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger(props: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(props: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose(props: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return <DrawerPrimitive.Overlay data-slot="drawer-overlay" className={cn(${classString(slots["drawer-overlay"])}, className)} {...props} />;
}

function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content data-slot="drawer-content" className={cn(${classString(slots["drawer-content"])}, className)} {...props}>
        <div aria-hidden="true" className=${classString(slots["drawer-content:handle"])} />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-header" className={cn(${classString(slots["drawer-header"])}, className)} {...props} />;
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-footer" className={cn(${classString(slots["drawer-footer"])}, className)} {...props} />;
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title data-slot="drawer-title" className={cn(${classString(slots["drawer-title"])}, className)} {...props} />;
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return <DrawerPrimitive.Description data-slot="drawer-description" className={cn(${classString(slots["drawer-description"])}, className)} {...props} />;
}

export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerPortal, DrawerTitle, DrawerTrigger };
`;
}
