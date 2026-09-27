import { menuAnatomy } from "./menu-shared";
import { focusRing, rem } from "./shared";

// A horizontal bar of menu triggers (File, Edit, View) whose menus are ordinary menus.
export const menubar = menuAnatomy("menubar", {
  parts: ["bar", "trigger"],
  tokens: {
    bar: {
      height: { $type: "dimension", $value: rem(36) },
      padding: { $type: "dimension", $value: "{space.2}" },
      radius: { $type: "dimension", $value: "{radius.md}" },
      gap: { $type: "dimension", $value: "{space.1}" },
    },
    trigger: {
      "padding-x": { $type: "dimension", $value: "{space.3}" },
      height: { $type: "dimension", $value: rem(28) },
    },
  },
  base: {
    bar: {
      base: {
        background: "{intent.neutral.background}",
        border: "{intent.neutral.border}",
        borderWidth: "{border.width}",
        radius: "{menubar.bar.radius}",
        height: "{menubar.bar.height}",
        padding: "{menubar.bar.padding}",
        gap: "{menubar.bar.gap}",
      },
    },
    trigger: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        height: "{menubar.trigger.height}",
        paddingX: "{menubar.trigger.padding-x}",
        radius: "{menubar.item.radius}",
        fontSize: "{menubar.item.font-size}",
        fontWeight: "{font.weight.medium}",
      },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        open: { background: "{intent.neutral.subtle}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
      },
    },
  },
});
