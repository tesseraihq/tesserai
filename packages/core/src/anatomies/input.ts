import { Anatomy } from "../components";
import { disabled, focusRing } from "./shared";

export const input = Anatomy.parse({
  name: "input",
  parts: ["root", "placeholder"],
  states: ["hover", "focus-visible", "disabled", "invalid", "read-only"],
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
  },
  base: {
    root: {
      base: {
        background: "{intent.neutral.background}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{input.radius}",
        paddingX: "{input.padding-x}",
        fontSize: "{input.font-size}",
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
  sizes: {
    sm: { root: { base: { height: "{input.height.sm}" } } },
    md: { root: { base: { height: "{input.height.md}" } } },
    lg: { root: { base: { height: "{input.height.lg}" } } },
  },
  variants: {},
});
