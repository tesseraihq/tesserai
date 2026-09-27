import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

export const textarea = Anatomy.parse({
  name: "textarea",
  parts: ["root", "placeholder"],
  states: ["hover", "focus-visible", "disabled", "invalid", "read-only"],
  axes: {},
  tokens: {
    "min-height": { $type: "dimension", $value: rem(64) },
    "padding-x": { $type: "dimension", $value: "{control.padding-x}" },
    "padding-y": { $type: "dimension", $value: "{space.3}" },
    radius: { $type: "dimension", $value: "{control.radius}" },
    "font-size": { $type: "dimension", $value: "{control.font-size}" },
  },
  base: {
    root: {
      base: {
        background: "{intent.neutral.background}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{textarea.radius}",
        paddingX: "{textarea.padding-x}",
        paddingY: "{textarea.padding-y}",
        minHeight: "{textarea.min-height}",
        fontSize: "{textarea.font-size}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        hover: { border: "{intent.neutral.text}" },
        "focus-visible": { ...focusRing("{intent.primary.focus-ring}"), border: "{intent.primary.border-strong}" },
        invalid: { border: "{intent.danger.border-strong}", ring: "{intent.danger.focus-ring}" },
        "read-only": { background: "{intent.neutral.subtle}" },
        disabled,
      },
    },
    placeholder: { base: { foreground: "{intent.neutral.text}" } },
  },
  sizes: {},
  variants: {},
});
