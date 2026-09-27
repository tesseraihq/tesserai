import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

// The group draws the field (border, background, focus ring); the control inside is bare. Addons
// hold icons, text or small buttons at either end or above and below.
export const inputGroup = Anatomy.parse({
  name: "input-group",
  parts: ["root", "control", "placeholder", "addon", "button"],
  states: ["hover", "focus-visible", "disabled", "invalid"],
  axes: {},
  tokens: {
    height: { $type: "dimension", $value: "{control.height.md}" },
    radius: { $type: "dimension", $value: "{control.radius}" },
    "padding-x": { $type: "dimension", $value: "{control.padding-x}" },
    "font-size": { $type: "dimension", $value: "{control.font-size}" },
    "addon-gap": { $type: "dimension", $value: "{space.3}" },
    "addon-padding-x": { $type: "dimension", $value: "{space.3}" },
    button: {
      xs: { $type: "dimension", $value: rem(24) },
      sm: { $type: "dimension", $value: rem(32) },
      radius: { $type: "dimension", $value: "{radius.sm}" },
      "padding-x": { $type: "dimension", $value: "{space.2}" },
    },
  },
  base: {
    root: {
      base: {
        background: "{intent.neutral.background}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{input-group.radius}",
        minHeight: "{input-group.height}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        hover: { border: "{intent.neutral.text}" },
        "focus-visible": { ...focusRing("{intent.primary.focus-ring}"), border: "{intent.primary.border-strong}" },
        invalid: { border: "{intent.danger.border-strong}", ring: "{intent.danger.focus-ring}" },
        disabled,
      },
    },
    control: { base: { foreground: "{intent.neutral.text-strong}", paddingX: "{input-group.padding-x}", fontSize: "{input-group.font-size}" } },
    placeholder: { base: { foreground: "{intent.neutral.text}" } },
    addon: {
      base: {
        foreground: "{intent.neutral.text}",
        gap: "{input-group.addon-gap}",
        paddingX: "{input-group.addon-padding-x}",
        fontSize: "{input-group.font-size}",
        fontWeight: "{font.weight.medium}",
      },
    },
    button: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        radius: "{input-group.button.radius}",
        paddingX: "{input-group.button.padding-x}",
        fontSize: "{input-group.font-size}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
        cursor: "pointer",
      },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        disabled,
      },
    },
  },
  sizes: {},
  variants: {},
});
