import { Anatomy } from "../components";
import { ALL_INTENTS, focusRing, rem } from "./shared";

export const badge = Anatomy.parse({
  name: "badge",
  parts: ["root"],
  // Hover applies only when the badge is rendered as a link.
  states: ["hover", "focus-visible"],
  axes: {
    variant: { enabled: ["solid", "soft", "outline", "ghost", "link"], default: "soft" },
    intent: { enabled: ALL_INTENTS, default: "neutral" },
    size: { enabled: ["sm", "md"], default: "md" },
  },
  tokens: {
    height: {
      sm: { $type: "dimension", $value: rem(20) },
      md: { $type: "dimension", $value: rem(24) },
    },
    "padding-x": {
      sm: { $type: "dimension", $value: "{space.3}" },
      md: { $type: "dimension", $value: "{space.4}" },
    },
    "font-size": {
      sm: { $type: "dimension", $value: "{font.size.1}" },
      md: { $type: "dimension", $value: "{font.size.2}" },
    },
    radius: { $type: "dimension", $value: "{radius.full}" },
    "font-weight": { $type: "fontWeight", $value: "{font.weight.medium}" },
  },
  base: {
    root: {
      base: { radius: "{badge.radius}", fontWeight: "{badge.font-weight}" },
      states: { "focus-visible": focusRing("{intent.*.focus-ring}") },
    },
  },
  sizes: {
    sm: { root: { base: { height: "{badge.height.sm}", paddingX: "{badge.padding-x.sm}", fontSize: "{badge.font-size.sm}" } } },
    md: { root: { base: { height: "{badge.height.md}", paddingX: "{badge.padding-x.md}", fontSize: "{badge.font-size.md}" } } },
  },
  variants: {
    solid: {
      root: { base: { background: "{intent.*.solid}", foreground: "{intent.*.solid-foreground}" }, states: { hover: { background: "{intent.*.solid-hover}" } } },
    },
    soft: {
      root: { base: { background: "{intent.*.subtle}", foreground: "{intent.*.subtle-foreground}" }, states: { hover: { background: "{intent.*.subtle-hover}" } } },
    },
    outline: {
      root: {
        base: { border: "{intent.*.border-strong}", borderWidth: "{border.width}", foreground: "{intent.*.text}" },
        states: { hover: { background: "{intent.*.subtle}" } },
      },
    },
    ghost: { root: { base: { foreground: "{intent.*.text}" }, states: { hover: { background: "{intent.*.subtle}" } } } },
    link: { root: { base: { foreground: "{intent.*.text}" }, states: { hover: { textDecoration: "underline" } } } },
  },
});
