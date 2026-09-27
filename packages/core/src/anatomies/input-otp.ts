import { Anatomy } from "../components";
import { rem } from "./shared";

// One-time code input (the input-otp package, on every library, as in shadcn). Slots in a group
// join into one field; the active slot shows the focus ring and a blinking caret.
export const inputOtp = Anatomy.parse({
  name: "input-otp",
  parts: ["root", "group", "slot", "caret", "separator"],
  states: ["focus-visible", "invalid", "disabled"],
  axes: {},
  tokens: {
    "slot-size": { $type: "dimension", $value: "{control.height.md}" },
    radius: { $type: "dimension", $value: "{control.radius}" },
    "font-size": { $type: "dimension", $value: "{control.font-size}" },
    gap: { $type: "dimension", $value: "{space.3}" },
    "caret-height": { $type: "dimension", $value: rem(16) },
  },
  base: {
    root: { base: { gap: "{input-otp.gap}" }, states: { disabled: { opacity: "{opacity.disabled}" } } },
    group: {},
    slot: {
      base: {
        background: "{intent.neutral.background}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        size: "{input-otp.slot-size}",
        fontSize: "{input-otp.font-size}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        "focus-visible": { border: "{intent.primary.border-strong}", ring: "{intent.primary.focus-ring}", ringWidth: "{focus.width}" },
        invalid: { border: "{intent.danger.border-strong}" },
      },
    },
    caret: { base: { background: "{intent.neutral.text-strong}", height: "{input-otp.caret-height}", animation: "pulse" } },
    separator: { base: { foreground: "{intent.neutral.text}" } },
  },
  sizes: {},
  variants: {},
});
