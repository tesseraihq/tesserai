import { type Anatomy } from "@tesserai/core";
import { menuContentSource, menuItemsSource } from "../menu-items";
import { menubarBarAndTrigger } from "../menubar-shared";
import { BASE_POPUP_MOTION } from "../popup-shared";

// Base UI's Menubar holds ordinary Menus; each menu's rows are the shared menu rows.
export function renderMenubar(anatomy: Anatomy): string {
  const { bar, trigger } = menubarBarAndTrigger(anatomy, ["data-popup-open:"]);
  const content = (name: string, slot: string, defaults: { side?: string; align: string; sideOffset: number }) =>
    menuContentSource(anatomy, "base-ui", "MenuPrimitive", name, slot, BASE_POPUP_MOTION, defaults);
  return `import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Menubar({ className, ...props }: Omit<React.ComponentProps<typeof MenubarPrimitive>, "className"> & { className?: string }) {
  return <MenubarPrimitive data-slot="menubar" className={cn(${bar}, className)} {...props} />;
}

const MenubarMenu = MenuPrimitive.Root;
const MenubarPortal = MenuPrimitive.Portal;

function MenubarTrigger({ className, ...props }: Omit<React.ComponentProps<typeof MenuPrimitive.Trigger>, "className"> & { className?: string }) {
  return <MenuPrimitive.Trigger data-slot="menubar-trigger" className={cn(${trigger}, className)} {...props} />;
}

${content("MenubarContent", "menubar-content", { align: "start", sideOffset: 8 })}

${content("MenubarSubContent", "menubar-sub-content", { align: "start", side: "right", sideOffset: 0 })}

${menuItemsSource(anatomy, "base-ui", "MenuPrimitive", "Menubar", "menubar")}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
`;
}
