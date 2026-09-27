import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { menuClassLists, menuItemsSource, menuPopupList, menuRowSlots, menuRowStrings } from "../menu-items";
import { menubarBarAndTriggerLists } from "../menubar-shared";
import { RADIX_MENU_MOTION } from "./dropdown-menu";

// Menubar's classes, which every framework's shell prints from: the bar, a menu's trigger (open
// while its menu shows: data-state=open, as Reka's and Bits' say too), the panels and every menu's
// rows.
export function menubarPieces(anatomy: Anatomy, flavor: { motion: string[] } = { motion: RADIX_MENU_MOTION }) {
  const { bar, trigger } = menubarBarAndTriggerLists(anatomy, ["data-[state=open]:"]);
  const popup = menuPopupList(anatomy, flavor.motion);
  return {
    slots: {
      menubar: bar,
      "menubar-trigger": trigger,
      "menubar-content": popup,
      "menubar-sub-content": popup,
      ...menuRowSlots(menuClassLists(anatomy, "radix"), "menubar"),
    },
  };
}

export function renderMenubar(anatomy: Anatomy): string {
  const ns = "MenubarPrimitive";
  const { slots } = menubarPieces(anatomy);
  return `import * as React from "react";
import { Menubar as MenubarPrimitive } from "radix-ui";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Menubar({ className, ...props }: React.ComponentProps<typeof ${ns}.Root>) {
  return <${ns}.Root data-slot="menubar" className={cn(${classString(slots.menubar)}, className)} {...props} />;
}

function MenubarMenu(props: React.ComponentProps<typeof ${ns}.Menu>) {
  return <${ns}.Menu data-slot="menubar-menu" {...props} />;
}

function MenubarPortal(props: React.ComponentProps<typeof ${ns}.Portal>) {
  return <${ns}.Portal data-slot="menubar-portal" {...props} />;
}

function MenubarTrigger({ className, ...props }: React.ComponentProps<typeof ${ns}.Trigger>) {
  return <${ns}.Trigger data-slot="menubar-trigger" className={cn(${classString(slots["menubar-trigger"])}, className)} {...props} />;
}

function MenubarContent({ className, align = "start", alignOffset = -4, sideOffset = 8, ...props }: React.ComponentProps<typeof ${ns}.Content>) {
  return (
    <MenubarPortal>
      <${ns}.Content data-slot="menubar-content" align={align} alignOffset={alignOffset} sideOffset={sideOffset} className={cn(${classString(slots["menubar-content"])}, className)} {...props} />
    </MenubarPortal>
  );
}

function MenubarSubContent({ className, ...props }: React.ComponentProps<typeof ${ns}.SubContent>) {
  return <${ns}.SubContent data-slot="menubar-sub-content" className={cn(${classString(slots["menubar-sub-content"])}, className)} {...props} />;
}

${menuItemsSource(anatomy, "radix", ns, "Menubar", "menubar", menuRowStrings(slots, "menubar"))}

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
