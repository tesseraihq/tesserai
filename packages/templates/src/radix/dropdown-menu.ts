import { type Anatomy } from "@tesserai/core";
import { classString } from "../codegen";
import { menuClassLists, menuContentSource, menuItemsSource, menuPopupList } from "../menu-items";

export const RADIX_MENU_MOTION = ["z-50", "outline-none", "data-[state=open]:animate-enter", "data-[state=closed]:animate-exit"];

// Dropdown Menu's classes, which every framework's shell prints from. Rows use Radix's
// data-highlighted, data-disabled and data-state=open (a sub-trigger), which Reka and Bits share;
// motion is the popups' enter/exit. A checkbox or radio row's indicator is an unslotted span at its
// start, holding a check or a dot.
export function dropdownMenuPieces(anatomy: Anatomy, flavor: { motion: string[] } = { motion: RADIX_MENU_MOTION }) {
  const c = menuClassLists(anatomy, "radix");
  const popup = menuPopupList(anatomy, flavor.motion);
  return {
    slots: {
      "dropdown-menu-content": popup,
      "dropdown-menu-sub-content": popup,
      "dropdown-menu-label": c.label,
      "dropdown-menu-item": c.item,
      "dropdown-menu-checkbox-item": c.choiceItem,
      "dropdown-menu-checkbox-item:indicator": c.indicator,
      "dropdown-menu-radio-item": c.choiceItem,
      "dropdown-menu-radio-item:indicator": c.indicator,
      "dropdown-menu-radio-item:dot": c.radioDot,
      "dropdown-menu-separator": c.separator,
      "dropdown-menu-shortcut": c.shortcut,
      "dropdown-menu-sub-trigger": c.subTrigger,
      "dropdown-menu-sub-trigger:chevron": c.subChevron,
    },
  };
}

export function renderDropdownMenu(anatomy: Anatomy): string {
  const { slots } = dropdownMenuPieces(anatomy);
  const rows = {
    item: classString(slots["dropdown-menu-item"]),
    choiceItem: classString(slots["dropdown-menu-checkbox-item"]),
    indicator: classString(slots["dropdown-menu-checkbox-item:indicator"]),
    subTrigger: classString(slots["dropdown-menu-sub-trigger"]),
    label: classString(slots["dropdown-menu-label"]),
    separator: classString(slots["dropdown-menu-separator"]),
    shortcut: classString(slots["dropdown-menu-shortcut"]),
    radioDot: classString(slots["dropdown-menu-radio-item:dot"]),
    subChevron: classString(slots["dropdown-menu-sub-trigger:chevron"]),
  };
  const ns = "DropdownMenuPrimitive";
  return `import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function DropdownMenu(props: React.ComponentProps<typeof ${ns}.Root>) {
  return <${ns}.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal(props: React.ComponentProps<typeof ${ns}.Portal>) {
  return <${ns}.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof ${ns}.Trigger>) {
  return <${ns}.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

${menuContentSource(anatomy, "radix", ns, "DropdownMenuContent", "dropdown-menu-content", RADIX_MENU_MOTION, { align: "start", sideOffset: 4 }, slots["dropdown-menu-content"])}

function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof ${ns}.SubContent>) {
  return <${ns}.SubContent data-slot="dropdown-menu-sub-content" className={cn(${classString(slots["dropdown-menu-sub-content"])}, className)} {...props} />;
}

${menuItemsSource(anatomy, "radix", ns, "DropdownMenu", "dropdown-menu", rows)}

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
