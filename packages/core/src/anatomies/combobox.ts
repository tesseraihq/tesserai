import { Anatomy } from "../components";
import { disabled, focusRing, popupSurface, rem } from "./shared";

// A text field that filters a list as you type (Base UI's Combobox on Base UI and Radix, React
// Aria's ComboBox on React Aria). The field reads the shared control tokens, so it looks like
// Input; the list reads the menu tokens, so it looks like every other list. Chips show multiple
// selections inside the field.
export const combobox = Anatomy.parse({
  name: "combobox",
  parts: ["field", "input", "button", "popup", "item", "item-indicator", "label", "empty", "separator", "chip", "chip-remove"],
  states: ["hover", "focus-visible", "disabled", "invalid", "highlighted", "selected"],
  axes: {},
  tokens: {
    height: { $type: "dimension", $value: "{control.height.md}" },
    radius: { $type: "dimension", $value: "{control.radius}" },
    "padding-x": { $type: "dimension", $value: "{control.padding-x}" },
    "font-size": { $type: "dimension", $value: "{control.font-size}" },
    popup: {
      padding: { $type: "dimension", $value: "{menu.popup.padding}" },
      radius: { $type: "dimension", $value: "{menu.popup.radius}" },
      "max-height": { $type: "dimension", $value: rem(288) },
    },
    item: {
      height: { $type: "dimension", $value: "{menu.item.height}" },
      "padding-x": { $type: "dimension", $value: "{menu.item.padding-x}" },
      radius: { $type: "dimension", $value: "{menu.item.radius}" },
      "font-size": { $type: "dimension", $value: "{menu.item.font-size}" },
      highlight: { $type: "color", $value: "{menu.item.highlight}" },
    },
    chip: {
      height: { $type: "dimension", $value: rem(24) },
      "padding-x": { $type: "dimension", $value: "{space.3}" },
      radius: { $type: "dimension", $value: "{radius.sm}" },
    },
    "button-size": { $type: "dimension", $value: rem(24) },
  },
  base: {
    field: {
      base: {
        background: "{intent.neutral.background}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{combobox.radius}",
        minHeight: "{combobox.height}",
        gap: "{space.2}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        hover: { border: "{intent.neutral.text}" },
        "focus-visible": { ...focusRing("{intent.primary.focus-ring}"), border: "{intent.primary.border-strong}" },
        invalid: { border: "{intent.danger.border-strong}" },
        disabled,
      },
    },
    input: { base: { foreground: "{intent.neutral.text-strong}", paddingX: "{combobox.padding-x}", fontSize: "{combobox.font-size}" } },
    button: {
      base: { foreground: "{intent.neutral.text}", radius: "{radius.sm}", size: "{combobox.button-size}" },
      states: { hover: { background: "{intent.neutral.subtle}" } },
    },
    popup: {
      base: {
        ...popupSurface,
        radius: "{combobox.popup.radius}",
        padding: "{combobox.popup.padding}",
        maxHeight: "{combobox.popup.max-height}",
      },
    },
    item: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        height: "{combobox.item.height}",
        paddingX: "{combobox.item.padding-x}",
        radius: "{combobox.item.radius}",
        fontSize: "{combobox.item.font-size}",
        gap: "{space.3}",
      },
      states: { highlighted: { background: "{combobox.item.highlight}" }, disabled: { opacity: "{opacity.disabled}" } },
    },
    "item-indicator": { base: { foreground: "{intent.primary.text}" } },
    label: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}", paddingX: "{combobox.item.padding-x}", paddingY: "{space.2}" } },
    empty: { base: { foreground: "{intent.neutral.text}", fontSize: "{combobox.item.font-size}", paddingY: "{space.5}" } },
    separator: { base: { background: "{intent.neutral.border}", height: "{border.width}" } },
    chip: {
      base: {
        background: "{intent.neutral.subtle}",
        foreground: "{intent.neutral.text-strong}",
        radius: "{combobox.chip.radius}",
        height: "{combobox.chip.height}",
        paddingX: "{combobox.chip.padding-x}",
        fontSize: "{font.size.1}",
        gap: "{space.1}",
      },
    },
    "chip-remove": { base: { foreground: "{intent.neutral.text}", radius: "{radius.sm}" }, states: { hover: { foreground: "{intent.neutral.text-strong}" } } },
  },
  sizes: {},
  variants: {},
});
