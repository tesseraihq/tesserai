import { type Anatomy } from "@tesserai/core";
import { menuContentSource, menuItemsSource } from "../menu-items";
import { BASE_POPUP_MOTION } from "../popup-shared";

export function renderDropdownMenu(anatomy: Anatomy): string {
  const content = (name: string, slot: string, defaults: { side?: string; align: string; sideOffset: number }) =>
    menuContentSource(anatomy, "base-ui", "MenuPrimitive", name, slot, BASE_POPUP_MOTION, defaults);
  return `import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuPortal = MenuPrimitive.Portal;
const DropdownMenuTrigger = MenuPrimitive.Trigger;

${content("DropdownMenuContent", "dropdown-menu-content", { align: "start", sideOffset: 4 })}

${content("DropdownMenuSubContent", "dropdown-menu-sub-content", { align: "start", sideOffset: 0 })}

${menuItemsSource(anatomy, "base-ui", "MenuPrimitive", "DropdownMenu", "dropdown-menu")}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
`;
}
