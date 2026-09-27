import { Anatomy } from "../components";
import { focusRing, rem } from "./shared";

// A panel that slides in from an edge. Which edge is a prop (side), handled by the template;
// the recipe styles the panel wherever it comes from.
export const sheet = Anatomy.parse({
  name: "sheet",
  parts: ["backdrop", "popup", "header", "footer", "title", "description", "close"],
  states: ["hover", "focus-visible"],
  axes: {},
  tokens: {
    padding: { $type: "dimension", $value: "{space.6}" },
    gap: { $type: "dimension", $value: "{space.5}" },
    width: { $type: "dimension", $value: rem(384) },
    "max-height": { $type: "dimension", $value: rem(480) },
  },
  base: {
    backdrop: { base: { background: "{surface.backdrop}", duration: "{motion.duration.base}", easing: "{motion.easing.standard}" } },
    popup: {
      base: {
        background: "{surface.overlay}",
        foreground: "{intent.neutral.text-strong}",
        shadow: "{shadow.lg}",
        gap: "{sheet.gap}",
        duration: "{motion.duration.slow}",
        easing: "{motion.easing.enter}",
      },
    },
    header: { base: { gap: "{space.2}", padding: "{sheet.padding}" } },
    footer: { base: { gap: "{space.3}", padding: "{sheet.padding}" } },
    title: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.3}", fontWeight: "{font.weight.semibold}" } },
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
