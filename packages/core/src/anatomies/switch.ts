import { Anatomy } from "../components";
import { disabled, focusRing, px, rem } from "./shared";

// The thumb is inset from the track by `inset` (inside the border) and travels width − thumb − 2 × (inset + border)
// when on; the template computes that from these tokens, so resizing never needs new code.
export const switchAnatomy = Anatomy.parse({
  name: "switch",
  parts: ["root", "thumb"],
  states: ["hover", "focus-visible", "disabled", "selected", "invalid"],
  axes: {
    size: { enabled: ["sm", "md"], default: "md" },
  },
  tokens: {
    width: {
      sm: { $type: "dimension", $value: rem(28) },
      md: { $type: "dimension", $value: rem(36) },
    },
    height: {
      sm: { $type: "dimension", $value: rem(16) },
      md: { $type: "dimension", $value: rem(20) },
    },
    "thumb-size": {
      sm: { $type: "dimension", $value: rem(12) },
      md: { $type: "dimension", $value: rem(16) },
    },
    inset: { $type: "dimension", $value: px(2) },
    radius: { $type: "dimension", $value: "{radius.full}" },
  },
  base: {
    root: {
      base: {
        // The off track identifies the control, so it uses the strong border step (3:1 on the page).
        background: "{intent.neutral.border-strong}",
        // The border carries 3:1 when a light brand fills the track (as the checkbox's does).
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{switch.radius}",
        paddingX: "{switch.inset}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
        cursor: "pointer",
      },
      states: {
        hover: { background: "{intent.neutral.text}", border: "{intent.neutral.text}" },
        selected: { background: "{intent.primary.solid}", border: "{intent.primary.border-strong}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        invalid: { ring: "{intent.danger.focus-ring}", ringWidth: "{focus.width}" },
        disabled,
      },
    },
    thumb: {
      base: {
        background: "{intent.neutral.background}",
        radius: "{switch.radius}",
        shadow: "{shadow.sm}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
    },
  },
  sizes: {
    sm: { root: { base: { width: "{switch.width.sm}", height: "{switch.height.sm}" } }, thumb: { base: { size: "{switch.thumb-size.sm}" } } },
    md: { root: { base: { width: "{switch.width.md}", height: "{switch.height.md}" } }, thumb: { base: { size: "{switch.thumb-size.md}" } } },
  },
  variants: {},
});
