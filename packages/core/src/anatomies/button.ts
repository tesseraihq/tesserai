import { Anatomy } from "../components";
import { ALL_INTENTS, disabled, focusRing, rem } from "./shared";

export const button = Anatomy.parse({
  name: "button",
  parts: ["root", "label", "icon"],
  states: ["hover", "focus-visible", "pressed", "disabled", "loading"],
  axes: {
    variant: { enabled: ["solid", "soft", "outline", "ghost", "link"], default: "solid" },
    intent: { enabled: ALL_INTENTS, default: "primary" },
    size: { enabled: ["xs", "sm", "md", "lg"], default: "md" },
  },
  tokens: {
    height: {
      xs: { $type: "dimension", $value: rem(24) },
      sm: { $type: "dimension", $value: rem(32) },
      md: { $type: "dimension", $value: rem(36) },
      lg: { $type: "dimension", $value: rem(40) },
    },
    "padding-x": {
      xs: { $type: "dimension", $value: "{space.3}" },
      sm: { $type: "dimension", $value: "{space.4}" },
      md: { $type: "dimension", $value: "{space.5}" },
      lg: { $type: "dimension", $value: "{space.6}" },
    },
    "icon-size": {
      xs: { $type: "dimension", $value: rem(12) },
      sm: { $type: "dimension", $value: rem(16) },
      md: { $type: "dimension", $value: rem(16) },
      lg: { $type: "dimension", $value: rem(20) },
    },
    "font-size": {
      xs: { $type: "dimension", $value: "{font.size.1}" },
      sm: { $type: "dimension", $value: "{font.size.2}" },
      md: { $type: "dimension", $value: "{font.size.2}" },
      lg: { $type: "dimension", $value: "{font.size.3}" },
    },
    gap: { $type: "dimension", $value: "{space.3}" },
    radius: { $type: "dimension", $value: "{radius.md}" },
    "font-weight": { $type: "fontWeight", $value: "{font.weight.medium}" },
  },
  base: {
    root: {
      base: {
        radius: "{button.radius}",
        fontWeight: "{button.font-weight}",
        gap: "{button.gap}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
        cursor: "pointer",
      },
      states: {
        "focus-visible": focusRing("{intent.*.focus-ring}"),
        disabled,
      },
    },
  },
  sizes: {
    xs: {
      root: { base: { height: "{button.height.xs}", paddingX: "{button.padding-x.xs}", fontSize: "{button.font-size.xs}" } },
      icon: { base: { size: "{button.icon-size.xs}" } },
    },
    sm: {
      root: { base: { height: "{button.height.sm}", paddingX: "{button.padding-x.sm}", fontSize: "{button.font-size.sm}" } },
      icon: { base: { size: "{button.icon-size.sm}" } },
    },
    md: {
      root: { base: { height: "{button.height.md}", paddingX: "{button.padding-x.md}", fontSize: "{button.font-size.md}" } },
      icon: { base: { size: "{button.icon-size.md}" } },
    },
    lg: {
      root: { base: { height: "{button.height.lg}", paddingX: "{button.padding-x.lg}", fontSize: "{button.font-size.lg}" } },
      icon: { base: { size: "{button.icon-size.lg}" } },
    },
  },
  variants: {
    solid: {
      root: {
        base: { background: "{intent.*.solid}", foreground: "{intent.*.solid-foreground}" },
        states: { hover: { background: "{intent.*.solid-hover}" } },
      },
    },
    soft: {
      root: {
        base: { background: "{intent.*.subtle}", foreground: "{intent.*.subtle-foreground}" },
        states: { hover: { background: "{intent.*.subtle-hover}" } },
      },
    },
    outline: {
      root: {
        base: { border: "{intent.*.border-strong}", borderWidth: "{border.width}", foreground: "{intent.*.text}" },
        states: { hover: { background: "{intent.*.subtle}" } },
      },
    },
    ghost: {
      root: {
        base: { foreground: "{intent.*.text}" },
        states: { hover: { background: "{intent.*.subtle}" } },
      },
    },
    link: {
      root: {
        base: { foreground: "{intent.*.text}", textDecoration: "none" },
        states: { hover: { textDecoration: "underline" } },
      },
    },
  },
});
