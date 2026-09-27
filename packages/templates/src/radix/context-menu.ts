import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { menuClassLists, menuItemsSource, menuPopupList, menuRowSlots, menuRowStrings } from "../menu-items";
import { RADIX_MENU_MOTION } from "./dropdown-menu";

// Context Menu's classes, which every framework's shell prints from: the rows are every menu's
// (Radix's data-highlighted, data-disabled, data-state=open on a submenu's trigger, which Reka and
// Bits share), the panels the popups' motion, and the area you right-click can't be selected.
export function contextMenuPieces(anatomy: Anatomy, flavor: { motion: string[] } = { motion: RADIX_MENU_MOTION }) {
  const popup = menuPopupList(anatomy, flavor.motion);
  return {
    slots: {
      "context-menu-trigger": ["select-none"],
      "context-menu-content": popup,
      "context-menu-sub-content": popup,
      ...menuRowSlots(menuClassLists(anatomy, "radix"), "context-menu"),
    },
  };
}

export function renderContextMenu(anatomy: Anatomy): string {
  const ns = "ContextMenuPrimitive";
  const { slots } = contextMenuPieces(anatomy);
  const popup = classString(slots["context-menu-content"]);
  return `import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function ContextMenu(props: React.ComponentProps<typeof ${ns}.Root>) {
  return <${ns}.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger({ className, ...props }: React.ComponentProps<typeof ${ns}.Trigger>) {
  return <${ns}.Trigger data-slot="context-menu-trigger" className={cn(${classString(slots["context-menu-trigger"])}, className)} {...props} />;
}

function ContextMenuPortal(props: React.ComponentProps<typeof ${ns}.Portal>) {
  return <${ns}.Portal data-slot="context-menu-portal" {...props} />;
}

// Positioned at the pointer, so it takes no side or offset.
function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof ${ns}.Content>) {
  return (
    <${ns}.Portal>
      <${ns}.Content data-slot="context-menu-content" className={cn(${popup}, className)} {...props} />
    </${ns}.Portal>
  );
}

function ContextMenuSubContent({ className, ...props }: React.ComponentProps<typeof ${ns}.SubContent>) {
  return <${ns}.SubContent data-slot="context-menu-sub-content" className={cn(${classString(slots["context-menu-sub-content"])}, className)} {...props} />;
}

${menuItemsSource(anatomy, "radix", ns, "ContextMenu", "context-menu", menuRowStrings(slots, "context-menu"))}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
`;
}
