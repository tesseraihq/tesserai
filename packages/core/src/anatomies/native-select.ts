import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

export const nativeSelect = Anatomy.parse({
  name: "native-select",
  parts: ["select", "icon"],
  states: ["hover", "focus-visible", "disabled", "invalid"],
  axes: {
    size: { enabled: ["sm", "md"], default: "md" },
  },
  tokens: {
    height: {
      sm: { $type: "dimension", $value: "{control.height.sm}" },
      md: { $type: "dimension", $value: "{control.height.md}" },
    },
    "padding-x": { $type: "dimension", $value: "{control.padding-x}" },
    radius: { $type: "dimension", $value: "{control.radius}" },
    "font-size": { $type: "dimension", $value: "{control.font-size}" },
    "icon-size": { $type: "dimension", $value: rem(16) },
  },
  base: {
    select: {
      base: {
        background: "{intent.neutral.background}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{native-select.radius}",
        paddingX: "{native-select.padding-x}",
        fontSize: "{native-select.font-size}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
        cursor: "pointer",
      },
      states: {
        hover: { border: "{intent.neutral.text}" },
        "focus-visible": { ...focusRing("{intent.primary.focus-ring}"), border: "{intent.primary.border-strong}" },
        invalid: { border: "{intent.danger.border-strong}", ring: "{intent.danger.focus-ring}" },
        disabled,
      },
    },
    icon: { base: { foreground: "{intent.neutral.text}", size: "{native-select.icon-size}" } },
  },
  sizes: {
    sm: { select: { base: { height: "{native-select.height.sm}" } } },
    md: { select: { base: { height: "{native-select.height.md}" } } },
  },
  variants: {},
});
