import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

// The track's thickness is its height when horizontal and its width when vertical, styled through
// the orientation states so one token serves both.
export const slider = Anatomy.parse({
  name: "slider",
  parts: ["root", "track", "range", "thumb"],
  states: ["hover", "focus-visible", "disabled", "dragging", "horizontal", "vertical"],
  axes: {},
  tokens: {
    "track-thickness": { $type: "dimension", $value: rem(6) },
    "thumb-size": { $type: "dimension", $value: rem(16) },
    // The thumb grows slightly under the pointer and while dragged.
    "thumb-active-scale": { $type: "number", $value: 1.15 },
    "vertical-min-height": { $type: "dimension", $value: rem(160) },
    radius: { $type: "dimension", $value: "{radius.full}" },
  },
  base: {
    root: {
      base: {},
      states: { disabled: { opacity: "{opacity.disabled}" }, vertical: { minHeight: "{slider.vertical-min-height}" } },
    },
    track: {
      base: { background: "{intent.neutral.subtle}", radius: "{slider.radius}" },
      states: { horizontal: { height: "{slider.track-thickness}" }, vertical: { width: "{slider.track-thickness}" } },
    },
    range: { base: { background: "{intent.primary.solid}" } },
    thumb: {
      base: {
        background: "{intent.neutral.background}",
        // The strong border keeps the thumb at 3:1 on the page even for a light brand.
        border: "{intent.primary.border-strong}",
        borderWidth: "{border.width}",
        size: "{slider.thumb-size}",
        radius: "{slider.radius}",
        shadow: "{shadow.sm}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        hover: { scale: "{slider.thumb-active-scale}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        dragging: { scale: "{slider.thumb-active-scale}" },
        disabled,
      },
    },
  },
  sizes: {},
  variants: {},
});
