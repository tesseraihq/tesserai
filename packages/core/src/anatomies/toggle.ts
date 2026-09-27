import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

// shadcn's `default` toggle is transparent until pressed: here that is the ghost variant, and the
// generated component accepts `default` as its alias.
export const toggle = Anatomy.parse({
  name: "toggle",
  parts: ["root", "icon"],
  states: ["hover", "focus-visible", "disabled", "selected", "invalid"],
  axes: {
    variant: { enabled: ["ghost", "outline"], default: "ghost" },
    size: { enabled: ["sm", "md", "lg"], default: "md" },
  },
  tokens: {
    height: {
      sm: { $type: "dimension", $value: rem(32) },
      md: { $type: "dimension", $value: rem(36) },
      lg: { $type: "dimension", $value: rem(40) },
    },
    "padding-x": { $type: "dimension", $value: "{space.3}" },
    gap: { $type: "dimension", $value: "{space.2}" },
    radius: { $type: "dimension", $value: "{radius.md}" },
    "font-size": { $type: "dimension", $value: "{font.size.2}" },
    "font-weight": { $type: "fontWeight", $value: "{font.weight.medium}" },
    "icon-size": { $type: "dimension", $value: rem(16) },
  },
  base: {
    root: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        radius: "{toggle.radius}",
        paddingX: "{toggle.padding-x}",
        gap: "{toggle.gap}",
        fontSize: "{toggle.font-size}",
        fontWeight: "{toggle.font-weight}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
        cursor: "pointer",
      },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        selected: { background: "{intent.neutral.subtle-hover}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        invalid: { border: "{intent.danger.border-strong}" },
        disabled,
      },
    },
    icon: { base: { size: "{toggle.icon-size}" } },
  },
  sizes: {
    sm: { root: { base: { height: "{toggle.height.sm}", minWidth: "{toggle.height.sm}" } } },
    md: { root: { base: { height: "{toggle.height.md}", minWidth: "{toggle.height.md}" } } },
    lg: { root: { base: { height: "{toggle.height.lg}", minWidth: "{toggle.height.lg}" } } },
  },
  variants: {
    ghost: {},
    outline: { root: { base: { border: "{intent.neutral.border}", borderWidth: "{border.width}" } } },
  },
});
