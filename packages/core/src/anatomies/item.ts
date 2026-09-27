import { Anatomy } from "../components";
import { focusRing } from "./shared";

// A row of content: media, a title and description, and actions. Lists, settings rows, results.
export const item = Anatomy.parse({
  name: "item",
  parts: ["root", "media", "content", "title", "description", "actions", "separator", "group"],
  // Hover applies only when the item is a link.
  states: ["hover", "focus-visible"],
  axes: {
    variant: { enabled: ["plain", "outline", "muted"], default: "plain" },
    size: { enabled: ["xs", "sm", "md"], default: "md" },
  },
  tokens: {
    "padding-x": {
      xs: { $type: "dimension", $value: "{space.3}" },
      sm: { $type: "dimension", $value: "{space.4}" },
      md: { $type: "dimension", $value: "{space.5}" },
    },
    "padding-y": {
      xs: { $type: "dimension", $value: "{space.3}" },
      sm: { $type: "dimension", $value: "{space.4}" },
      md: { $type: "dimension", $value: "{space.4}" },
    },
  },
  base: {
    root: {
      base: { radius: "{radius.md}", borderWidth: "{border.width}", fontSize: "{font.size.2}", duration: "{motion.duration.fast}", easing: "{motion.easing.standard}" },
      states: { hover: { background: "{intent.neutral.subtle}" }, "focus-visible": focusRing("{intent.primary.focus-ring}") },
    },
    media: { base: { gap: "{space.3}" } },
    content: { base: { gap: "{space.2}" } },
    title: { base: { fontWeight: "{font.weight.medium}", gap: "{space.3}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
    actions: { base: { gap: "{space.3}" } },
    separator: { base: { background: "{intent.neutral.border}", height: "{border.width}" } },
    group: { base: { gap: "{space.4}" } },
  },
  sizes: {
    xs: { root: { base: { paddingX: "{item.padding-x.xs}", paddingY: "{item.padding-y.xs}", gap: "{space.3}" } } },
    sm: { root: { base: { paddingX: "{item.padding-x.sm}", paddingY: "{item.padding-y.sm}", gap: "{space.4}" } } },
    md: { root: { base: { paddingX: "{item.padding-x.md}", paddingY: "{item.padding-y.md}", gap: "{space.5}" } } },
  },
  variants: {
    plain: { root: { base: { border: "{surface.page}" } } },
    outline: { root: { base: { border: "{intent.neutral.border}" } } },
    muted: { root: { base: { background: "{intent.neutral.subtle}", border: "{intent.neutral.subtle}" } } },
  },
});
