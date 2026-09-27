import { Anatomy } from "../components";
import { focusRing, rem } from "./shared";

// A file in a message or composer: its icon or picture, name, size, and actions (remove, open).
export const attachment = Anatomy.parse({
  name: "attachment",
  parts: ["root", "media", "title", "description", "error", "group"],
  states: ["hover", "focus-visible"],
  axes: {
    size: { enabled: ["xs", "sm", "md"], default: "md" },
  },
  tokens: {
    "media-size": {
      xs: { $type: "dimension", $value: rem(28) },
      sm: { $type: "dimension", $value: rem(32) },
      md: { $type: "dimension", $value: rem(40) },
    },
  },
  base: {
    root: {
      base: { background: "{surface.card}", foreground: "{intent.neutral.text-strong}", border: "{intent.neutral.border}", borderWidth: "{border.width}", radius: "{radius.xl}" },
      // Hover applies when the attachment holds a link or button.
      states: { hover: { background: "{intent.neutral.subtle}" }, "focus-visible": focusRing("{intent.primary.focus-ring}") },
    },
    media: { base: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text-strong}", radius: "{radius.lg}" } },
    title: { base: { fontWeight: "{font.weight.medium}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}" } },
    // How a failed upload shows.
    error: { base: { foreground: "{intent.danger.text}", border: "{intent.danger.border}", background: "{intent.danger.subtle}" } },
    group: { base: { gap: "{space.4}" } },
  },
  sizes: {
    xs: { root: { base: { gap: "{space.2}", fontSize: "{font.size.1}", radius: "{radius.lg}" } }, media: { base: { size: "{attachment.media-size.xs}" } } },
    sm: { root: { base: { gap: "{space.3}", fontSize: "{font.size.1}" } }, media: { base: { size: "{attachment.media-size.sm}" } } },
    md: { root: { base: { gap: "{space.3}", fontSize: "{font.size.2}" } }, media: { base: { size: "{attachment.media-size.md}" } } },
  },
  variants: {},
});
