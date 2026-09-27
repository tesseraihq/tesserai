import { type Anatomy } from "@tesserai/core";
import { RAC_MENU_IMPORTS, racMenuSource } from "../menu-items";
import { RAC_POPUP_MOTION } from "../popup-shared";

// shadcn's React Aria context menu: ContextMenuTrigger is a MenuTrigger opened by right-click
// (its child must be pressable: wrap an area in React Aria's Pressable); ContextMenu is the menu.
export function renderContextMenu(anatomy: Anatomy): string {
  return `import * as React from "react";
${RAC_MENU_IMPORTS}

function ContextMenuTrigger(props: Omit<React.ComponentProps<typeof MenuTrigger>, "trigger">) {
  return <MenuTrigger trigger="contextMenu" {...props} />;
}

${racMenuSource(anatomy, "ContextMenu", "context-menu", RAC_POPUP_MOTION)}

export {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
`;
}
