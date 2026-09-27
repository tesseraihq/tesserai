import { Anatomy } from "../components";
import { rem } from "./shared";

// A panel that slides in from an edge and can be swiped away (Base UI's Drawer, or Vaul on Radix).
// The edge it comes from is a prop; the recipe styles the panel, and the template rounds and
// borders only the edge that faces the page.
export const drawer = Anatomy.parse({
  name: "drawer",
  parts: ["backdrop", "popup", "handle", "header", "footer", "title", "description"],
  states: [],
  axes: {},
  tokens: {
    radius: { $type: "dimension", $value: "{radius.xl}" },
    padding: { $type: "dimension", $value: "{space.5}" },
    gap: { $type: "dimension", $value: "{space.2}" },
    "handle-width": { $type: "dimension", $value: rem(100) },
    "handle-height": { $type: "dimension", $value: rem(6) },
  },
  base: {
    backdrop: { base: { background: "{surface.backdrop}" } },
    popup: { base: { background: "{surface.overlay}", foreground: "{intent.neutral.text-strong}", border: "{intent.neutral.border}", fontSize: "{font.size.2}" } },
    handle: { base: { background: "{intent.neutral.subtle-hover}", radius: "{radius.full}", width: "{drawer.handle-width}", height: "{drawer.handle-height}" } },
    header: { base: { gap: "{drawer.gap}", padding: "{drawer.padding}" } },
    footer: { base: { gap: "{drawer.gap}", padding: "{drawer.padding}" } },
    title: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.3}", fontWeight: "{font.weight.semibold}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
  },
  sizes: {},
  variants: {},
});
