import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

export const checkbox = Anatomy.parse({
  name: "checkbox",
  parts: ["root", "indicator"],
  states: ["hover", "focus-visible", "disabled", "selected", "indeterminate", "invalid"],
  axes: {
    size: { enabled: ["sm", "md"], default: "md" },
  },
  tokens: {
    size: {
      sm: { $type: "dimension", $value: rem(16) },
      md: { $type: "dimension", $value: rem(20) },
    },
    radius: { $type: "dimension", $value: "{radius.sm}" },
  },
  base: {
    root: {
      base: {
        background: "{intent.neutral.background}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{checkbox.radius}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
        cursor: "pointer",
      },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        // A strong border keeps the checked box visible on the page even for a light brand.
        selected: { background: "{intent.primary.solid}", border: "{intent.primary.border-strong}" },
        // Some but not all chosen (a table's "select all"): filled like checked, with a dash.
        indeterminate: { background: "{intent.primary.solid}", border: "{intent.primary.border-strong}" },
        invalid: { border: "{intent.danger.border-strong}" },
        disabled,
      },
    },
    // The indicator only shows inside a selected root, so it sits on the solid fill.
    indicator: { base: { background: "{intent.primary.solid}", foreground: "{intent.primary.solid-foreground}" } },
  },
  sizes: {
    sm: { root: { base: { size: "{checkbox.size.sm}" } } },
    md: { root: { base: { size: "{checkbox.size.md}" } } },
  },
  variants: {},
});
