import { Anatomy } from "../components";
import { popupSurface, rem } from "./shared";

// A card that appears on hover over a link (a profile preview): Base UI calls it a preview card.
export const hoverCard = Anatomy.parse({
  name: "hover-card",
  parts: ["popup"],
  states: [],
  axes: {},
  tokens: {
    padding: { $type: "dimension", $value: "{space.5}" },
    radius: { $type: "dimension", $value: "{radius.lg}" },
    width: { $type: "dimension", $value: rem(256) },
  },
  base: {
    popup: { base: { ...popupSurface, radius: "{hover-card.radius}", padding: "{hover-card.padding}", width: "{hover-card.width}" } },
  },
  sizes: {},
  variants: {},
});
