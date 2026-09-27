import { Anatomy } from "../components";
import { focusRing, rem } from "./shared";

// A scrolling region with a slim, styled scrollbar (React Aria: the browser's own, colored).
export const scrollArea = Anatomy.parse({
  name: "scroll-area",
  parts: ["viewport", "scrollbar", "thumb"],
  states: ["focus-visible"],
  axes: {},
  tokens: {
    "scrollbar-size": { $type: "dimension", $value: rem(10) },
  },
  base: {
    viewport: { base: { radius: "{radius.md}" }, states: { "focus-visible": focusRing("{intent.primary.focus-ring}") } },
    scrollbar: { base: { width: "{scroll-area.scrollbar-size}", padding: "{border.width}" } },
    thumb: { base: { background: "{intent.neutral.border}", radius: "{radius.full}" } },
  },
  sizes: {},
  variants: {},
});
