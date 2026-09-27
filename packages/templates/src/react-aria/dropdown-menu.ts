import { type Anatomy } from "@tesserai/core";
import { RAC_MENU_IMPORTS, racMenuSource } from "../menu-items";
import { RAC_POPUP_MOTION } from "../popup-shared";

// shadcn's React Aria dropdown menu: DropdownMenuTrigger holds the open state and wraps the button;
// DropdownMenu is the menu itself.
export function renderDropdownMenu(anatomy: Anatomy): string {
  return `import * as React from "react";
${RAC_MENU_IMPORTS}

function DropdownMenuTrigger(props: React.ComponentProps<typeof MenuTrigger>) {
  return <MenuTrigger {...props} />;
}

${racMenuSource(anatomy, "DropdownMenu", "dropdown-menu", RAC_POPUP_MOTION)}

export {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
`;
}
