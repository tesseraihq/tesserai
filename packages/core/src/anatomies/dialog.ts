import { Anatomy } from "../components";
import { focusRing, rem } from "./shared";

export const dialog = Anatomy.parse({
  name: "dialog",
  parts: ["backdrop", "popup", "title", "description", "close"],
  states: [],
  axes: {},
  tokens: {
    padding: { $type: "dimension", $value: "{space.6}" },
    gap: { $type: "dimension", $value: "{space.4}" },
    radius: { $type: "dimension", $value: "{radius.xl}" },
    "max-width": { $type: "dimension", $value: rem(512) },
  },
  base: {
    backdrop: {
      base: { background: "{surface.backdrop}", duration: "{motion.duration.base}", easing: "{motion.easing.standard}" },
    },
    popup: {
      base: {
        background: "{surface.overlay}",
        foreground: "{intent.neutral.text-strong}",
        radius: "{dialog.radius}",
        shadow: "{shadow.lg}",
        padding: "{dialog.padding}",
        gap: "{dialog.gap}",
        maxWidth: "{dialog.max-width}",
        duration: "{motion.duration.base}",
        easing: "{motion.easing.enter}",
      },
    },
    title: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.4}", fontWeight: "{font.weight.semibold}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
    close: {
      base: { foreground: "{intent.neutral.text}", radius: "{radius.sm}" },
      states: {
        hover: { foreground: "{intent.neutral.text-strong}", background: "{intent.neutral.subtle}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
      },
    },
  },
  sizes: {},
  variants: {},
});
