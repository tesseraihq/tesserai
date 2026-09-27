import { Anatomy } from "../components";

// Slides that scroll by swipe, arrows or arrow keys (Embla). The arrows are the system's buttons.
export const carousel = Anatomy.parse({
  name: "carousel",
  parts: ["control"],
  states: [],
  axes: {},
  tokens: { gap: { $type: "dimension", $value: "{space.5}" } },
  base: { control: { base: { radius: "{radius.full}" } } },
  sizes: {},
  variants: {},
});
