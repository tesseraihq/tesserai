import { Anatomy } from "../components";
import { rem } from "./shared";

// A dialog that interrupts to confirm something; its actions are Buttons (Alert Dialog requires
// Button), so they look like every other button in the system.
export const alertDialog = Anatomy.parse({
  name: "alert-dialog",
  parts: ["backdrop", "popup", "header", "footer", "title", "description", "media"],
  states: [],
  axes: {
    size: { enabled: ["sm", "md"], default: "md" },
  },
  tokens: {
    padding: { $type: "dimension", $value: "{space.6}" },
    gap: { $type: "dimension", $value: "{space.5}" },
    radius: { $type: "dimension", $value: "{radius.xl}" },
    "max-width": {
      sm: { $type: "dimension", $value: rem(320) },
      md: { $type: "dimension", $value: rem(448) },
    },
    "media-size": { $type: "dimension", $value: rem(40) },
  },
  base: {
    backdrop: { base: { background: "{surface.backdrop}", duration: "{motion.duration.base}", easing: "{motion.easing.standard}" } },
    popup: {
      base: {
        background: "{surface.overlay}",
        foreground: "{intent.neutral.text-strong}",
        radius: "{alert-dialog.radius}",
        shadow: "{shadow.lg}",
        padding: "{alert-dialog.padding}",
        gap: "{alert-dialog.gap}",
        duration: "{motion.duration.base}",
        easing: "{motion.easing.enter}",
      },
    },
    header: { base: { gap: "{space.2}" } },
    footer: { base: { gap: "{space.3}" } },
    title: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.4}", fontWeight: "{font.weight.semibold}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
    media: {
      base: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text-strong}", radius: "{radius.md}", size: "{alert-dialog.media-size}" },
    },
  },
  sizes: {
    sm: { popup: { base: { maxWidth: "{alert-dialog.max-width.sm}" } } },
    md: { popup: { base: { maxWidth: "{alert-dialog.max-width.md}" } } },
  },
  variants: {},
});
