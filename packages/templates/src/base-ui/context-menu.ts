import { type Anatomy } from "@tesserai/core";
import { menuContentSource, menuItemsSource } from "../menu-items";
import { BASE_POPUP_MOTION } from "../popup-shared";

export function renderContextMenu(anatomy: Anatomy): string {
  const content = (name: string, slot: string) =>
    menuContentSource(anatomy, "base-ui", "ContextMenuPrimitive", name, slot, BASE_POPUP_MOTION, { align: "start", side: "right", sideOffset: 0 });
  return `import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuPortal = ContextMenuPrimitive.Portal;

// The area that opens the menu on right-click (or long-press on touch).
function ContextMenuTrigger({ className, ...props }: Omit<React.ComponentProps<typeof ContextMenuPrimitive.Trigger>, "className"> & { className?: string }) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" className={cn("select-none", className)} {...props} />;
}

${content("ContextMenuContent", "context-menu-content")}

${content("ContextMenuSubContent", "context-menu-sub-content")}

${menuItemsSource(anatomy, "base-ui", "ContextMenuPrimitive", "ContextMenu", "context-menu")}

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
