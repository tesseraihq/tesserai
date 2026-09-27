import { Anatomy } from "../components";
import { px, rem } from "./shared";

// A person's picture, or their initials when there is none.
export const avatar = Anatomy.parse({
  name: "avatar",
  parts: ["root", "frame", "image", "fallback", "badge", "group-count"],
  states: [],
  axes: {
    size: { enabled: ["sm", "md", "lg"], default: "md" },
  },
  tokens: {
    size: {
      sm: { $type: "dimension", $value: rem(24) },
      md: { $type: "dimension", $value: rem(32) },
      lg: { $type: "dimension", $value: rem(40) },
    },
    radius: { $type: "dimension", $value: "{radius.full}" },
    "ring-width": { $type: "dimension", $value: px(2) },
  },
  base: {
    root: { base: { radius: "{avatar.radius}" } },
    // A hairline over the picture so light photos keep an edge.
    frame: { base: { border: "{intent.neutral.border}", borderWidth: "{border.width}", radius: "{avatar.radius}" } },
    image: { base: { radius: "{avatar.radius}" } },
    fallback: { base: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text}", radius: "{avatar.radius}", fontSize: "{font.size.2}" } },
    badge: {
      base: { background: "{intent.primary.solid}", foreground: "{intent.primary.solid-foreground}", ring: "{surface.page}", ringWidth: "{avatar.ring-width}", radius: "{radius.full}" },
    },
    "group-count": {
      base: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text}", radius: "{avatar.radius}", fontSize: "{font.size.2}", ring: "{surface.page}", ringWidth: "{avatar.ring-width}" },
    },
  },
  sizes: {
    sm: { root: { base: { size: "{avatar.size.sm}" } }, fallback: { base: { fontSize: "{font.size.1}" } } },
    md: { root: { base: { size: "{avatar.size.md}" } } },
    lg: { root: { base: { size: "{avatar.size.lg}" } } },
  },
  variants: {},
});
