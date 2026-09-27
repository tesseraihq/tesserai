import { type Anatomy } from "@tesserai/core";
import { RAC_MENU_IMPORTS, racMenuSource } from "../menu-items";
import { menubarBarAndTrigger } from "../menubar-shared";
import { RAC_POPUP_MOTION } from "../popup-shared";

// shadcn has no React Aria menubar, and React Aria has no menubar primitive. This is the nearest
// correct structure from its parts: a Toolbar (arrow keys move between menus) of MenuTriggers. It
// does not switch menus on hover while one is open, as a native menubar does.
export function renderMenubar(anatomy: Anatomy): string {
  const { bar, trigger } = menubarBarAndTrigger(anatomy, ["aria-expanded:"], { hover: ["data-hovered:"], "focus-visible": ["data-focus-visible:"] });
  return `import * as React from "react";
import { Button, Toolbar, type ButtonProps, type ToolbarProps } from "react-aria-components";
${RAC_MENU_IMPORTS}

function Menubar({ className, ...props }: Omit<ToolbarProps, "className"> & { className?: string }) {
  return <Toolbar data-slot="menubar" aria-label={props["aria-label"] ?? "Menu bar"} className={cn(${bar}, className)} {...props} />;
}

// <MenubarMenu><MenubarTrigger>File</MenubarTrigger><MenubarContent>…</MenubarContent></MenubarMenu>
function MenubarMenu(props: React.ComponentProps<typeof MenuTrigger>) {
  return <MenuTrigger {...props} />;
}

function MenubarTrigger({ className, ...props }: Omit<ButtonProps, "className"> & { className?: string }) {
  return <Button data-slot="menubar-trigger" className={cn(${trigger}, className)} {...props} />;
}

${racMenuSource(anatomy, "Menubar", "menubar", RAC_POPUP_MOTION, "MenubarContent")}

export {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
`;
}
