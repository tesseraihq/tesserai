import { Anatomy } from "../components";
import { popupSurface, rem } from "./shared";

// A searchable list of commands (cmdk on Base UI and Radix, React Aria's Autocomplete on React
// Aria). Rows read the shared menu tokens, so a command palette matches every other menu.
export const command = Anatomy.parse({
  name: "command",
  parts: ["root", "input", "list", "empty", "group-heading", "item", "separator", "shortcut"],
  states: ["highlighted", "disabled", "selected"],
  axes: {},
  tokens: {
    radius: { $type: "dimension", $value: "{menu.popup.radius}" },
    padding: { $type: "dimension", $value: "{menu.popup.padding}" },
    "list-max-height": { $type: "dimension", $value: rem(288) },
    "input-height": { $type: "dimension", $value: rem(40) },
    item: {
      height: { $type: "dimension", $value: "{menu.item.height}" },
      "padding-x": { $type: "dimension", $value: "{menu.item.padding-x}" },
      radius: { $type: "dimension", $value: "{menu.item.radius}" },
      "font-size": { $type: "dimension", $value: "{menu.item.font-size}" },
      highlight: { $type: "color", $value: "{menu.item.highlight}" },
    },
  },
  base: {
    root: { base: { background: popupSurface.background, foreground: popupSurface.foreground, radius: "{command.radius}" } },
    input: {
      base: { height: "{command.input-height}", paddingX: "{command.item.padding-x}", fontSize: "{command.item.font-size}", foreground: "{intent.neutral.text-strong}", border: "{intent.neutral.border}" },
    },
    list: { base: { maxHeight: "{command.list-max-height}", padding: "{command.padding}" } },
    empty: { base: { foreground: "{intent.neutral.text}", fontSize: "{command.item.font-size}", paddingY: "{space.6}" } },
    "group-heading": { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}", paddingX: "{command.item.padding-x}", paddingY: "{space.2}" } },
    item: {
      base: { height: "{command.item.height}", paddingX: "{command.item.padding-x}", radius: "{command.item.radius}", fontSize: "{command.item.font-size}", gap: "{space.3}" },
      states: { highlighted: { background: "{command.item.highlight}" }, disabled: { opacity: "{opacity.disabled}" } },
    },
    separator: { base: { background: "{intent.neutral.border}", height: "{border.width}" } },
    shortcut: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", letterSpacing: "{font.tracking.wide}" } },
  },
  sizes: {},
  variants: {},
});
