import { Anatomy } from "../components";
import { disabled, focusRing, popupSurface, rem } from "./shared";

export const select = Anatomy.parse({
  name: "select",
  parts: ["trigger", "placeholder", "value", "icon", "popup", "item", "item-indicator", "label", "separator", "scroll-button"],
  states: ["hover", "focus-visible", "disabled", "invalid"],
  axes: {
    size: { enabled: ["sm", "md", "lg"], default: "md" },
  },
  tokens: {
    height: {
      sm: { $type: "dimension", $value: "{control.height.sm}" },
      md: { $type: "dimension", $value: "{control.height.md}" },
      lg: { $type: "dimension", $value: "{control.height.lg}" },
    },
    "padding-x": { $type: "dimension", $value: "{control.padding-x}" },
    radius: { $type: "dimension", $value: "{control.radius}" },
    "font-size": { $type: "dimension", $value: "{control.font-size}" },
    popup: {
      padding: { $type: "dimension", $value: "{menu.popup.padding}" },
      radius: { $type: "dimension", $value: "{menu.popup.radius}" },
    },
    item: {
      height: { $type: "dimension", $value: "{menu.item.height}" },
      "padding-x": { $type: "dimension", $value: "{menu.item.padding-x}" },
      radius: { $type: "dimension", $value: "{menu.item.radius}" },
      highlight: { $type: "color", $value: "{menu.item.highlight}" },
    },
  },
  base: {
    trigger: {
      base: {
        background: "{intent.neutral.background}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{select.radius}",
        paddingX: "{select.padding-x}",
        fontSize: "{select.font-size}",
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
    placeholder: { base: { foreground: "{intent.neutral.text}" } },
    icon: { base: { foreground: "{intent.neutral.text}" } },
    popup: { base: { ...popupSurface, radius: "{select.popup.radius}", padding: "{select.popup.padding}" } },
    item: {
      base: {
        height: "{select.item.height}",
        paddingX: "{select.item.padding-x}",
        radius: "{select.item.radius}",
        fontSize: "{select.font-size}",
      },
      states: {
        highlighted: { background: "{select.item.highlight}" },
        disabled: { opacity: "{opacity.disabled}" },
      },
    },
    "item-indicator": { base: { foreground: "{intent.primary.text}" } },
    label: {
      base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}", paddingX: "{select.item.padding-x}" },
    },
    separator: { base: { background: "{intent.neutral.border}", height: "{border.width}" } },
    "scroll-button": { base: { foreground: "{intent.neutral.text}", background: "{surface.raised}" } },
  },
  sizes: {
    sm: { trigger: { base: { height: "{select.height.sm}" } } },
    md: { trigger: { base: { height: "{select.height.md}" } } },
    lg: { trigger: { base: { height: "{select.height.lg}" } } },
  },
  variants: {},
});
